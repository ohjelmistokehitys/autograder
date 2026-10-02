# Autograder

This repository contains an automated grading system for evaluating programming assignments.

It is intended to run submitted solutions against predefined tests, check their results, and provide consistent feedback on correctness. Automating these checks helps instructors and reviewers grade submissions efficiently and fairly.

## System Requirements

The autograder is implemented in Node.js and only supports Linux based operating systems. Behind the scenes, it uses [zx](https://github.com/google/zx) to run shell commands with bash. The autograder is designed to be run in a GitHub Actions workflow, but it can also be run locally.

## Examples

See the [exampleSuite.json](./exampleSuite.json) file for an example of how to define a test suite for the autograder.

See the actions tab and the following workflows for an example of how the autograder runs in a GitHub Actions:


```yml
name: Autograding

on:
  push:

permissions:
  contents: read
  statuses: write

jobs:
  grade:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v7

      - name: Run the example suite using autograder
        uses: ohjelmistokehitys/autograder@v0
        timeout-minutes: 1
        with:
          test_suite: ./exampleSuite.json
```

To experiment with the autograder locally, you can run the following command:

```bash
npx git://github.com/ohjelmistokehitys/autograder#v0 exampleSuite.json
```
