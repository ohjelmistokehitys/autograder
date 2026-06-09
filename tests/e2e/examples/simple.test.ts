import { runSuite } from "../../../autograding-runner/src/runner";

runSuite({
    name: "Simple test suite",
    description: "This is a simple test suite with two tests that check for specific output.",
    defaultScore: 1,
    defaultTimeout: { seconds: 5 },

    tests: [
        {
            name: "Test 1",
            description: "This test checks that the output contains 'Hello, World!'.",
            $run: "echo Hello, World!",
            contains: "Hello, World!",
        },
        {
            name: "Test 2",
            description: "This test checks that the output contains a specific string.",
            $run: "echo This is a simple test suite.",
            contains: "This is a simple test suite.",
        }
    ]
});
