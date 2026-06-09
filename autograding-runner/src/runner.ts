import { expect, test } from 'vitest';
import { ProcessOutput, $ as zx } from 'zx';
import { AutogradingTests, RunLog } from '../../shared/types';


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

    test.describe(
        testSuite.name, {
        meta: {
            description: testSuite.description
        }
    }, () => {

        toArray(testSuite.beforeAll).forEach(runnable => {
            test.beforeAll(async () => {
                await run(runnable);
            }, timeout(runnable, testSuite));
        });

        toArray(testSuite.beforeEach).forEach(runnable => {
            test.beforeEach(async () => {
                await run(runnable);
            }, timeout(runnable, testSuite));
        });

        toArray(testSuite.afterAll).forEach(runnable => {
            test.afterAll(async () => {
                await run(runnable);
            }, timeout(runnable, testSuite));
        });

        toArray(testSuite.afterEach).forEach(runnable => {
            test.afterEach(async () => {
                await run(runnable);
            }, timeout(runnable, testSuite));
        });


        testSuite.tests.forEach(testCase => {
            test(testCase.name, async ({ task: { meta } }) => {
                meta.maxScore = testCase.score ?? testSuite.defaultScore;
                meta.description = testCase.description;
                meta.score = 0;

                const logs = meta.logs = [];
                let output = "";

                if (testCase.$setup) {
                    const setup = await runCmd(testCase.$setup, logs);
                    output += setup.toString();
                }

                const run = await runCmd(testCase.$run, logs);
                output += run.toString();

                await assertOutput(testCase, output);

                if (testCase.customGrader) {
                    // if a custom grader is provided, use it to determine the points awarded for the test
                    const { score } = await testCase.customGrader({ logs, testCase, runCmd, testSuite });
                    meta.score = score;
                } else {
                    // full points awarded if there is no custom grader and the test passed without throwing an error
                    meta.score = meta.maxScore;
                }

            }, timeout(testCase, testSuite));
        });
    });

    /**
     * Runs the given runnable, which can be either a shell command or a function. If the runnable
     * is a shell command, it is executed using zx. If it is a function, it is called directly.
     *
     * @param runnable
     */
    async function run(runnable: AutogradingTests.Runnable): Promise<ProcessOutput> {
        if (typeof runnable === 'function') {
            return await runnable({ runCmd, testSuite });
        }

        if (typeof runnable === 'string') {
            return await runCmd(runnable);
        }

        if ('$run' in runnable) {
            return await runCmd(runnable.$run);
        }

        throw new Error(`Unsupported runnable: ${JSON.stringify(runnable)}`);
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
        if ('$compareRun' in testCase && testCase.$compareRun) {
            const compareRun = await run(testCase.$compareRun);
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
    async function runCmd(cmd: string, logs?: RunLog[]): Promise<ProcessOutput> {
        const entry: RunLog = {
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
            entry.ok = false;

            if (isProcessError(err)) {
                const p = err as ProcessOutput;
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
    const timeout = (typeof runnable === 'object' && runnable?.timeout) || suite.defaultTimeout;

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
