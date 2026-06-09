import { describe, expect, it } from "vitest";
import { $ } from "./utils";

/**
 * This test suite runs the example test suites in `tests/e2e/examples`. Those
 * test suites utilize the autograding runner, which is our main test target
 * in this file.
 */
describe('running test suites in examples folder', async () => {

    const processOutput = await $`npx vitest run tests/e2e/examples/ --reporter=default`;
    const report = processOutput.toString();

    describe('test runner', () => {

        it('runs simple autograding tests in the suite', async () => {
            expect(report).toContain("✓ tests/e2e/examples/simple.test.ts (2 tests)");
        });

        it('reports both passing and failing tests in suites', async () => {
            expect(report).toContain("✓ Test 1: success");
            expect(report).toContain("× Test 2: failure");

            expect(report).toContain("❯ tests/e2e/examples/complex.test.ts (3 tests | 1 failed)");
        });

        it('reports known assertion failure with details', async () => {
            expect(report).toContain("AssertionError: expected 'This test is designed to fail");
        });

        it('processes lifecycle hooks before and after tests', async () => {
            expect(report).toContain("✓ Test 3: lifecycle hooks");
        });
    });

}, 20_000);
