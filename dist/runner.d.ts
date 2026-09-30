import { AutogradingReport } from './reporter.ts';
import type { TestSuite } from './types.ts';
export declare class TestRunner {
    private suite;
    constructor(suite: TestSuite);
    run(): Promise<AutogradingReport>;
    private runTest;
    private execute;
    private log;
}
