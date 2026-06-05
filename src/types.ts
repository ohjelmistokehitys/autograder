import { TaskMeta } from 'vitest';

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
            timeout: Timeout;
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

    /** A runnable can be given either as a shell command or as a JS function. */
    export type Runnable = RunnableObj | RunnableFunc;

    export type RunnableObj = {
        name: string;
        $run: string | string[];
        timeout?: Timeout;
    }

    export type RunnableFunc = () => Promise<any> | void;


    export type BaseTest = RunnableObj & {
        description: string;
        $setup?: string;
        points?: number;
    }

    type ExecTest = BaseTest & {}

    type OutputTest = BaseTest & {
        // The expected output. If an array, the test passes if ALL of the outputs match.
        contains: string | string[];
    }

    type NegativeOutputTest = BaseTest & {
        // The output is expected to NOT contain this string. If an array, the test passes if none of the outputs match.
        notContains: string | string[];
    }

    type CommandTest = BaseTest & {
        // The command to run for comparison against. The test passes if the output of the test matches the output of this command.
        $compareRun: string;
    }

    export type TestCase = ExecTest | OutputTest | CommandTest | NegativeOutputTest;
}
