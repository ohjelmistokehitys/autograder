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

    it('handles backticks in command output correctly', () => {
        const testWithBackticks = createTest({
            name: 'Backtick Test',
            run: './some_script_that_outputs_backticks.sh',
        });
        const suite = createSuite([testWithBackticks]);
        const results: TestRun[] = [
            {
                test: testWithBackticks,
                status: 'passed',
                logs: [{
                    cmd: './some_script_that_outputs_backticks.sh',
                    input: '',
                    output: 'This is a `backtick` test. It even has ```code in triple backticks``` in it.',
                    ok: true
                }]
            }
        ];

        const markdown = new AutogradingReport(suite, results).toMarkdown();

        // The output should be wrapped in a code block with one more backticks to avoid conflicts
        const [before, codeBlock, after] = markdown.split('````');
        expect(codeBlock).toContain(results[0].logs[0].output);
    });

    it('handles carriage returns in command output correctly', () => {
        // Commands that simulate progress bars or dynamic output use carriage returns to overwrite the current line.
        // We only want to keep the final output after the last carriage return.
        const testWithCarriageReturns = createTest({
            name: 'Carriage Return Test',
            run: 'apt install -y curl',
        });
        const suite = createSuite([testWithCarriageReturns]);
        const results: TestRun[] = [
            {
                test: testWithCarriageReturns,
                status: 'passed',
                logs: [{
                    cmd: testWithCarriageReturns.run as string,
                    input: '',
                    output: "Reading package lists...\nBuilding dependency tree...\nReading state information...\nThe following NEW packages will be installed:\n  curl\n0 upgraded, 1 newly installed, 0 to remove and 167 not upgraded.\nNeed to get 226 kB of archives.\nAfter this operation, 537 kB of additional disk space will be used.\nGet:1 http://archive.ubuntu.com/ubuntu noble-updates/main amd64 curl amd64 8.5.0-2ubuntu10.16 [226 kB]\nFetched 226 kB in 0s (580 kB/s)\nSelecting previously unselected package curl.\r\n(Reading database ... \r(Reading database ... 5%25\r(Reading database ... 10%25\r(Reading database ... 15%25\r(Reading database ... 20%25\r(Reading database ... 25%25\r(Reading database ... 30%25\r(Reading database ... 35%25\r(Reading database ... 40%25\r(Reading database ... 45%25\r(Reading database ... 50%25\r(Reading database ... 55%25\r(Reading database ... 60%25\r(Reading database ... 65%25\r(Reading database ... 70%25\r(Reading database ... 75%25\r(Reading database ... 80%25\r(Reading database ... 85%25\r(Reading database ... 90%25\r(Reading database ... 95%25\r(Reading database ... 100%25\r(Reading database ... 46763 files and directories currently installed.)\r\nPreparing to unpack .../curl_8.5.0-2ubuntu10.16_amd64.deb ...\r\nUnpacking curl (8.5.0-2ubuntu10.16) ...\r\nSetting up curl (8.5.0-2ubuntu10.16) ...\r\nProcessing triggers for man-db (2.12.0-4build2) ...",
                    ok: true
                }]
            }
        ];

        const markdown = new AutogradingReport(suite, results).toMarkdown();

        // The output should not contain the intermediate carriage return lines, only the final output after the last carriage return:
        expect(markdown).toContain('> Selecting previously unselected package curl.\n> (Reading database ... 46763 files and directories currently installed.)\n> Preparing to unpack');
    });
});
