---
name: create-autograder-test-specifications
description: Create and update JSON test suites for the ohjelmistokehitys/autograder project.
---

# Create autograder test specifications

Use this skill when asked to create or edit a JSON test suite consumed by the
`ohjelmistokehitys/autograder` project.

## Workflow

1. Clarify the assignment behavior and expected submission environment from
   the user's request. Prefer observable, deterministic checks.
2. Create a JSON file with a suite `name`, `description`, and `tests` array.
3. Give each test a clear `name`, a useful `description`, and a `run` command.
   Add only the optional fields needed for that test.
4. Ensure the file is valid JSON and that commands work on Linux with Bash.
5. When practical, validate the suite by running the autograder against it or
   checking it with `JSON.parse`/a JSON linter. Do not execute potentially
   destructive commands without user approval.

## Supported format

The suite has this shape:

```json
{
  "name": "Assignment checks",
  "description": "Checks the required assignment behavior.",
  "tests": [
    {
      "name": "Prints a greeting",
      "description": "Checks that the program prints the expected greeting.",
      "score": 10,
      "run": "echo \"Hello\"",
      "contains": ["Hello"],
      "notContains": ["Error"],
      "regex": ["^hello"],
      "timeout": "10s"
    }
  ]
}
```

Required suite fields: `name`, `description`, and `tests`. Each test requires
`name`, `description`, and `run`. `run` may be a command string or an array of
command strings. The following test fields are also supported:

| Field | Type | Meaning |
| --- | --- | --- |
| `input` | string | Text sent to standard input for each command in the test. |
| `setup` | string or string array | Commands run before `run`. |
| `teardown` | string or string array | Commands run after `run`, if execution reaches them. |
| `score` | number | Points assigned to this test. |
| `timeout` | number or duration string | Per-command timeout; defaults to `15s`. Examples: `60`, `"60s"`, `"1m"`. |
| `contains` | string array | Every listed string must occur in the combined command output. |
| `notContains` | string array | None of the listed strings may occur in the combined command output. |
| `regex` | string array | Every listed JavaScript regular expression must match the combined output. |
| `skipRemainingOnFailure` | boolean | Skip later tests when this test fails. |

## Behavior and authoring guidance

- Commands in `setup`, `run`, and `teardown` execute in that order. Arrays run
  sequentially. A command failure stops the rest of that test, so teardown is
  not guaranteed after a failure.
- Each command runs through Bash on Linux. Keep commands portable in that
  environment and avoid relying on shell state persisting between commands.
- Output from all executed commands is combined for assertions. Matching is
  case-insensitive: both string checks and regular expressions use lowercased
  output. Write regex patterns accordingly and escape backslashes for JSON
  (for example, `"\\d+"`).
- `contains`, `notContains`, and `regex` are independent checks; all their
  entries must pass. A command that exits unsuccessfully fails the test even if
  output assertions pass.
- The timeout applies to each command, not the whole test. Keep commands
  bounded and choose a timeout that allows normal execution without letting
  a hung test run indefinitely.
- Make tests independent and avoid modifying or deleting submitted files.
  If a test creates temporary artifacts, use unique names and clean them up in
  teardown while accounting for teardown not running after earlier failures.
- Use `skipRemainingOnFailure` only when later tests depend on an earlier
  prerequisite. Keep scoring proportional to the importance of the behavior.
- Do not add unsupported fields, comments, or trailing commas to the JSON.

For authoritative type definitions and execution behavior, consult the
`ohjelmistokehitys/autograder` repository.
