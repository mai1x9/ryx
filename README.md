It’s a **GitHub App + AI engineering copilot** for repositories that helps teams review PRs, manage issues, and keep docs aligned automatically.

NOTE: Check changelog.md for each iteration progress.

## Demo Video


<video width="600" controls>
  <source src="https://drive.google.com/file/d/1MJ0fX-4t-DLykOGw-uB8rsNgRWjZjRrp/view?usp=sharing" type="video/mp4">
  Your browser does not support the video tag.
</video>

[Watch DemoVideo.mp4](./DemoVideo.mp4)


### What it does today

Users install the GitHub app on their repo, log in to your dashboard, and can:

* **See active agents** running on their repositories
* **View logs / traces** of what each agent is doing
* **Monitor automation workflows** in real time

### Current AI Agents

**1. PR Agent**
Triggered on Pull Requests. It:

* Reads PR metadata
* Analyzes changed files / diffs
* Reviews code quality and logic
* Posts review comments directly on the PR

**2. Docs Agent**
Runs on PRs and detects documentation impact. It:

* Finds missing docs updates
* Suggests what documentation should change
* Helps keep code and docs in sync

**3. Issues Agent**
Triggered on issue comments / new issues. It:

* Performs intelligent triage
* Categorizes requests / bugs
* Helps route work faster

### Why it matters

Engineering teams lose time doing repetitive reviews, triaging issues, and updating docs manually. This platform automates those workflows directly inside GitHub.

### Bigger Vision (Next Step)

Move beyond basic code review into **intent-aware PR governance**:

When a PR is opened, the system compares changes against:

* Product requirements from PMs
* Architecture decisions from architects
* Existing tickets / planned scope
* Documentation expectations

Then it flags:

* **Requirement drift** – code doesn’t match requested feature
* **Architecture drift** – implementation violates design decisions
* **Missing docs** – feature changed but docs not updated
* **Scope mismatch** – unrelated changes added to PR

### In one line

**An AI-powered GitHub app that reviews code, triages issues, updates docs, and ensures engineering work stays aligned with business and architecture intent.**

## Pain points my bot solves.

Engineering teams ship code fast, but documentation quickly becomes outdated, architectural decisions get lost in PRs and chats, and new pull requests often introduce changes that conflict with intended system design or planned features. This creates onboarding friction, misalignment between product and engineering, regressions, and wasted review time. Our MVP solves this by acting as an AI GitHub agent that automatically keeps docs updated, detects architecture drift or requirement conflicts in PRs, and gives teams real-time decision context directly inside their development workflow.
