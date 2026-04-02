# Cursor Task Template

Use this template for every implementation, refactor, bug fix, review, or test task in this project.

---

## Base Template

```text
Context:
@docs/spec-phase1.md
@<relevant files or folders>

Task:
<Describe one concrete task only>

Goal:
<What should be true after this task is complete?>

Constraints:
- Follow the rules in .cursor/rules/realtime-candle.mdc
- Do not broaden scope beyond this task
- Do not run git commit or git push
- Keep changes minimal and focused
- Prefer TypeScript
- Keep high-frequency tick data out of React state
- Use queue/ref + requestAnimationFrame where relevant
- Keep chart code client-only and SSR-safe where relevant

Implementation Rules:
- If the task is non-trivial, first propose a short plan before coding
- If something is ambiguous, state assumptions clearly
- Reuse existing files and patterns when possible
- Avoid unnecessary refactors
- Add brief comments only where logic is genuinely non-obvious

Output:
1. Summary of what changed
2. Files changed
3. Key implementation decisions
4. Risks or assumptions
5. Exact review points for me
6. Suggested conventional commit message

Verification:
- Explain how to verify the result
- Provide test commands if relevant
- Mention edge cases worth checking
```

---

## Feature Task Template

```text
Context:
@docs/spec-phase1.md
@<relevant files>

Task:
Implement <feature name>.

Goal:
Deliver a working implementation for this feature only.

Constraints:
- Do not change unrelated files
- Do not commit or push
- Keep API and types explicit
- Prefer small composable functions

Output:
1. Implement the feature
2. Explain changed files
3. Explain what I should review manually
4. Suggest a commit message
5. Suggest the next logical task
```

---

## Refactor Task Template

```text
Context:
@docs/spec-phase1.md
@<relevant files>

Task:
Refactor <target area> for <reason>.

Goal:
Improve structure/readability/performance without changing external behavior.

Constraints:
- No behavioral changes unless explicitly required
- Preserve existing public API unless necessary
- Keep diff small
- Do not commit or push

Output:
1. What was refactored
2. Why it is better
3. Any behavior risks
4. What I should regression test
5. Suggested commit message
```

---

## Bug Fix Template

```text
Context:
@docs/spec-phase1.md
@<relevant files>
@<error logs or screenshots if available>

Task:
Fix <bug description>.

Goal:
Resolve the bug with the smallest safe change.

Constraints:
- Identify root cause first
- Do not rewrite unrelated parts
- Do not commit or push
- Preserve intended behavior elsewhere

Output:
1. Root cause
2. Fix applied
3. Files changed
4. How to reproduce before/after
5. What I should verify
6. Suggested commit message
```

---

## Review Template

```text
Context:
@docs/spec-phase1.md
@<relevant files or branch>

Task:
Review this task against the project spec.

Focus on:
- Architecture correctness
- requestAnimationFrame / queue correctness
- SSR safety
- React re-render risks
- OHLC aggregation correctness
- Type safety
- Unnecessary complexity

Constraints:
- Do not rewrite everything
- Prefer minimal fixes
- Rank issues by severity
- Do not commit or push

Output:
1. Critical issues
2. Important issues
3. Minor issues
4. Suggested fixes
5. Whether this is ready for approval
```

---

## Test Task Template

```text
Context:
@docs/spec-phase1.md
@<relevant files>

Task:
Add or improve tests for <target>.

Goal:
Cover critical behavior and edge cases for this task.

Constraints:
- Test real behavior, not implementation trivia
- Prefer readable tests
- Do not commit or push

Output:
1. Tests added/updated
2. Behaviors covered
3. Edge cases covered
4. Remaining gaps
5. Suggested commit message
```

---

## Planning Template

Use this before implementation for medium or large tasks.

```text
Context:
@docs/spec-phase1.md
@<relevant files or folders>

Task:
Plan the implementation for <task>.

Goal:
Create a safe implementation plan before coding.

Constraints:
- No code changes yet
- Break work into small steps
- Mention touched files
- Call out risky areas
- Keep it concise

Output:
1. Short implementation plan
2. Files likely to change
3. Risks / assumptions
4. Recommended first step
```

---

## Recommended Usage Rules

- One prompt = one task.
- Attach only the files that matter.
- If you know the exact file, use `@file`; if not, let the agent search the codebase. [web:70][web:132]
- For large tasks, ask for a plan first, then implementation. [web:122]
- Start a new chat when switching to a very different task to avoid context drift. [web:131]
- Ask Cursor to stop before commit and give you review points.
- After your review, run commit/push yourself or via your approval script.

---

## Example 1 — GBM Generator

```text
Context:
@docs/spec-phase1.md
@lib/types/market.ts

Task:
Implement a GBM-based mock tick generator in TypeScript.

Goal:
Generate realistic next prices from a previous price and expose a reusable producer-friendly API.

Constraints:
- No React code
- Separate pure price generation from interval-based producer
- Do not commit or push
- Keep the file focused

Output:
1. Summary of what changed
2. Files changed
3. Key implementation decisions
4. Risks or assumptions
5. Exact review points for me
6. Suggested conventional commit message

Verification:
- Show how to call the pure function
- Show how to test multiple generated ticks
- Mention edge cases such as negative or zero input price
```

---

## Example 2 — Chart Component

```text
Context:
@docs/spec-phase1.md
@lib/mock/aggregate.ts
@lib/types/market.ts

Task:
Create a client-only candle chart component using lightweight-charts.

Goal:
Render initial candles and support live candle updates safely in Next.js.

Constraints:
- SSR-safe
- useRef for chart and series
- create once on mount
- cleanup on unmount
- Do not commit or push

Output:
1. Summary of what changed
2. Files changed
3. Key implementation decisions
4. Risks or assumptions
5. Exact review points for me
6. Suggested conventional commit message

Verification:
- Explain how to mount the component in a Next.js page
- Explain what to check for hydration and resize safety
```
