# Release Notes

## 1.0.2 - 2026-06-21

This release focuses on making Co-Op Desktop calmer, clearer, and easier to maintain as a sellable business product.

### Highlights

- Simplified the installed desktop navigation around owner jobs: Today, Ask, Company, Customers, Money, plus account settings and license access.
- Consolidated profile, files, memory, and research into a single Company workspace with focused tabs and no dead-end overview actions.
- Moved settings and license controls into an Account menu so the sidebar no longer feels like a control panel.
- Hid advanced assistant/source configuration behind Advanced sections while keeping bring-your-own-key, Ollama, Firecrawl, email, and integration paths functional.
- Improved research wording and defaults so every research brief is source-backed and saved into the local company library.
- Reduced the desktop shell from a large monolithic file into focused header, sidebar, navigation, Company panel, and Company overview modules.
- Split Tauri outreach helper logic and tests out of the command module to keep Rust modules under the repository size contract.
- Updated product, architecture, orchestration, operations, audit, and frontend docs to match the simplified desktop information architecture.

### Verification

- Passed backend tests, backend build, and backend npm audit.
- Passed frontend typecheck, hosted build, Tauri static export, frontend npm audit, and Rust advisory audit.
- Passed Rust tests and Rust clippy with warnings denied after the outreach module split.
- Built the Windows NSIS and MSI installers for Co-Op Desktop 1.0.2.

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
