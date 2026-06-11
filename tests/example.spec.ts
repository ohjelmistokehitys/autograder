import { runSuite } from "../src";


runSuite({
    defaultTimeout: { seconds: 20 },
    defaultScore: 10,

    name: "Example test suite",
    description: `
        This is an example test suite to demonstrate the features of the autograder framework.

        It includes various types of tests and hooks to show how they can be used in practice.

        If you are currently looking at the final \`release-notes.md\` file, you can find the code for this test suite in \`tests/example.spec.ts\` file.
    `,

    beforeAll: [
        "echo 'Setting up test environment...'",
        "echo 'This is the beforeAll hook!'",
        () => {
            console.log("Setup using a JavaScript function");
        }
    ],

    tests: [
        {
            name: "Simple Hello World",
            description: `
                Runs the hello world script and passes if there are no errors. This test doesn't check the output at all, it just demonstrates how to run a command and assign points based on whether it succeeded or not.

                This test does not have an explicit score, so it will use the default score specified in the suite.

                <code>HTML</code> and **Markdown** formatting is supported in the descriptions for test cases, although you should not abuse this feature in real life.
            `,
            $run: "echo 'Hello world!'",
        }, {
            name: "Bash Hello World",
            description: "Runs two commands and checks that two separate strings are present in the output.",
            $setup: "echo 'Hello world!' > hello.tmp",
            $run: "cat hello.tmp",
            contains: ["Hello", "world!"],
            score: 5
        }, {
            name: "Running Node.js scripts",
            description: "Runs a JavaScript file and checks its outputs. This time the script outputs to both stdout and stderr.",
            $run: "node demo/hello.js",
            contains: ["Hello from JavaScript!", "Hello from console.error!"],
            score: 10
        }, {
            name: "Compiling and running Java code",
            description: "In this case, we compile a Java file in `$setup` before running it in `$run`.",
            $setup: "javac demo/Hello.java",
            $run: "java -cp demo Hello",
            contains: "Hello from Java!",
            score: 15
        }, {
            name: "Running Python scripts",
            description: "Runs a Python file and checks its output. You could also check the Python and pip versions for debugging purposes.",

            // commands commented out so that snapshot tests don't fail across different environments
            $setup: `
                # python3 --version
                # python3 -m pip --version
            `,
            $run: "python3 demo/hello.py",
            contains: "Hello from Python!",
            score: 20
        }, {
            name: "Failing test case",
            description: "This test is designed to fail to demonstrate how failed tests are reported.",
            $run: "./this/command/does/not/exist.sh",
            score: 25
        }, {
            name: "Running Docker containers",
            description: `
                Docker images can be built and run within the autograder. Tests with Docker commands may need a longer timeout since pulling and building images can take some time.

                Note that for this test to work, Docker needs to be installed and running on the machine where the tests are executed. Therefore we do not *actually* run the commands in this example.
            `,
            $setup: `
                # you could build a Docker image for this test like this:
                # docker build --file=demo/hello.Dockerfile --tag=hello demo

                # for demonstration purposes, we just output the Dockerfile
                cat demo/hello.Dockerfile
            `,
            $run: `
                # you can run the container like this:
                # docker run --rm hello

                # for demonstration purposes, we just output the Dockerfile
                cat demo/hello.Dockerfile
            `,
            score: 30,
            timeout: { minutes: 1 }
        }, {
            name: "Test that compares run output to a reference output",
            description: "This test is designed to execute a command and compare its output to the output of a reference command specified in `$compareRun`. This allows for testing the output of a command without having to hardcode the expected output in the test case, which can be useful for more complex outputs.",
            $run: `./demo/script.sh`, // the script should run npm audit
            $compareRun: `npm audit`, // verify that the output matches the output of running npm audit directly
            score: 45
        }, {
            name: "Custom grader function",
            description: `
                This test uses a custom grader function to determine the points awarded. It actually just gives half the points and logs them in the test logs.

                As you can see in the code, the \`customGrader\` function has access to the test context, including the test case details and the logs. This allows for implementing complex grading logic based on various factors.

                In a *real* autograder, you would inspect the logs and other context within the custom grader to determine the points based on more complex logic than just whether the test passed or not.
            `,
            $run: "echo 'Random points for this example!'",
            score: 40,
            customGrader: async ({ logs, testCase, testSuite }) => {

                // values are dynamically available here through the testCase prop:
                const score = Math.floor((testCase.score ?? 0) * 0.5);

                // New log entries can be added within the custom grader, and will be included in the final report. This allows for providing detailed feedback to students.
                logs.push({
                    command: "Custom grader",
                    stdout: `Awarded ${score} points based on custom grading logic.`
                });

                return { score };
            }
        }, {
            name: "Failing test due to timeout",
            description: "This test is designed to time out to demonstrate timeout handling.",
            $run: `
                echo 'This test will time out...'
                sleep 2
                echo '...this will not be seen in the output'
            `,
            score: 45,
            timeout: { seconds: 1 }
        }, {
            name: "UTF-8 encoding test",
            description: "This test checks that UTF-8 encoding is working correctly by outputting special characters. This can be important for ensuring that test outputs are correctly encoded and displayed, especially when dealing with internationalization or special symbols.",
            $setup: "cat demo/utf8.sh",
            $run: "./demo/utf8.sh",
            contains: ["Hello, world! 👋🌍", "å, ä, ö, €"],
            score: 50
        }
    ]
});
