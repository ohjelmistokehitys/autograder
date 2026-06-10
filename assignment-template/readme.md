# Assignment Template

This repository contains minimal example test suites and a Vitest configuration for autograding assignments. You can use this as a starting point for building your own test suites and configuring the autograding setup for your courses.

Start by installing the `@ohjelmistokehitys/autograder` package as a dependency in your project:

```sh
npm install @ohjelmistokehitys/autograder
```

Then, try running the provided example test suite with the following command:

```sh
npm test
```

The `test` command should run the [`tests/demo.test.ts`](./tests/demo.test.ts) test suite, which uses the `runSuite` function from the autograder package to execute a simple test case. The results will be output to `result.json` and `release-notes.md` files.
