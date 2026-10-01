import { describe, expect, it } from 'vitest';
import { AutogradingReport } from '../src/reporter.ts';
import type { TestCase, TestRun, TestSuite } from '../src/types.ts';

const createTest = (overrides: Partial<TestCase> = {}): TestCase => ({
    name: 'Passing Test',
    description: 'Checks a successful command',
    run: 'echo passed',
    ...overrides
});

const createSuite = (tests: TestCase[]): TestSuite => ({
    name: 'Sample Suite',
    description: 'A report test suite',
    tests
});

describe('AutogradingReport', () => {
    it('calculates pass status, earned score, and maximum score', () => {
        const passingTest = createTest({ score: 4 });
        const failingTest = createTest({ name: 'Failing Test', score: 3 });
        const skippedTest = createTest({ name: 'Skipped Test', score: 2 });
        const suite = createSuite([passingTest, failingTest, skippedTest]);
        const results: TestRun[] = [
            { test: passingTest, status: 'passed', logs: [] },
            { test: failingTest, status: 'failed', logs: [] },
            { test: skippedTest, status: 'skipped', logs: [] }
        ];

        const report = new AutogradingReport(suite, results);

        expect(report.passed).toBe(false);
        expect(report.score).toBe(4);
        expect(report.maxScore).toBe(9);
    });

    it('renders suite summary and details for passed, failed, and skipped tests', () => {
        const passingTest = createTest({ score: 4 });
        const failingTest = createTest({ name: 'Missing Output', score: 3 });
        const skippedTest = createTest({ name: 'Not Run', score: 2 });
        const suite = createSuite([passingTest, failingTest, skippedTest]);
        const results: TestRun[] = [
            {
                test: passingTest,
                status: 'passed',
                logs: [{
                    cmd: 'echo passed',
                    input: 'sample input',
                    output: 'passed',
                    ok: true
                }]
            },
            {
                test: failingTest,
                status: 'failed',
                logs: [{ cmd: 'false', output: 'command failed', ok: false }],
                errors: ['The output should contain "expected"']
            },
            { test: skippedTest, status: 'skipped', logs: [] }
        ];

        const markdown = new AutogradingReport(suite, results).toMarkdown();

        expect(markdown).toMatchSnapshot();
    });
});
