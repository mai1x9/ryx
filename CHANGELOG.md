```md
# Changelog

## Iteration 2

### GitHub App Integration Completed
Connected BranchHub / Ryx bot with GitHub App architecture.

Install app from:

https://github.com/apps/ryx-openbot

After installation on a repository, the bot starts listening to GitHub events such as:

- Pull Requests opened / updated
- Issues opened
- Repository activity hooks

### Public Webhook Testing via ngrok
Server is currently running locally and exposed publicly using ngrok.

Active webhook URL:

https://ouch-pellet-doily.ngrok-free.dev

Example webhook endpoint:

https://ouch-pellet-doily.ngrok-free.dev/webhook/github

### End-to-End Flow Working
Validated complete workflow:

1. Install GitHub App
2. Open PR / Issue
3. GitHub sends webhook event
4. Local server receives event
5. AI agent processes request
6. Comment posted back to GitHub

### Status
- Full loop operational
- Real GitHub events connected
- Public webhook working
- Ready for broader testing and L3 automation builds
```

---

## Iteration 0 & 1

### Initial Foundation Build
- Made the first production code commit.
- Boilerplate architecture is ready for an AI-powered GitHub open-source maintainer bot.
- Core backend foundation established and ready to scale into L3 workflows.

### AI Agents Added
- **PR Review Agent**
  - Reviews pull requests using LLM analysis
  - Posts code review suggestions directly on PRs

- **Docs Agent**
  - Detects documentation gaps from PR diffs
  - Suggests README / docs updates through PR comments

- **Issue Agent**
  - Reviews incoming GitHub issues
  - Helps classify, summarize, and respond automatically

### Testing & Validation
- Added frontend and component test cases in `./tests` folder
- Used VSCode REST Client for rapid local API testing
- Verified PR review endpoint flow locally

### GitHub Token Setup
To run locally for a single user, create a GitHub Personal Access Token with scopes:

- `repo`
- `pull_requests:write`
- `issues:write`
- `metadata:read`

Used for:
- Reading PRs
- Posting comments
- Reading issues
- Triggering automation locally

### Status
- Fully functional locally for one user
- Local webhook + agent workflows tested successfully


---
