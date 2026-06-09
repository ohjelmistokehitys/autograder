import { TaskMeta } from "vitest";
import { TestCase } from "vitest/node";
import { ClassroomJSON, RunLog } from "../../shared/types";

/** The default score to be awarded for each test case, if a test metadata doesn't specify a score. */
const DEFAULT_SCORE = 1;

/**
 * A wrapper around Vitest's TestCase that provides access to properties and methods for generating test reports.
 */
export class TestResult {

    constructor(readonly test: TestCase) { }

    /**
     * The maximum score for the test case. If a max score was added to the test metadata during
     * test execution, that score is used. Otherwise, the default score is used.
     */
    get maxScore(): number {
        return this.meta.maxScore ?? DEFAULT_SCORE;
    }

    get name() {
        return this.test.name;
    }

    get description() {
        return this.test.meta()?.description ?? '';
    }

    get icon() {
        return ({ passed: '✅', failed: '❌', skipped: '⚠️', pending: '⏳' })[this.status] || '⚠️';
    }

    /**
     * Returns this test result formatted as a JSON object according to the Classroom 50 result.json contract.
     */
    get json(): ClassroomJSON.ClassroomTest {
        return {
            'test-name': this.test.name,
            'passed': this.passed,
            'score': this.score,
            'max-score': this.maxScore
        };
    }

    /**
     * If a score was added to the test metadata during test execution, that score is used.
     * Otherwise, if the test passed without throwing an error, the default score
     * is awarded. Otherwise 0 points are awarded.
     */
    get score(): number {
        return this.meta.score ?? (this.passed ? DEFAULT_SCORE : 0);
    }

    get passed(): boolean {
        return this.status === 'passed';
    }

    get logs(): RunLog[] {
        return this.meta.logs ?? [];
    }

    get failureMessages(): string[] {
        return this.test.result().errors?.map(e => e.stack?.split('\n')[0] || e.message) || [];
    }

    /** An alphanumeric identifier for the test case, suitable for use in URLs or anchors. */
    get anchor() {
        return this.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    get status() {
        return this.test.result().state;
    }

    /** Returns all custom information potentially stored in the test metadata. */
    private get meta(): TaskMeta {
        return this.test.meta() ?? {};
    }
}
