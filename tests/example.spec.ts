import { runSuite } from "../src/runner.js";

runSuite({

    defaults: {
        timeout: {
            seconds: 5,
        },
        points: 1
    },

    beforeAll: {
        name: "Setup test environment",
        $run: "echo 'Setting up test environment...'"
    },

    afterAll: {
        name: "Teardown test environment",
        $run: "echo 'Tearing down test environment...'"
    },

    beforeEach: {
        name: "Setup test case",
        $run: "echo 'Setting up test case...'"
    },

    afterEach: () => console.log("afterEach"),

    tests: [
        {
            name: "Hello world",
            description: "Runs the hello world script and checks its output.",
            $run: "echo 'Hello world!'",
            contains: "Hello world!"
        }
    ]
});
