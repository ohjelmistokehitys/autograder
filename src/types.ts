import { TaskMeta } from 'vitest';
import { ProcessOutput } from 'zx';

declare module 'vitest' {

    // The runner adds metadata to the Vitest output in each test, so we need to
    // extend the type definition to include those fields:
    interface TaskMeta {
        description: string;
        maxPoints: number;
        points?: number;
        logs?: VitestReport.RunLog[];
    }
}

export namespace VitestReport {

    /** The format for the Vitest JSON report. */
    export type VitestResults = {
        testResults?: Array<{
            assertionResults?: VitestAssertion[];
            message: string;
        }>;
    };

    export type VitestAssertion = {
        title: string;
        status: string;
        failureMessages: string[];
        meta: TaskMeta;
    };

    export type RunLog = {
        command: string;
        ok: boolean;

        stdout?: string;
        stderr?: string;
    }
}

export namespace ClassroomJSON {

    /**
     * The format for the result.json file that the autograder
     * will output, as per the Classroom50 contract.
     * See https://github.com/foundation50/classroom50/wiki/Autograders#the-resultjson-contract
     */
    export type ClassroomReport = ClassroomAutograding & ClassroomEnvironment;

    export type ClassroomEnvironment = {
        schema: string,
        classroom: string,
        assignment: string,
        usernames: string[],
        submission: string,
        commit: string,
        release: string,
        review: string,
        datetime: string
    };

    export type ClassroomAutograding = {
        'score': number;
        'max-score': number;
        'tests': ClassroomTest[];
    };

    export type ClassroomTest = {
        'test-name': string;
        'passed': boolean;
        'score': number;
        'max-score': number;
    };
}

/**
 * Fields prefixed with $ are commands that are run on the terminal. By default,
 * all commands are expected to succeed with an exit code of 0.
 */
export namespace AutogradingTests {

    /**
     * Test suite is a collection of test commands and configuration options
     * that can be executed with the Vitest test runner.
     *
     * The test suite extends basic test cases with additional grading and logging
     * related features, which are used by the JSON and Markdown reporters to
     * generate their outputs.
     */
    export type TestSuite = {
        cwd?: string;
        defaults: {
            /** Timeout for a test case or a lifecycle hook */
            timeout: Timeout;

            /** Default points for a single test case */
            points: number;
        };
        beforeAll?: Runnable | Runnable[];
        beforeEach?: Runnable | Runnable[];
        afterEach?: Runnable | Runnable[];
        afterAll?: Runnable | Runnable[];
        tests: TestCase[];
    }

    /** Timeout with a number and unit. */
    type Timeout = { seconds: number } | { minutes: number };

    /** A runnable can be given either as a shell command, an object or a JS function. */
    export type Runnable = string | RunnableObj | Hook;

    export type RunnableObj = {
        name: string;
        $run: string;
        timeout?: Timeout;
    }

    export type Hook = () => Promise<any> | void;


    export type CommandTest = RunnableObj & {
        description: string;
        $setup?: string;
        points?: number;

        /** A string or array of strings that the output must contain for the test to pass. */
        contains?: string | string[];

        /** A string or array of strings that the output must not contain. */
        notContains?: string | string[];

        /** The command to run for comparison against. The test passes if the output of the test matches the output of this command. */
        $compareRun?: Runnable;

        /**
         * A custom grader function that receives the test context and returns the points awarded. For the
         * custom grader to be invoked, other all other checks must pass and the setup and run commands
         * must execute successfully.
         *
         * Any operations including addiotional commands or assertins can be invoked within the custom grader.
         * If the test should be failed, the grader should throw an error. Vitest `expect` assertions are
         * recommended for throwing errors, as they will be consistent with the rest of the checks.
         */
        customGrader?: (context: {
            /** Logs for inspecting the test execution and for adding new entries. */
            logs: VitestReport.RunLog[],

            /** The test case itself, for dynamically referencing fields. */
            self: CommandTest,

            /**
             * The function that can run shell commands. This is provided for convenience, but it
             * also provides a way to use the exact same environment and working directory as the rest of the
             * commands in the test case.
             */
            runCmd: (cmd: string, logs?: VitestReport.RunLog[]) => Promise<ProcessOutput>
        }) => Promise<Pick<TaskMeta, 'points'>>;
    }

    export type TestCase = CommandTest;
}
