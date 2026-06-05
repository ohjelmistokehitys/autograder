import { expect, test } from 'vitest';
import { ProcessOutput, $ as zx } from 'zx';
import { AutogradingTests, VitestReport } from './types';


/**
 * Runs the given test suite using Vitest's test runner.
*/
export function runSuite(testSuite: AutogradingTests.TestSuite): void {
    const $: typeof zx = zx({
        // pass all environment variables to the commands being executed
        env: process.env,

        // change the working directory to the suite's cwd if specified
        cwd: testSuite.cwd ?? process.cwd(),
    });

    toArray(testSuite.beforeAll).forEach(runnable => {
        test.beforeAll(async () => {
            await run(runnable);
        });
    });

    toArray(testSuite.beforeEach).forEach(runnable => {
        test.beforeEach(async () => {
            await run(runnable);
        });
    });

    toArray(testSuite.afterAll).forEach(runnable => {
        test.afterAll(async () => {
            await run(runnable);
        });
    });

    toArray(testSuite.afterEach).forEach(runnable => {
        test.afterEach(async () => {
            await run(runnable);
        });
    });


    testSuite.tests.forEach(testCase => {
        test(testCase.name, async ({ task: { meta } }) => {
            meta.maxPoints = testCase.points ?? testSuite.defaults.points;
            meta.description = testCase.description;
            meta.points = 0;

            const logs = meta.logs = [];
            let output = "";

            if (testCase.$setup) {
                const p = await runCmd(testCase.$setup, logs);
                output += p.toString();
            }

            for (const cmd of toArray(testCase.$run)) {
                const p = await runCmd(cmd, logs);
                output += p.toString();
            }

            await assertOutput(testCase, output);

            // test passed if we reached this point
            meta.points = meta.maxPoints;

        }, timeout(testCase, testSuite));
    });

    /**
     * Runs the given runnable, which can be either a shell command or a function. If the runnable
     * is a shell command, it is executed using zx. If it is a function, it is called directly.
     *
     * @param runnable
     */
    async function run(runnable: AutogradingTests.Runnable): Promise<unknown> {
        if (typeof runnable === 'function') {
            return await runnable();
        }

        for (const cmd of toArray(runnable.$run)) {
            await runCmd(cmd);
        }
    }

    /**
     * Asserts that the output of a test case meets the expected conditions defined in the test case.
     */
    async function assertOutput(testCase: AutogradingTests.TestCase, output: string) {
        if ('contains' in testCase) {
            const expectedOutputs = toArray(testCase.contains);
            expectedOutputs.forEach(expected => {
                expect(output).toContain(expected);
            });
        }

        if ('notContains' in testCase) {
            const notExpectedOutputs = toArray(testCase.notContains);
            notExpectedOutputs.forEach(notExpected => {
                expect(output).not.toContain(notExpected);
            });
        }

        // Run the specified command and compare its output to the test output.
        if ('$compareRun' in testCase) {
            const compareRun = await runCmd(testCase.$compareRun);
            const compareOutput = compareRun.toString().trim();

            expect(output).toContain(compareOutput);
        }
    }

    /**
     * Runs the given command using zx and bash. Returns the output of the command.
     *
     * If logs are provided, the command, its output, and any errors are logged to the logs array.
     *
     * Errors are re-thrown after logging, so that they can be handled by the caller (to mark a test as failed).
     */
    async function runCmd(cmd: string, logs?: VitestReport.RunLog[]): Promise<ProcessOutput> {
        const entry: VitestReport.RunLog = {
            command: cmd,
            ok: true
        };

        try {
            const p = await $`bash -c ${cmd}`;
            entry.stdout = p.stdout;
            entry.stderr = p.stderr;
            return p;

        } catch (err) {
            // Check if the error was thrown by zx and contains the expected properties
            const isProcessError = (e: unknown): e is ProcessOutput => e !== null && typeof e === 'object' && 'stdout' in e && 'stderr' in e;

            if (isProcessError(err)) {
                const p = err as ProcessOutput;
                entry.ok = false;
                entry.stdout = p.stdout;
                entry.stderr = p.stderr;
            }
            throw err;

        } finally {
            logs?.push(entry);
        }
    }
}



/**
 * Returns the timeout for the given runnable in milliseconds. If there is no timeout
 * specified for the runnable, the default timeout from the test suite is used.
 */
function timeout(runnable: AutogradingTests.Runnable, suite: AutogradingTests.TestSuite): number {
    const timeout = (typeof runnable === 'object' && 'timeout' in runnable && runnable.timeout) ? runnable.timeout : suite.defaults.timeout;

    return 'seconds' in timeout ? timeout.seconds * 1000 : timeout.minutes * 60 * 1000;
}

/**
 * Returns an array from the given value. If the value is already an array, it is returned as is.
 * If the value is a single item, it is wrapped in an array. If the value is undefined, an empty array is returned.
 */
function toArray<T>(value?: T | T[]): T[] {
    if (value === undefined) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
