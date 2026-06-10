import { runSuite } from "@ohjelmistokehitys/autograder";

runSuite({
    name: "Test suite template",
    description: "You can use this template to build your own tests for your assignments.",
    defaultScore: 10,
    defaultTimeout: { seconds: 5 },
    tests: [
        {
            name: "Test case 1",
            description: "This test case runs a simple command and checks its output.",
            $run: "echo 'Hello world!'",
            contains: ["Hello", "world"],
        }
    ]
});
