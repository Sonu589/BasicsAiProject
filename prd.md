# BriefGuard — Product requirements

## 1. Product summary

BriefGuard is a local-first, browser-based checklist and evidence viewer for comparing an original request with an AI-generated output. It turns likely omissions into a targeted repair prompt.

## 2. User problem

Users need a lightweight way to check explicit constraints without reading long prompts repeatedly or accepting an AI response just because it sounds confident.

## 3. Personas

- **Student / job seeker:** needs a quick check that an assignment draft, cover letter, or CV rewrite follows the supplied instructions.
- **Freelancer / professional:** needs to confirm a draft contains requested sections, constraints, quantities, or deliverables before sharing it.
- **Everyday AI user:** wants a clear list of what appears satisfied and what needs another pass.

## 4. Core user journey

1. Open the app, immediately see a preloaded example, and understand its purpose.
2. Paste or edit the original brief and the generated result.
3. Build or edit the requirement checklist.
4. Run the audit.
5. Review each status, explanation, and evidence excerpt.
6. Copy the repair prompt or download the Markdown report.

## 5. Functional requirements

### FR-1: Input capture
- Provide clearly labeled fields for the original brief and output.
- Allow arbitrary text and show character counts.
- Provide clear actions to clear each field and reset the example.

### FR-2: Requirement checklist
- Identify supported patterns for dietary keywords, currency limit, serving count, time constraint, and shopping list.
- Provide a generic fallback rather than silently claiming full understanding.
- Allow the user to edit checklist labels and add free-form requirements.

### FR-3: Audit evaluation
- Evaluate each requirement against the pasted result.
- Use the following statuses:
  - **Met:** a configured signal or explicit statement was found.
  - **Contradicted:** a direct conflicting statement was found.
  - **Missing:** the expected signal was not found.
  - **Needs review:** the text is ambiguous or insufficient for a reliable text-only judgment.
- Show the supporting excerpt or explain that no matching excerpt was found.
- Refresh summary metrics after each audit.

### FR-4: Repair prompt
- Generate a prompt listing requirements that were not marked Met.
- Mention satisfied requirements when available so the follow-up can preserve them.
- Tell the next AI not to invent unverifiable details.
- Allow manual edits and copying.

### FR-5: Export
- Download a Markdown file containing the brief, output, statuses, findings, evidence, repair prompt, and a limitations note.

### FR-6: Privacy and reliability
- Work without an external API key.
- Do not transmit user text to a backend or analytics service.
- Display a limitations note distinguishing text matching from truth verification.

## 6. Non-functional requirements

- Responsive desktop and mobile layouts.
- Keyboard focus indication and accessible names for input controls.
- No login gate or setup step for judges.
- No runtime dependency installation required after downloading Node.js.
- Clear empty-input feedback and predictable output.

## 7. Acceptance criteria

- The preloaded example shows three textual matches and two issues with evidence.
- Re-running the audit reflects edits to the output text.
- Clearing either field results in a clear user-facing prompt, not a crash.
- Editing checklist lines affects the next audit.
- The repair prompt updates with each audit.
- Copy and export actions give a success/error message.
- A new visitor can locate the limitations and privacy disclosures.

## 8. Known limitations

This version relies on explicit patterns and phrase matching. It cannot verify facts, infer all implicit requirements, validate completeness, or evaluate context reliably. Generic checks can be false positives/negatives. The UI should encourage manual review rather than output a global “AI quality” score.
