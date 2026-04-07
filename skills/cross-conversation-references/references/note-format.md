# Note Format Specification

This is the canonical schema for `.claude-notes/` files. Follow it exactly when writing any note.

---

## File Naming

```
.claude-notes/YYYY-MM-DD-<topic-slug>.md
```

Rules:
- `YYYY-MM-DD` — the date the note is **first created** (do not update this when appending).
- `<topic-slug>` — the conversation topic in lowercase, spaces and punctuation replaced with hyphens, max 40 characters.
- If a file for the same date and topic already exists, append `-2`, `-3`, etc. to the slug.

Examples:
```
.claude-notes/2026-04-07-api-auth-design.md
.claude-notes/2026-04-07-database-schema-refactor.md
.claude-notes/2026-03-28-onboarding-flow-redesign-2.md
```

---

## YAML Frontmatter

Every note starts with YAML frontmatter delimited by `---`.

```yaml
---
date: 2026-04-07
topic: API Auth Design
tags: [api, auth, backend]
session_summary: "Decided on JWT with refresh token rotation strategy."
references:
  - "2026-04-05-backend-architecture.md"
referenced_by: []
---
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `date` | Yes | ISO date (`YYYY-MM-DD`) of the session |
| `topic` | Yes | Human-readable topic title (not a slug) |
| `tags` | Yes | Flat list of lowercase single-word tags; at least one |
| `session_summary` | Yes | One sentence capturing the session's main outcome |
| `references` | No | List of filenames (not paths) of related notes in `.claude-notes/` |
| `referenced_by` | No | Other notes that link to this one; auto-populated when another note references this file |

---

## Body Structure

After the frontmatter, include these sections in order:

```markdown
## Context

[2–4 sentences. What problem or question brought this session into existence?
What prior state existed before the session began?]

## Key Decisions

- [Decision 1 — include the rationale, not just the outcome]
- [Decision 2]

## Outcomes

[What was produced, resolved, or changed? Code written, configs updated, conclusions reached.]

## Open Questions

- [Things left unresolved that the next session should pick up]

## Next Steps

- [Concrete action items with enough context to be actionable without re-reading the conversation]
```

`Open Questions` and `Next Steps` may be omitted entirely if there is nothing to record. All other sections are required.

---

## Full Example

```markdown
---
date: 2026-04-07
topic: API Auth Design
tags: [api, auth, jwt, backend]
session_summary: "Decided on JWT with RS256 signing and refresh token rotation."
references:
  - "2026-04-05-backend-architecture.md"
referenced_by: []
---

## Context

We needed to choose an authentication strategy for the REST API before starting
the user service implementation. The backend architecture session (April 5) had
left auth as an open question. The main candidates were session cookies, opaque
tokens, and JWTs.

## Key Decisions

- Use JWT with RS256 (asymmetric) signing — allows microservices to verify tokens
  without sharing a secret, which matters once we split auth and user services.
- Access tokens expire in 15 minutes; refresh tokens expire in 30 days.
- Refresh token rotation: each use of a refresh token invalidates the old one and
  issues a new one. Detected reuse triggers a full revocation (family invalidation).
- Store refresh tokens in an `auth_tokens` table (not in-memory) so they survive
  server restarts and support revocation.

## Outcomes

- Agreed on the token strategy documented above.
- Created `docs/auth-design.md` with the full specification.
- Updated the API design doc to reflect JWT bearer tokens on all protected routes.

## Open Questions

- Do we need token introspection for third-party integrations? Deferred until we
  have a concrete integration request.
- Redis for refresh token caching — evaluate when load testing reveals a need.

## Next Steps

- Implement `POST /auth/token` and `POST /auth/refresh` endpoints (see auth-design.md).
- Add JWT middleware to the Express router before starting the user routes.
- Write integration tests for the rotation + revocation flow.
```

---

## Search Hints

The frontmatter structure enables reliable grep-based search:

```bash
# Find all notes tagged with "api"
grep -rl "api" .claude-notes/

# Find notes where "api" appears in the tags field specifically
grep -rl "tags:.*api" .claude-notes/

# Full-text keyword search across all notes
grep -rn "JWT" .claude-notes/

# List all notes sorted by date (newest first)
ls -t .claude-notes/*.md

# Find notes that reference a specific file
grep -rl "2026-04-05-backend-architecture" .claude-notes/
```
