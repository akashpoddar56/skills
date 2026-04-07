---
name: cross-conversation-references
description: Save and load notes between Claude Code sessions so context persists across conversations. Use this skill whenever you need to remember what happened in a previous session, pick up where a conversation left off, link related conversations, or build a shared memory log for a project. Trigger on phrases like "save this session", "what did we discuss last time", "continue from where we left off", "create a note about this conversation", "search my notes for X", "cross-reference this with the API session", or any request to preserve or recall conversation context across sessions.
---

## Overview

Each Claude Code session starts fresh with no memory of previous conversations. This skill bridges that gap by writing structured, human-readable notes to a `.claude-notes/` folder at the project root. Notes are git-tracked markdown files, so they persist across machines, survive new sessions, and are readable by teammates.

Claude is the author — not a passive logger. Notes capture decisions, context, open questions, and cross-references so any future session can pick up with full context.

---

## Directory Convention

All notes live in `.claude-notes/` relative to the project root.

- Create the directory automatically if it does not exist — do not ask the user.
- By default, commit notes alongside code so teammates benefit from the shared memory.
- If the user explicitly wants private notes, add `.claude-notes/` to `.gitignore` instead of staging files.

---

## Core Operations

Choose the operation that matches the user's intent:

### save — Write a note for the current conversation

1. Infer the topic from the conversation or ask the user to confirm if ambiguous.
2. Derive a filename: `YYYY-MM-DD-<topic-slug>.md` where the slug is lowercase with hyphens, max 40 characters.
3. Create `.claude-notes/` if it does not exist.
4. Check whether a file with that name already exists. If it does, pause and offer three options:
   - **Append**: Add a `## Session Update: <timestamp>` section to the existing file.
   - **Version**: Create `YYYY-MM-DD-<topic-slug>-2.md` (incrementing the suffix).
   - **Overwrite**: Replace the file after explicit confirmation.
5. Write the note following the schema in `references/note-format.md`. Read that file before writing.
6. After saving, suggest: `git add .claude-notes/<filename> && git commit -m "notes: save <topic> session (<date>)"`

### read — Load context from previous notes

1. List all files in `.claude-notes/`. If the directory is missing or empty, report that and offer to start the log.
2. Show a summary table: filename | topic | date | one-line session_summary (drawn from frontmatter only — no full body reads yet).
3. Ask which notes to load fully, or if the user says "catch me up", automatically load the 3 most recent notes by filename date.
4. Read the full body of selected notes and summarize key decisions, open questions, and next steps.

### reference — Link two conversations

When saving the current note, populate the `references:` field with the filenames of related notes.

Optionally update the referenced note to add a `referenced_by:` field pointing back to the current note (bidirectional linking). Ask the user whether they want the back-reference before modifying an existing file.

To find the note to reference: search `.claude-notes/` by date pattern (`*2026-04-05*`) or topic keyword. Prompt the user if the match is ambiguous.

### search — Find notes by tag or keyword

1. Accept a tag name (e.g., `api`) or a freeform keyword from the user.
2. Search `.claude-notes/` for matches in both frontmatter and body.
3. Return matching filenames with the matching line for context.
4. Offer to read any matching note in full.

Useful grep patterns:
```bash
# Search by tag
grep -rl "api" .claude-notes/

# Search in frontmatter tags specifically
grep -rl "tags:.*api" .claude-notes/

# Full-text keyword search
grep -rn "JWT" .claude-notes/
```

---

## File Format

The note schema is defined in `references/note-format.md`. Read it every time you write a note — it contains the required YAML frontmatter fields, required body sections, and a full example.

In brief: notes use YAML frontmatter (date, topic, tags, session_summary, references, referenced_by) followed by five markdown sections (Context, Key Decisions, Outcomes, Open Questions, Next Steps).

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No `.claude-notes/` directory | Create it silently; proceed |
| `read` or `search` with no notes present | Report "no notes yet"; offer to save the current session |
| Conflicting filename (same date + topic) | Pause; offer append / version / overwrite |
| Topic contains special characters or spaces | Sanitize to lowercase hyphen-slug, max 40 chars; show user the derived filename before writing |
| User says "catch me up" | Read 3 most recent notes by filename date; summarize decisions and open questions |
| User says "link to the April 5 session" | Search for `*2026-04-05*` in `.claude-notes/`; prompt if ambiguous |
| Existing note is missing frontmatter | Parse body only; warn the user; offer to add frontmatter retroactively |
| User wants notes to stay private | Add `.claude-notes/` to `.gitignore` instead of staging |

---

## Git Integration

After saving a note, suggest committing it:

```bash
git add .claude-notes/<filename>
git commit -m "notes: save <topic> session (<date>)"
```

This keeps conversation memory traceable in git history alongside the code it describes. Notes committed to the repo are visible to all collaborators — a shared project memory.
