# BriefGuard — Scope

## Problem

AI-generated work can look polished while still omitting an explicit instruction from the original brief. Users often have to reread both texts manually and then invent a follow-up prompt to repair the result.

## Target user

People who use AI to create everyday work—students, job seekers, freelancers, educators, and professionals—who need to check a result against a known request without relying on a vague overall quality score.

## Product promise

Make the gap between a request and an AI-generated result visible, explain each finding with a text excerpt, and generate a focused repair prompt.

## In scope for this proof of concept

1. Accept an original brief and an AI-generated result as pasted text.
2. Extract candidate requirements for a small set of explicit constraint patterns and support a generic text-match fallback.
3. Let the user edit the checklist before rerunning the audit.
4. Label findings as Met, Missing, Contradicted, or Needs review.
5. Show a supporting excerpt or explain when no evidence was found.
6. Generate a repair prompt that focuses on gaps and asks the model to preserve requirements that already look satisfied.
7. Copy the repair prompt and export a Markdown audit report.
8. Work without an account, paid API, or backend service.

## Out of scope

- Claims of semantic understanding or guaranteed correctness.
- Web fact-checking, authoritative citations, or external price/recipe verification.
- Medical, legal, financial, or other high-stakes assurance.
- Authentication, accounts, shared workspaces, team approval, billing, or audit history sync.
- Browser extensions and direct integration with third-party AI chat products.
- Full model-based natural-language extraction in this first version.

## Success criteria

- A first-time visitor can understand the purpose from the first screen.
- The included sample can be audited end to end in under one minute.
- The sample shows at least one supported requirement and at least one explicit contradiction with evidence.
- A user can edit a requirement, rerun the audit, copy a repair prompt, and export a report.
- The interface communicates that textual matches are not factual verification.
- The app starts locally without credentials or third-party API keys.

## Main risks and mitigations

- **False confidence:** use conservative statuses and evidence excerpts; state limitations in the UI.
- **Weak extraction on arbitrary prompts:** allow checklist editing and identify generic checks as text matches.
- **Judge cannot try it quickly:** preload a deterministic example; no login required.
- **Skill-pack compliance risk:** run the official pack, keep its generated planning docs, and accurately disclose the actual workflow.
