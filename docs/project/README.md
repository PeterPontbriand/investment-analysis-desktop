# Project documentation

This section is for contributors and reviewers: the application's direction, its plans and their status, and the procedures for working on it. Development setup is in the [README](../../README.md), and the rules for contributors and agents are in [AGENTS.md](../../AGENTS.md).

## Planning and status

The [v0.1 implementation plan](milestones/v0.1/IMPLEMENTATION_PLAN.md#sequence-and-status) is the sequence and status source for the active milestone. Each unit's slice plan owns its sub-slice table, decisions and acceptance criteria. Update the owning document; don't copy status into this index or any other document.

## Project-wide documents

- [Charter](CHARTER.md): what the application is for, its boundaries with the engine, and what is out of scope.
- [Spec workflow](SPEC_WORKFLOW.md): how a unit goes from an approved decision list to a merged pull request through a committed spec.
- [Spec template](SPEC_TEMPLATE.md): the fixed shape of a unit spec.
- [Smoke test](SMOKE_TESTING.md): the human check of the application against a real engine. It is no longer maintained per pull request (D310); GUI.6 decides its future.
- [Milestones](milestones/README.md): each milestone's implementation plan, with one folder per unit of work.

## Where documents go

- A project-wide document, true across milestones, lives in this folder.
- A milestone's implementation plan is `milestones/<milestone>/IMPLEMENTATION_PLAN.md`.
- A unit's slice plan and its other records live in `milestones/<milestone>/<unit>/`, such as `milestones/v0.1/gui-2/`.
- Design material lives in [docs/design](../design/).
