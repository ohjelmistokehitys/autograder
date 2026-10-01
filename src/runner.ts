import { $ as zx } from 'zx';
import { AutogradingReport } from './reporter.ts';
import type { RunLog, TestCase, TestRun, TestSuite, Timeout } from './types.ts';

const DEFAULT_TIMEOUT: Timeout = "15s"; // Default timeout for shell commands if not specified

const $: typeof zx = zx({ env: { ...process.env, NO_COLOR: 'true', CI: 'true' }, quiet: true });

export class TestRunner {
    private suite: TestSuite;

    constructor(suite: TestSuite) {
        this.suite = suite;
    }

    async run(): Promise<AutogradingReport> {
        const results: TestRun[] = [];
        for (const test of this.suite.tests) {
            if (results.some(res => res.status === "failed" && res.test.skipRemainingOnFailure)) {
                const result: TestRun = { test, status: "skipped", logs: [] };
                results.push(result);
                this.log(result);
                continue;
            }

            const result = await this.runTest(test);
            this.log(result);
            results.push(result);
        }
        return new AutogradingReport(this.suite, results);
    }

    private async runTest(test: TestCase): Promise<TestRun> {
        const commands = [test.setup, test.run, test.teardown].flat().filter((c): c is string => !!c);
        const logs: RunLog[] = [];

        for (const command of commands) {
            const log = await this.execute(command, test);
            logs.push(log);
            if (!log.ok) {
                break; // Stop executing further commands if one fails
            }
        }

        const output = logs.map(log => log.output).join("\n").toLowerCase();

        const errors = [
            test.contains?.filter(expected => !output.includes(expected.toLowerCase())).map(expected => `The output should contain "${expected}"`) ?? [],
            test.notContains?.filter(expected => output.includes(expected.toLowerCase())).map(expected => `The output should not to contain "${expected}"`) ?? [],
            test.regex?.filter(pattern => !new RegExp(pattern).test(output)).map(pattern => `The output should match the regular expression "${pattern}"`) ?? []
        ].flat();

        return {
            test,
            logs,
            errors: errors.length > 0 ? errors : undefined,
            status: (errors.length === 0 && logs.every(log => log.ok)) ? "passed" : "failed"
        };
    }

    private async execute(cmd: string, test: TestCase): Promise<RunLog> {
        const timeout = test.timeout ?? DEFAULT_TIMEOUT;

        const { stdout, stderr, ok } = await $({ input: test.input, nothrow: true })`timeout --verbose ${timeout} bash -c ${cmd}`;

        return {
            cmd,
            ok,
            input: test.input,
            output: [stdout, stderr].filter(c => !!c).map(text => text.trim()).join("\n")
        };
    }

    private log(result: TestRun) {
        console.log(`# ${result.test.name}  [${result.status}]\n`);
        console.log(`${result.test.description}`);

        console.log(` `);

        result.logs.forEach(({ cmd, output, ok }) => {
            console.log(
                [`$ ${cmd}`, output, ok ? "[ok]" : "[error]"]
                    .filter(c => !!c)
                    .join("\n\n")
                    // add indentation to each line of the output for better readability
                    .split("\n").map(line => `  ${line}`).join("\n")
            );
            console.log(` `);
        });

        if (result.errors && result.errors.length > 0) {
            console.log("Failed checks:");
            result.errors.forEach(error => console.log(`  - ${error}`));
            console.log(` `);
        }

        console.log(`-`.repeat(80) + "\n");
    }
}
