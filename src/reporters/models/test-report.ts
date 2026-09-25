import type { RunLog, TestRun } from "../../types.ts";

export class TestReport {
    private readonly run: TestRun;

    constructor(test: TestRun) {
        this.run = test;
    }

    get maxScore(): number {
        return this.run.testCase.score ?? 0;
    }

    get name() {
        return this.run.testCase.name;
    }

    get description() {
        return this.run.testCase.description;
    }

    get icon() {
        return ({
            passed: this.score === this.maxScore ? '✅' : '⚠️',
            failed: '❌',
            skipped: '⚠️',
            pending: '⏳'
        })[this.status] || '⚠️';
    }

    get score(): number {
        return this.passed ? (this.run.testCase.score ?? 0) : 0;
    }

    get passed(): boolean {
        return this.status === 'passed';
    }

    get skipped(): boolean {
        return this.status === 'skipped';
    }

    get logs(): RunLog[] {
        return this.run.logs;
    }

    get error(): string {
        return this.run.error ?? '';
    }

    /** An alphanumeric identifier for the test case, suitable for use in URLs or anchors. */
    get anchor() {
        return this.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    get status() {
        return this.run.status;
    }
}
