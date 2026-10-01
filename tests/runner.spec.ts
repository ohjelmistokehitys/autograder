import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestRunner } from '../src/runner.ts';
import type { TestCase, TestSuite } from '../src/types.ts';

const createTest = (overrides: Partial<TestCase> = {}): TestCase => ({
    name: 'shell command test',
    description: 'Runs shell commands through TestRunner',
    run: 'echo run',
    ...overrides
});

const createSuite = (tests: TestCase[]): TestSuite => ({
    name: 'TestRunner suite',
    description: 'Exercises TestRunner behavior',
    tests
});

describe('TestRunner', () => {
    beforeEach(() => {
        vi.spyOn(TestRunner.prototype, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Running tests and producing output', () => {
        it('runs setup, run, and teardown commands and checks combined output', async () => {
            const test = createTest({
                setup: ['echo setup', 'node --help'],
                run: 'npm ls --depth=0',
                teardown: 'echo teardown',
                contains: ['setup', 'Usage:', '@ohjelmistokehitys/autograder', 'teardown'],
                notContains: ['missing output'],
                regex: ['autograder']
            });
            const runner = new TestRunner(createSuite([test]));

            const result = await runner.runTest(test);

            expect(result.status).toBe('passed');
            expect(result.errors).toBeUndefined();
            expect(result.logs.map(log => log.cmd)).toEqual([
                'echo setup',
                'node --help',
                'npm ls --depth=0',
                'echo teardown'
            ]);
            expect(result.logs[0].output).toContain('setup');
            expect(result.logs.every(log => log.ok)).toBe(true);
        });

        it('stops executing a test after a command fails', async () => {
            const test = createTest({ run: ['echo before failure', 'false', 'echo after failure'] });
            const runner = new TestRunner(createSuite([test]));

            const result = await runner.runTest(test);

            expect(result.status).toBe('failed');
            expect(result.logs.map(log => log.cmd)).toEqual(['echo before failure', 'false']);
            expect(result.logs[0].output).toContain('before failure');
            expect(result.logs[1].ok).toBe(false);
        });

        it('skips later tests after a configured failure', async () => {
            const first = createTest({
                name: 'failing output check',
                run: 'echo available',
                contains: ['not available'],
                skipRemainingOnFailure: true
            });
            const second = createTest({ name: 'skipped test', run: 'echo should not run' });
            const runner = new TestRunner(createSuite([first, second]));

            const report = await runner.run();

            expect(report.results.map(result => result.status)).toEqual(['failed', 'skipped']);
            expect(report.results[1].logs).toEqual([]);
        });
    });

    describe('Providing inputs to commands', () => {
        it('passes input to commands and checks output', async () => {
            const test = createTest({
                name: 'input test',
                run: 'cat',
                input: 'Hello, world!',
                contains: ['Hello, world!']
            });
            const runner = new TestRunner(createSuite([test]));

            const result = await runner.runTest(test);

            expect(result.status).toBe('passed');
            expect(result.logs[0].output).toContain('Hello, world!');
        });
    });

    describe('Verifying output against strings and regular expressions', () => {
        it('fails when expected output is missing', async () => {
            const test = createTest({
                name: 'missing output test',
                run: 'echo actual output',
                contains: ['output', 'this is missing']
            });
            const runner = new TestRunner(createSuite([test]));

            const result = await runner.runTest(test);

            expect(result.status).toBe('failed');
            expect(result.errors?.at(0)).toContain('this is missing');
        });

        it('fails when unexpected output is present', async () => {
            const test = createTest({
                name: 'unexpected output test',
                run: 'echo ERROR',
                notContains: ['ERROR']
            });
            const runner = new TestRunner(createSuite([test]));

            const result = await runner.runTest(test);

            expect(result.status).toBe('failed');
            expect(result.errors?.at(0)).toContain('ERROR');
        });

        it('fails when output does not match a regular expression', async () => {
            const test = createTest({
                name: 'regex mismatch test',
                run: 'echo some output',
                regex: ['^expected.*$']
            });
            const runner = new TestRunner(createSuite([test]));

            const result = await runner.runTest(test);

            expect(result.status).toBe('failed');
            expect(result.errors).toContain('The output should match the regular expression "^expected.*$"');
        });
    });
});
