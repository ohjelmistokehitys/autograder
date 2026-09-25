import { $ as zx } from 'zx';
import type { AutogradingReport, Commands, RunLog, TestCase, TestRun, TestSuite, Timeout } from '../types.ts';

const $: typeof zx = zx({
    env: {
        ...process.env,
        NO_COLOR: 'true',
        CI: 'true'
    },
    quiet: true
});


export function runSuite(suite: TestSuite): AutogradingReport {
    $.timeout = suite.defaultTimeout;

    const report: AutogradingReport = {
        suite,
        results: suite.tests.map(test => ({
            testCase: test,
            logs: [],
            status: "pending"
        }))
    };

    console.log(`# Running test suite: ${suite.name}\n\n${suite.description}\n`);

    try {
        for (const test of report.results) {
            runTest(test, suite);

            if (test.status === "failed" && test.testCase.skipRemainingOnFailure) {
                console.log(`Skipping remaining tests due to failure in "${test.testCase.name}".\n`);
                report.results.filter(t => t.status === "pending").forEach(t => { t.status = "skipped"; });
                break;
            }
        }


    } catch (error) {
        console.error("Error running test suite:", error);
        report.error = `Error running test suite: ${error}`;
    }

    return report;
}


function runTest(testRun: TestRun, suite: TestSuite) {
    console.log(`\n## Running test: ${testRun.testCase.name}\n`);

    const test = testRun.testCase;

    const setupLogs = run(toArray(test.$setup));
    const setupOk = setupLogs.every(log => log.ok);

    if (!setupOk) {
        testRun.logs.push(...setupLogs);
        testRun.status = "failed";
    }

    if (setupOk) {
        const options = { timeout: test.timeout ?? suite.defaultTimeout, input: test.input };
        const logs = run(test.$run, options);
        testRun.logs.push(...logs);

        const validation = validateTestOutput(test, testRun.logs);

        if (validation.success) {
            testRun.status = "passed";
        } else {
            testRun.error = validation.error;
            testRun.status = "failed";
        }
    }

    run(toArray(test.$teardown));

    if (testRun.status !== "passed") {
        console.error(`\n❌  Failed: ${testRun.error}\n`);
    }
}


function run(cmd: Commands, options?: { timeout?: Timeout, input?: string }): RunLog[] {
    const { timeout, input } = options || {};
    const logs: RunLog[] = [];

    for (const command of toArray(cmd)) {
        const { stdout, stderr, ok } = $({ timeout, input, sync: true, noThrow: true })`bash -c ${cmd}`;
        logs.push({ command, ok, stdout, stderr, input });

        const out = ok ? console.log : console.error;
        out(['```', `$ ${command}`, stdout, stderr, '```'].filter(s => s).map(s => s.trim()).join('\n'));

        // skip the remaining commands if one fails
        if (!ok) {
            break;
        }
    }

    return logs;
}


/**
 * Validates that the output of a test case meets the expected conditions defined in the test case.
 */
function validateTestOutput(testCase: TestCase, logs: RunLog[]): { success: false, error: string } | { success: true } {

    for (const log of logs) {
        if (!log.ok) {
            return {
                success: false,
                error: `Command failed: ${log.stderr}`
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
