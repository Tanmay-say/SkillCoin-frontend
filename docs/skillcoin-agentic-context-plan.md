# Skillcoin Agentic Context Plan

## Positioning

Skillcoin should evolve from a marketplace for `SKILL.md` files into infrastructure for agentic coding.

The core job is not only to publish and install skills. The core job is to compile a user's PRD, implementation goals, and decisions into an IDE-native context filesystem that coding agents can read efficiently.

That is exactly why it reduces token usage and error rate. The IDE or coding agent does not need the full PRD every turn; it reads the right file at the right time.

## Current Status

The existing CLI already contains an early version of this workflow:

- `skillcoin project create` can ingest a brief
- the CLI can ask clarification questions
- it can generate a project spec and context bundle
- it writes `.skillcoin/` artifacts
- it writes Cursor-specific prompts and rules into `.cursor/`

Current limitations:

- only `cursor` is modeled as a target IDE
- the generated filesystem is still too small
- skill selection is not yet project-aware
- command, rule, and agent templates are not modularized by IDE
- the AI prompting is still biased toward single-skill generation

## Target Product

Skillcoin should accept:

- a PRD
- a plain-English project brief
- implementation preferences
- target IDE or coding CLI

Then it should:

1. ask high-impact clarification questions
2. normalize decisions into a project spec
3. select only relevant skills and workflows
4. emit an IDE-native context structure
5. keep the bundle concise so coding agents consume less context

## Canonical Bundle

Every generated project should have a canonical core:

- `.skillcoin/project-spec.json`
- `.skillcoin/decisions.json`
- `.skillcoin/context.md`
- `.skillcoin/project-plan.md`
- `.skillcoin/answers.json`
- `.skillcoin/tasks/`
- `.skillcoin/skills-manifest.json`

## IDE Adapters

### Cursor

- `.cursor/rules/project.mdc`
- `.cursor/rules/backend.mdc`
- `.cursor/rules/frontend.mdc`
- `.cursor/prompts/plan.md`
- `.cursor/prompts/implement.md`
- `.cursor/prompts/review.md`

### Claude Code

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/commands/plan.md`
- `.claude/commands/implement.md`
- `.claude/commands/review.md`
- `.claude/rules/code-style.md`
- `.claude/rules/testing.md`
- `.claude/skills/<skill>/SKILL.md`
- `.claude/agents/architect.md`
- `.claude/agents/frontend.md`
- `.claude/agents/backend.md`

### Future Targets

- Codex-compatible project bundles
- Augment / Antigravity adapters
- generic agent-memory bundle export

## CLI Evolution

Recommended command surface:

- `skillcoin project init`
- `skillcoin project refine`
- `skillcoin project status`
- `skillcoin project export-skill`
- `skillcoin project sync`

Recommended flags:

- `--ide cursor|claude-code|codex|augment`
- `--mode lean|standard|full`
- `--from-prd <file>`
- `--prompt <text>`

## Implementation Phases

### Phase 1

- expand `TargetIde` beyond Cursor
- refactor bundle generation into IDE adapters
- introduce a richer canonical project spec

### Phase 2

- add project-aware skill selection
- generate modular commands, rules, and agents
- support lean versus full context modes

### Phase 3

- add docs and examples for each IDE
- expose project-context generation in the web app
- publish reusable project bundles as installable Skillcoin packages

## Success Criteria

- a user can start from a PRD and get a working project context filesystem
- the bundle is smaller and more reusable than pasting the PRD into every chat
- Cursor and Claude Code can use the generated structure directly
- only relevant skills are included for the project
- the generated files improve implementation accuracy and reduce repeated prompting
