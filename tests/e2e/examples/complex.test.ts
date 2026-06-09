import { runSuite } from "../../../autograding-runner/src/runner";

runSuite({
    name: "Complex test suite",
    description: "This is a complex test suite with one check that fails and one that passes.",
    defaultScore: 1,
    defaultTimeout: { seconds: 5 },

    // These hooks will make changes to the filesystem that we check below in the tests:
    beforeAll: "mkdir temp",
    beforeEach: "touch temp/testfile.tmp",
    afterEach: "rm temp/testfile.tmp",
    afterAll: "rm -rf temp",

    tests: [
        {
            name: "Test 1: success",
            description: "This test has a $setup block and a $run block.",
            $setup: "echo 'hello from setup' > temp/setup.tmp",
            $run: "cat temp/setup.tmp",
            contains: ["hello from", "setup"],
            notContains: ["fail"]
        },
        {
            name: "Test 2: failure",
            description: "This test checks if the output contains a specific string, and fails.",
            $run: "echo This test is designed to fail.",
            contains: "NOT THE STRING IN THE OUTPUT",
            score: 10
        },
        {
            name: "Test 3: lifecycle hooks",
            description: "This test checks that the beforeAll and before each hooks were executed.",
            $run: "ls -la temp",
            contains: ["testfile.tmp"],
            notContains: ["node_modules"],
            score: 20
        }
    ]
});
