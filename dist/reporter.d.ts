import type { TestRun, TestSuite } from './types.ts';
export declare class AutogradingReport {
    readonly results: TestRun[];
    readonly suite: TestSuite;
    constructor(suite: TestSuite, results: TestRun[]);
    get passed(): boolean;
    get score(): number;
    get maxScore(): number;
    /**
     * Builds the full markdown report, including a summary of test results and detailed sections for each test case.
     */
    toMarkdown(): string;
    /**
     * Builds the header section of the markdown report, including potential suite level errors.
     */
    private headerLines;
    /**
     * Builds the summary section of the markdown report, including a table of all test cases.
     */
    private summaryLines;
    /**
     * Builds the detailed section for each test case.
     */
    private testCaseLines;
    /**
     * Builds a code block for the given command log, including the actual command and its outputs.
     */
    private commandLog;
}
export declare function statusIcon(status: TestRun["status"]): string;
