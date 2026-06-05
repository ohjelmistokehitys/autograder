import { readFile, writeFile } from 'node:fs/promises';
import {
    type ClassroomJSON,
    type VitestReport
} from './types';

/**
 * Takes in a Vitest JSON report and transforms it into a Classroom50 compatible report.
 * The report includes both the test results and environment information required by the
 * result.json contract.
 *
 * See https://github.com/foundation50/classroom50/wiki/Autograders#the-resultjson-contract
 */
function buildScoreJson(vitest: VitestReport.VitestResults): ClassroomJSON.ClassroomReport {
    // There may be several suites, combine all tests into a single list:
    const assertions = (vitest.testResults ?? []).flatMap(
        (suite) => suite.assertionResults ?? []
    );

    // Map each Vitest test to a Classroom50 test.
    const tests: ClassroomJSON.ClassroomTest[] = assertions.map((assertion) => {
        const maxScore = toNumber(assertion.meta?.maxPoints);
        const passed = assertion.status === 'passed';

        return {
            'test-name': assertion.title,
            'passed': passed,
            'score': passed ? maxScore : 0,
            'max-score': maxScore,
        };
    });

    const totalScore = tests.reduce((sum, test) => sum + test['score'], 0);
    const totalMaxScore = tests.reduce((sum, test) => sum + test['max-score'], 0);

    return {
        ...getAssignmentEnvironment(),
        'score': totalScore,
        'max-score': totalMaxScore,
        'tests': tests,
    };
}

async function main(): Promise<void> {
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];

    if (!inputPath || !outputPath) {
        console.error('Usage: prepare-report.ts <input-path> <output-path>');
        process.exit(1);
    }

    const raw = await readFile(inputPath, 'utf-8');
    const parsed = JSON.parse(raw) as VitestReport.VitestResults;
    const transformed = buildScoreJson(parsed);

    await writeFile(outputPath, `${JSON.stringify(transformed, null, 4)}\n`, 'utf-8');
}

function getAssignmentEnvironment(): ClassroomJSON.ClassroomEnvironment {
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

function getEnv(name: string, fallback = ""): string {
    const value = process.env[name];
    if (!value) {
        console.warn(`Environment variable not set: ${name}`);
    }
    return value ?? fallback;
}

function toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to build score JSON: ${message}`);
    process.exit(1);
});
