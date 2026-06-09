import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { $, runnerEnv } from "./utils";

describe('generating reports for suites in examples folder', async () => {

    const processOutput = await $`npx vitest run tests/e2e/examples/complex.test.ts`;

    describe('classroom 50 reporter', async () => {

        const result = readFileSync("result.json", "utf-8");
        const reportJson = JSON.parse(result);

        it('writes a report file in the expected location', async () => {
            const output = processOutput.toString();

            expect(output).toContain("Writing results to result.json");
        });

        it('produces test and grading fields required by the Classroom 50 specification', async () => {
            expect(reportJson).toHaveProperty('schema', 'classroom50/result/v1');
            expect(reportJson).toHaveProperty('tests');
            expect(reportJson).toHaveProperty('score');
            expect(reportJson).toHaveProperty('max-score');
        });

        it('includes runner environment variables in the report', async () => {
            const env = runnerEnv;
            expect(reportJson).toHaveProperty('classroom', env.CLASSROOM);
            expect(reportJson).toHaveProperty('assignment', env.ASSIGNMENT);
            expect(reportJson).toHaveProperty('usernames', [env.USERNAME]);
            expect(reportJson).toHaveProperty('submission', env.SUBMISSION_TAG);
            expect(reportJson).toHaveProperty('commit', env.COMMIT_URL);
            expect(reportJson).toHaveProperty('release', env.RELEASE_URL);
            expect(reportJson).toHaveProperty('review', env.COMMIT_URL);
        });

        it('calculates total score and max score correctly', async () => {
            expect(reportJson).toHaveProperty('score', 21);
            expect(reportJson).toHaveProperty('max-score', 31);
        });

        it('includes individual test results with required fields', async () => {
            const tests = reportJson.tests;
            expect(tests.length).toBe(3);

            expect(tests[0]).toEqual({
                "test-name": "Test 1: success",
                "passed": true,
                "score": 1,
                "max-score": 1
            });
            expect(tests[1]).toEqual({
                "test-name": "Test 2: failure",
                "passed": false,
                "score": 0,
                "max-score": 10
            });
            expect(tests[2]).toEqual({
                "test-name": "Test 3: lifecycle hooks",
                "passed": true,
                "score": 20,
                "max-score": 20
            });
        });
    });

    describe('markdown reporter', async () => {
        const markdown = readFileSync("release-notes.md", "utf-8");

        it('writes the notes in the expected location', async () => {
            const output = processOutput.toString();

            expect(output).toContain("Writing results to release-notes.md");
        });

        it('produces correct main heading and subheadings', async () => {
            expect(markdown).toContain('# Complex test suite');
            expect(markdown).toContain('## Summary');
            expect(markdown).toContain('## Test cases');
        });

        it('includes correct score and test counts', async () => {
            expect(markdown).toContain('Score: **21 / 31**');
            expect(markdown).toContain('Passed: **2 / 3**');
        });

        it('contains the commands and outputs executed in the tests', async () => {
            expect(markdown).toContain('$ cat temp/setup.tmp')
            expect(markdown).toContain('hello from setup')
        });

        it('includes exceptions raised during tests', async () => {
            expect(markdown).toContain(`❌ AssertionError: expected 'This test is designed to fail`);
        });
    });
}, 20_000);
