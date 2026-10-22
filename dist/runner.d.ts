import { AutogradingReport } from './reporter.ts';
import type { RunLog, TestCase, TestRun, TestSuite } from './types.ts';
export declare class TestRunner {
    private suite;
    constructor(suite: TestSuite);
    run(): Promise<AutogradingReport>;
    runTest(test: TestCase): Promise<TestRun>;
    execute(cmd: string, test: TestCase): Promise<RunLog>;
    log(result: TestRun): void;
}
