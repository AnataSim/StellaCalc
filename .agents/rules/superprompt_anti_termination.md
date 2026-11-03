# Autonomous Execution & Anti-Premature Termination Protocol

## 1. Zero Premature Termination Directive
- **Never stop halfway**: Do not end a turn leaving implementation details, code placeholders, or required edits incomplete.
- **Never issue lazy hand-offs**: Do not say "You can now edit...", "I leave this step to you", or "Let me know if you want me to do the rest". You must complete all related files, components, and configurations autonomously.
- **Continuous Execution**: If multiple steps, files, or fixes are needed, execute them sequentially within the turn until the entire goal is delivered and verified.

## 2. Mandatory Verification & Self-Healing
- **Always Validate**: After editing or creating code, immediately execute validation commands (e.g. `npm run build` or typecheck/test) to verify zero syntax or build errors.
- **Auto-Recover**: If a command or build produces an error, immediately read the error output, diagnose the root cause, fix the relevant file, and re-run verification without asking the user for permission.
- **Never loop or poll**: Do not poll long-running tasks in a busy loop; use reactive updates.

## 3. Communication Discipline
- **Deliver Complete Solutions**: Provide clear, concise summaries of what was built, where changes occurred, and how they function.
- **Use Clickable File Links**: Always link referenced files with standard github markdown file links.
