import { $ as zx } from 'zx';
import { AutogradingReport } from './reporter.js';
const DEFAULT_TIMEOUT = "15s"; // Default timeout for shell commands if not specified
const $ = zx({ env: { ...process.env, NO_COLOR: 'true', CI: 'true' }, quiet: true });
export class TestRunner {
    suite;
    constructor(suite) {
        this.suite = suite;
    }
    async run() {
        const results = [];
        for (const test of this.suite.tests) {
            if (results.some(res => res.status === "failed" && res.test.skipRemainingOnFailure)) {
                const result = { test, status: "skipped", logs: [] };
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
    async runTest(test) {
        const commands = [test.setup, test.run, test.teardown].flat().filter((c) => !!c);
        const logs = [];
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
    async execute(cmd, test) {
        const timeout = test.timeout ?? DEFAULT_TIMEOUT;
        const { stdout, stderr, ok } = await $({ input: test.input, nothrow: true }) `timeout --verbose ${timeout} bash -c ${cmd}`;
        return {
            cmd,
            ok,
            input: test.input,
            output: [stdout, stderr].filter(c => !!c).map(text => text.trim()).join("\n")
        };
    }
    log(result) {
        const log = [
            `# ${result.test.name}  [${result.status}]`,
            ``,
            result.test.description,
            ``
        ];
        result.logs.forEach(({ cmd, output, ok }) => {
            log.push([`$ ${cmd}`, output, ok ? "[ok]" : "[error]"]
                .filter(c => !!c)
                .join("\n\n")
                // add indentation to each line of the output for better readability
                .split("\n").map(line => `  ${line}`).join("\n"));
            log.push(` `);
        });
        if (result.errors && result.errors.length > 0) {
            log.push("Failed checks:");
            log.push(...result.errors.map(error => `  - ${error}`));
            log.push(` `);
        }
        log.push(`-`.repeat(80) + "\n");
        console.log(log.map(line => line || " ").join("\n") // Ensure that empty lines are preserved in GitHub output
        );
    }
}
