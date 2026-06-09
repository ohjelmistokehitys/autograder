import { $ as zx } from "zx";

/**
 * Runner environment variables that the Classroom 50 reporter expects to see.
 * These are used to verify that the reporter correctly includes these variables
 * in its output report.
 */
export const runnerEnv = {
    CLASSROOM: 'demo101',
    ASSIGNMENT: 'demo-assignment',
    USERNAME: 'student1',
    SUBMISSION_TAG: 'https://example.com/submission',
    COMMIT_URL: 'DEADBEEF',
    RELEASE_URL: 'https://example.com/release'
};

/**
 * A preconfigured version of zx's $ function with environment variables set
 * for the runner, and with colors and other output formatting disabled for easier testing.
 */
export const $: typeof zx = zx({
    env: { ...process.env, ...runnerEnv, NO_COLOR: 'true', CI: 'true' },
    nothrow: true
});
