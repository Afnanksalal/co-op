# Release Notes

## 1.0.1 - 2026-06-21

This release focuses on making Co-Op Desktop feel clearer and more trustworthy while business work is running.

### Highlights

- Added live chat progress feedback for request understanding, company context, file checks, memory lookup, source search, review, and local save steps.
- Replaced the silent chat waiting state with an inline work panel that shows safe operational progress without exposing hidden chain-of-thought, raw prompts, provider keys, or full retrieved content.
- Improved competitor research by planning multiple focused searches from company profile, offering, buyer, and region context before summarizing results.
- Tightened chat review behavior so extra review adds only material missing concerns instead of repeating the same answer.
- Kept the desktop chat code modular by splitting session navigation, header controls, message bubbles, composer, empty state, and progress feedback into focused components.
- Documented the chat progress contract, source-planning behavior, and release smoke tests.

### Verification

- Passed backend tests, backend build, and backend npm audit.
- Passed frontend typecheck, hosted build, frontend npm audit, Rust audit, Rust tests, and Rust clippy with warnings denied.
- Built the Windows NSIS and MSI installers for Co-Op Desktop 1.0.1.
- Desktop smoke testing should confirm activation, onboarding, chat progress feedback, settings save, plans, files, memory, research, customers, tools, and license heartbeat before distribution.
