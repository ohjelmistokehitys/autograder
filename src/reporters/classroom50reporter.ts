import fs from 'node:fs';
import { TestModule, Vitest } from 'vitest/node';
import type { Reporter } from 'vitest/reporters';
import { ClassroomJSON } from '../types';
import { TestResult } from './test-result';

/** Default output file, if none is specified in the reporter options. */
const DEFAULT_OUTPUT_FILE = 'result.json';

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
