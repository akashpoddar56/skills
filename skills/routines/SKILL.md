---
name: routines
description: "Help users create, manage, and run named routines — reusable sequences of Claude tasks and shell commands triggered with /routines. TRIGGER when: user invokes /routines, asks to create/save/run a routine, or wants to define a repeatable workflow. DO NOT TRIGGER when: user wants a one-time task, asks about cron jobs, or asks about OS-level scheduling."
---

# Routines

Routines are named, reusable sequences of tasks you define once and run repeatedly with `/routines run <name>`. They are stored in `.claude/routines.json` in your project directory.

## Commands

| Command | Description |
|---|---|
| `/routines` | List all defined routines |
| `/routines run <name>` | Execute a named routine |
| `/routines add <name>` | Define a new routine |
| `/routines edit <name>` | Edit an existing routine |
| `/routines delete <name>` | Remove a routine |
| `/routines show <name>` | Show the steps of a routine |

## How Routines Work

Each routine is a named list of steps. When you run a routine, Claude executes each step in sequence:

- **shell steps** — Run a shell command and report the output (e.g., `npm test`)
- **prompt steps** — Perform a described task (e.g., "Summarize recent git commits")

## Storage Format

Routines are stored in `.claude/routines.json`:

```json
{
  "routines": {
    "morning-standup": {
      "description": "Prepare daily standup notes",
      "steps": [
        { "type": "shell", "command": "git log --since='1 day ago' --oneline --all" },
        { "type": "prompt", "task": "Summarize what was completed yesterday based on the git log" },
        { "type": "prompt", "task": "List any open PRs or blockers worth mentioning" }
      ]
    }
  }
}
```

## Creating a Routine

When the user says "create a routine", "add a routine named X", or runs `/routines add <name>`:

1. Ask what steps the routine should perform (if not already specified)
2. Create or update `.claude/routines.json` with the new routine
3. Confirm the routine is saved and show how to run it

**Example — creating a `code-review` routine:**

User: "Create a routine called code-review that runs tests, checks for security issues, and verifies docs are updated"

Write `.claude/routines.json`:
```json
{
  "routines": {
    "code-review": {
      "description": "Perform a thorough code review checklist",
      "steps": [
        { "type": "shell", "command": "npm test" },
        { "type": "prompt", "task": "Review the staged changes for security vulnerabilities (XSS, injection, auth issues)" },
        { "type": "prompt", "task": "Check that documentation reflects the changes" },
        { "type": "prompt", "task": "Verify code style and formatting consistency" }
      ]
    }
  }
}
```

Then confirm: "Routine `code-review` saved. Run it with `/routines run code-review`."

## Running a Routine

When the user runs `/routines run <name>`:

1. Read `.claude/routines.json`
2. Find the named routine (report clearly if it doesn't exist)
3. Execute each step in order:
   - **shell**: run the command with the Bash tool, show output
   - **prompt**: perform the described task and show results
4. After all steps complete, provide a brief summary

**Example output for `morning-standup`:**
```
Running routine: morning-standup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1/3 [shell]: git log --since='1 day ago' --oneline --all
abc1234 Fix login redirect bug
def5678 Add unit tests for auth module

Step 2/3 [prompt]: Summarize completed work...
Yesterday: fixed a login redirect issue and added auth unit tests.

Step 3/3 [prompt]: Check open PRs...
No open PRs found.

✓ Routine complete (3 steps)
```

## Listing Routines

When the user runs `/routines` or `/routines list`:

1. Read `.claude/routines.json`
2. Display all routine names and descriptions in a table
3. If the file doesn't exist, say: "No routines defined yet. Create one with `/routines add <name>`."

## Editing a Routine

When the user runs `/routines edit <name>`:

1. Read the current routine steps from `.claude/routines.json`
2. Show the existing steps and ask what to change
3. Apply the changes and save the file

## Deleting a Routine

When the user runs `/routines delete <name>`:

1. Confirm the deletion with the user before proceeding
2. Remove the routine from `.claude/routines.json` and save

## Error Cases

| Situation | Response |
|---|---|
| `.claude/routines.json` missing on `/routines` | "No routines defined yet. Create one with `/routines add <name>`." |
| `/routines run <name>` but name not found | "Routine '<name>' not found. Available routines: [list]. Create it with `/routines add <name>`." |
| Shell step fails | Report the error, ask the user whether to continue or abort the remaining steps |
| Malformed `.claude/routines.json` | Report the parse error and show the file path so the user can fix it |

## Tips

- Routines are per-project — stored in `.claude/routines.json` alongside `.claude/settings.json`
- Commit `.claude/routines.json` to share routines with your team
- Combine shell commands and Claude prompts for powerful, reproducible workflows
- Use descriptive names: `pre-deploy`, `weekly-cleanup`, `onboard-feature`, `release-checklist`
- For recurring scheduled execution, pair routines with the `/loop` skill
