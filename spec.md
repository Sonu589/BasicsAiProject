# BriefGuard — Technical specification (starter draft)

> **Competition workflow note:** This draft is not skill-generated. Run `4-spec` in the official Devpost Learn Skill Pack and replace or reconcile this file before submission.

## Architecture

- **Platform:** browser-based web app served locally by Node.js.
- **Frontend:** semantic HTML, CSS, and vanilla JavaScript; no framework or build step.
- **Server:** `server.mjs`, a small Node HTTP server that serves static files. It has no API endpoints.
- **Data:** current brief and output exist in page memory. The app does not persist data to a server or browser storage.
- **External services:** none required. Google Fonts is referenced for typography; the system font stack is the fallback if offline.

## Data flow

1. User edits `briefInput` and `outputInput`.
2. `parseRequirements(brief)` extracts the supported explicit constraints, or generates generic candidates.
3. `analyseRequirement(requirement, brief, output)` evaluates each configured requirement with a deterministic rule.
4. `renderResults(results)` updates status rows, metrics, and the audit state.
5. `updateRepairPrompt(results)` builds a follow-up prompt from every result not marked Met.
6. `buildReport()` serializes text and findings to Markdown; `exportReport()` creates a local downloadable file.

## Status model

| Internal status | Meaning | UI label |
|---|---|---|
| `met` | A rule found the expected phrase/value | Met |
| `contradicted` | A direct conflicting statement/value was found | Contradicted |
| `missing` | No expected phrase was detected | Missing / No match |
| `review` | Text is empty, ambiguous, or not suitable for a confident rule result | Needs review / Partial match |

Status labels describe the operation of the checker, not the truth of the underlying world claim.

## Supported initial rules

- `vegetarian`: checks for explicit vegetarian/vegan language and a small list of obvious meat terms.
- `budget`: compares detected currency amounts against the parsed maximum.
- `servings`: looks for explicit multi-person and single-person phrases.
- `prep`: scans for minute-based mentions and compares them with a maximum duration.
- `shopping`: looks for a shopping-list or grocery-list phrase.
- `generic`: checks configurable signal phrases and reports a text match or lack of match.

## UI modules

- Sidebar navigation for workspace, process explanation, and trust/limitations.
- Brief and output inputs, character counts, clear/reset actions.
- Requirement summary metrics and evidence rows.
- Checklist editor.
- Repair prompt text area and copy action.
- Markdown export action and toast feedback.

## Commands

```bash
npm start
# Open http://localhost:4173
```

No `npm install` is required. Node.js 18+ is the declared runtime.

## Security and privacy

- Request paths are normalized and resolved under the project directory before serving files.
- Response includes `X-Content-Type-Options: nosniff`.
- No credentials, API keys, database, analytics, or external model request are used.
- Avoid collecting or logging pasted text; the server only serves static files.

## Manual test checklist

- [ ] Load `/` and confirm the sample fields and initial audit render.
- [ ] Click Run audit and verify expected sample results.
- [ ] Edit the output to remove “one person” and use times under 20 minutes; verify the serving and prep statuses change to Needs review or Met according to visible evidence.
- [ ] Clear the output and click Run audit; confirm validation feedback.
- [ ] Edit the checklist and apply it; verify results update.
- [ ] Copy the repair prompt in a supported local browser context.
- [ ] Export and inspect `briefguard-audit-report.md`.
- [ ] Test at narrow viewport width and keyboard navigation.
- [ ] Test from a fresh checkout before public submission.

## Technical limitations / future work

- Replace heuristics with transparent structured evaluations only after deciding how to avoid false certainty.
- Add unit tests around number/currency parsing and contradictory language.
- Add semantic requirement extraction only if it can run with a disclosed model and a reliable fallback.
- Add optional evidence provenance or external verification in a later phase, not in this PoC.
