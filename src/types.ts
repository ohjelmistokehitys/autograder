import { type Duration } from "zx";

export type TestSuite = {
    name: string,
    description: string,

    /** The default timeout for each shell command in the suite. */
    defaultTimeout: Timeout;

    tests: TestCase[];
};

export type AutogradingReport = {
    suite: TestSuite;
    results: TestRun[];
    error?: string;
};

export type TestCase = {
    name: string;
    description: string;

    $run: Commands;
    input?: string;

    $setup?: Commands;
    $teardown?: Commands;

    score?: number;

    contains?: Matches;
    notContains?: Matches;
    regex?: Matches;

    timeout?: Timeout;

    /** Whether a failing test causes subsequent tests to be skipped. */
    skipRemainingOnFailure?: boolean;
};

export type Commands = string | string[];

export type Matches = string | string[];

export type TestRun = {
    testCase: TestCase;
    status: "passed" | "failed" | "pending" | "skipped";
    logs: RunLog[];
    error?: string;
}

export type RunLog = {
    command: string;
    input?: string;
    stdout?: string;
    stderr?: string;

    ok: boolean;
};

// Example: 60, "60s" or "1m"
export type Timeout = Duration;
