import fs from 'node:fs';
import { TaskMeta } from 'vitest';
import { TestCase, TestModule, Vitest } from 'vitest/node';
import type { Reporter } from 'vitest/reporters';
import { ClassroomJSON } from '../types';

/** Default output file, if none is specified in the reporter options. */
const DEFAULT_OUTPUT_FILE = 'result.json';

/** The default score to be awarded for each test case, if a test metadata doesn't specify a score. */
const DEFAULT_SCORE = 1;

export type ReporterOptions = {
    /** The file path where the test results will be written. */
    outputFile?: string
}

/**
 * Generates a test report in the format expected by Classroom 50. See
 * https://github.com/foundation50/classroom50/wiki/Autograders#the-resultjson-contract
 *
 * The report is written to a file specified in the reporter options, or `result.json` by default.
 *
 * The reporter requires environment variables from the runner. See
 * https://github.com/foundation50/classroom50/wiki/Autograders#contract
 */
export default class Classroom50Reporter implements Reporter {
    private readonly outputFile;
    private ctx!: Vitest;

    constructor(options: ReporterOptions) {
        this.outputFile = options.outputFile ?? DEFAULT_OUTPUT_FILE;
    }

    onInit(vitest: Vitest) {
        this.ctx = vitest;
    }

    async onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
        const vitestTests = testModules.flatMap(module => [...module.children.allTests()]);

        const testResults = vitestTests.map(test => new TestResult(test));


        const output: ClassroomJSON.ClassroomReport = {
            ...this.getAssignmentEnvironment(),
            'score': sum(testResults.map(test => test.score)),
            'max-score': sum(testResults.map(test => test.maxScore)),
            'tests': [...testResults].map(result => result.json),
        };

        this.writeFile(output);
    }

    /**
     * Returns environment variables injected by Classroom 50 from GitHub actions.
     */
    getAssignmentEnvironment(): ClassroomJSON.ClassroomEnvironment {
        const getEnv = (name: string, fallback = '') => {
            const value = process.env[name];
            if (!value) {
                this.ctx.logger.warn(`Environment variable not set: ${name}`);
            }
            return value ?? fallback;
        }

        return {
            schema: 'classroom50/result/v1',
            classroom: getEnv('CLASSROOM'),
            assignment: getEnv('ASSIGNMENT'),
            usernames: [getEnv('USERNAME')],
            submission: getEnv('SUBMISSION_TAG'),
            commit: getEnv('COMMIT_URL'),
            release: getEnv('RELEASE_URL'),
            review: getEnv('COMMIT_URL'),
            datetime: new Date().toISOString()
        };
    }

    private writeFile(data: ClassroomJSON.ClassroomReport) {
        this.ctx.logger.log(`Writing results to ${this.outputFile}`);
        fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2), 'utf-8');
    }
}

const sum = (arr: number[]) => arr.reduce((acc, cur) => acc + cur, 0);

class TestResult {
    constructor(readonly test: TestCase) { }

    /**
     * Returns a single test case in Classroom 50 format.
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
     * The maximum score for the test case. If a max score was added to the test metadata during
     * test execution, that score is used. Otherwise, the default score is used.
     */
    get maxScore(): number {
        return typeof this.meta.maxScore === 'number' ? this.meta.maxScore : DEFAULT_SCORE;
    }

    /**
     * The score for the test case. If a score was added to the test metadata during test execution,
     * that score is used. Otherwise, if the test passed without throwing an error, the default score
     * is awarded. If no score was added to the metadata and the test failed, 0 points are awarded.
     */
    get score(): number {
        if (typeof this.meta.score === 'number') {
            return this.meta.score;
        }

        return this.passed ? DEFAULT_SCORE : 0;
    }

    private get passed(): boolean {
        return this.test.result().state === 'passed';
    }

    private get meta(): TaskMeta {
        return this.test.meta() ?? {};
    }
}


