import { ProcessOutput, $ as zx, type Duration } from 'zx';
import type { AutogradingReport, RunLog, TestCase, TestRun, TestSuite, Timeout } from './types.ts';

const $: typeof zx = zx({
    env: {
        ...process.env,
        NO_COLOR: 'true',
        CI: 'true'
    },
    quiet: true
});


export async function runSuite(suite: TestSuite): Promise<AutogradingReport> {
    const report: AutogradingReport = {
        suite,
        results: suite.tests.map(test => ({
            testCase: test,
            logs: [],
            status: "pending"
        }))
    };

    console.log(`# Running test suite: ${suite.name}\n\n${suite.description}\n`);

    for (const test of report.results) {
        await runTest(test, suite);

        if (test.status === "failed" && test.testCase.skipRemainingOnFailure) {
            console.log(`Skipping remaining tests due to failure in "${test.testCase.name}".\n`);
            report.results.filter(t => t.status === "pending").forEach(t => { t.status = "skipped"; });
            break;
        }
    }

    return report;
}


async function runTest(testRun: TestRun, suite: TestSuite) {
    console.log(`\n## Running test: ${testRun.testCase.name}\n`);

    const { testCase } = testRun;
    const timeout = testCase.timeout ?? suite.defaultTimeout;

    const setupLogs = await runCommands(toArray(testCase.$setup), { timeout, input: "" });
    const setupOk = setupLogs.every(log => log.ok);

    if (!setupOk) {
        testRun.logs.push(...setupLogs);
        testRun.status = "failed";
    }

    if (setupOk) {
        const options = { timeout, input: testCase.input ?? "" };

        const logs = await runCommands(toArray(testCase.$run), options);
        testRun.logs.push(...logs);

        const validation = validateTestOutput(testCase, testRun.logs);

        if (validation.success) {
            testRun.status = "passed";
        } else {
            testRun.error = validation.error;
            testRun.status = "failed";
        }
    }

    await runCommands(toArray(testCase.$teardown), { timeout, input: "" });

    if (testRun.status !== "passed") {
        console.error(`\n❌  Failed: ${testRun.error}\n`);
    }
}


async function runCommands(commands: string[], options: { timeout: Timeout, input?: string }): Promise<RunLog[]> {
    const { timeout, input = "" } = options;
    const logs: RunLog[] = [];

    for (const cmd of commands) {
        console.log(`$ ${cmd}`);

        const { stdout, stderr, ok } = await executeShell(cmd, input ?? "", timeout);

        logs.push({ command: cmd, ok, stdout, stderr, input });

        stdout && console.log(stdout.trim());
        stderr && console.error(stderr.trim());
        console.log();

        // skip the remaining commands if one fails
        if (!ok) {
            break;
        }
    }

    return logs;
}


async function executeShell(cmd: string, input: string, timeout: Duration): Promise<ProcessOutput> {
    try {
        return await $({ timeout, input })`bash -c ${cmd}`;
    } catch (error) {
        return error as ProcessOutput;
    }
}

/**
 * Validates that the output of a test case meets the expected conditions defined in the test case.
 */
function validateTestOutput(testCase: TestCase, logs: RunLog[]): { success: false, error: string } | { success: true } {

    for (const log of logs) {
        if (!log.ok) {
            return {
                success: false,
                error: `Command failed: ${log.stderr || log.command}`
            };
        }
    }

    const output = logs.map(log => log.stdout).join('\n\n');

    for (const expected of toArray(testCase.contains)) {
        if (!output.includes(expected)) {
            return {
                success: false,
                error: `The output should contain "${expected}"`
            };
        }
    }

    for (const notExpected of toArray(testCase.notContains)) {
        if (output.includes(notExpected)) {
            return {
                success: false,
                error: `The output should not contain "${notExpected}"`
            };
        }
    }

    for (const regex of toArray(testCase.regex).map(pattern => new RegExp(pattern))) {
        if (!regex.test(output)) {
            return {
                success: false,
                error: `The output should match the regex: ${regex}`
            };
        }
    }

    return { success: true };
}


/**
 * Returns an array from the given value. If the value is already an array, it is returned as is.
 * If the value is a single item, it is wrapped in an array. If the value is undefined, an empty array is returned.
 */
function toArray<T>(value: NonNullable<T> | NonNullable<T>[] | undefined): NonNullable<T>[] {
    if (typeof value === 'undefined') {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
