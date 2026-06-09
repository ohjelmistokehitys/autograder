import { runSuite } from "../src/runner.js";

runSuite({

    defaultTimeout: { seconds: 5 },
    defaultScore: 1,

    name: "Example test suite",
    description: "This is an example test suite to demonstrate the features of the autograder framework. It includes various types of tests and hooks to show how they can be used in practice.",

    // The lifecycle hooks can be either single operations or arrays.
    // Both JavaScript functions and shell commands are supported.
    // Also, beforeEach and afterAll/afterEach hooks are also supported.
    beforeAll: [
        "echo 'Setting up test environment...'",
        "echo 'This is the beforeAll hook!'",
        () => {
            console.log("Setup using a JavaScript function");
        }
    ],

    // Each test case must have a name and a description. Points, timeouts and setup commands are optional.
    // If no `contains` or `notContains` fields are provided, the test will pass if the command(s) run without error.
    tests: [
        {
            name: "Simple Hello World",
            description: `
                Runs the hello world script and checks its output.

                <code>HTML</code> and **Markdown** formatting is supported in the descriptions for test cases, although you should not abuse this feature in real life.
            `,
            $run: "echo 'Hello world!'",
            contains: "Hello world!",
            score: 10
        }, {
            name: "Bash Hello World",
            description: "Runs two scripts and checks that two separate strings are present in the output.",
            $setup: "echo 'Hello world!' > hello.tmp",
            $run: "cat hello.tmp",
            contains: ["Hello", "world!"],
            score: 20
        }, {
            name: "Running Node.js scripts",
            description: "Runs a JavaScript file and checks its output.",
            $run: "node demo/hello.js",
            contains: "Hello from JavaScript!",
            score: 30
        }, {
            name: "Compiling and running Java code",
            description: "Tests can have setup commands that run before the test command. In this case, we compile a Java file before running it.",
            $setup: "javac demo/Hello.java",
            $run: "java -cp demo Hello",
            contains: "Hello from Java!",
            score: 40
        }, {
            name: "Running Python scripts",
            description: "Runs a Python file and checks its output. Also outputs the Python version for debugging purposes.",
            $setup: `python3 --version && python3 -m pip --version`,
            $run: "python3 demo/hello.py",
            contains: "Hello from Python!",
            score: 50
        }, {
            name: "Running Docker containers",
            description: "Builds and runs a Docker image, then checks the output. This test has a longer timeout since pulling and building images can take some time.",
            $setup: "docker build --file=demo/hello.Dockerfile --tag=hello demo",
            $run: "docker run --rm hello",
            contains: "Hello from Docker!",
            score: 60,
            timeout: { minutes: 1 }
        }, {
            name: "Custom grader function and Markdown support in descriptions",
            description: `
                This test uses a custom grader function to determine the points awarded. The custom grader actually just gives *random* points and logs them in the test logs.

                In a *real* autograder, you would inspect the logs and other context within the custom grader to determine the points based on more complex logic than just whether the test passed or not.
            `,
            $run: "echo 'Random points for this example!'",
            score: 26,
            customGrader: async ({ logs, testCase, testSuite }) => {

                // The hooks can reference the context, including the test suite and test case. This allows for using dynamic values.
                const score = Math.ceil((testCase.score ?? testSuite.defaultScore) * Math.random());

                // New log entries can be added within the custom grader, and will be included in the final report. This allows for providing detailed feedback to students.
                logs.push({
                    command: "Custom grader logic",
                    stdout: `Awarded ${score} points based on random grading logic.`,
                    ok: true
                });

                // In a real grader, you would inspect the logs and other context to determine the points.
                return { score };
            }
        }
    ]
});
