import { runSuite } from "../src/runner.js";

runSuite({

    defaults: {
        timeout: {
            seconds: 5,
        },
        points: 1
    },

    // The lifecycle hooks can be either single operations or arrays.
    // Both JavaScript functions and shell commands are supported.
    // Also, beforeEach and afterAll/afterEach hooks are also supported.
    beforeAll: [
        {
            name: "Setup using shell command(s)",
            $run: [
                "echo 'Setting up test environment...'",
                "echo 'This is the beforeAll hook!'"
            ]
        },
        () => {
            console.log("Setup using a JavaScript function");
        }
    ],

    // Each test case must have a name and a description. Points, timeouts and setup commands are optional.
    // If no `contains` or `notContains` fields are provided, the test will pass if the command(s) run without error.
    tests: [
        {
            name: "Simple Hello World",
            description: "Runs the hello world script and checks its output.",
            $run: "echo 'Hello world!'",
            contains: "Hello world!",
            points: 10
        }, {
            name: "Bash Hello World",
            description: "Runs two scripts and checks that two separate strings are present in the output.",
            $run: [
                "echo 'Hello world!' > hello.tmp",
                "cat hello.tmp"
            ],
            contains: ["Hello", "world!"],
            points: 20
        }, {
            name: "Running Node.js scripts",
            description: "Runs a JavaScript file and checks its output.",
            $run: "node demo/hello.js",
            contains: "Hello from JavaScript!",
            points: 30
        }, {
            name: "Compiling and running Java code",
            description: "Tests can have setup commands that run before the test command. In this case, we compile a Java file before running it.",
            $setup: "javac demo/Hello.java",
            $run: "java -cp demo Hello",
            contains: "Hello from Java!",
            points: 40
        }, {
            name: "Running Python scripts",
            description: "Runs a Python file and checks its output. Also outputs the Python version for debugging purposes.",
            $run: [
                "python3 --version",
                "python3 demo/hello.py"
            ],
            contains: "Hello from Python!",
            points: 50
        }, {
            name: "Running Docker containers",
            description: "Builds and runs a Docker image, then checks the output. This test has a longer timeout since pulling and building images can take some time.",
            $run: [
                "docker build --file=demo/hello.Dockerfile --tag=hello demo",
                "docker run --rm hello"
            ],
            contains: "Hello from Docker!",
            points: 60,
            timeout: { minutes: 1 }
        }
    ]
});
