import { type Duration } from "zx";
export type TestSuite = {
    name: string;
    description: string;
    tests: TestCase[];
};
export type TestCase = {
    name: string;
    description: string;
    run: string | string[];
    input?: string;
    setup?: string | string[];
    teardown?: string | string[];
    score?: number;
    timeout?: Timeout;
    /** Strings that the test command outputs must contain. */
    contains?: string[];
    /** Strings that the test command outputs must not contain. */
    notContains?: string[];
    /** Regular expressions that the test command outputs must match. */
    regex?: string[];
    /** Whether a failing test causes subsequent tests to be skipped. */
    skipRemainingOnFailure?: boolean;
};
export type TestRun = {
    test: TestCase;
    status: "passed" | "failed" | "skipped";
    logs: RunLog[];
    /** Errors caused by test validation rules (contains, notContains, regex) */
    errors?: string[];
};
export type RunLog = {
    cmd: string;
    input?: string;
    output: string;
    ok: boolean;
};
export type Timeout = Duration;
