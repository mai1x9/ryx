import { trace } from '../lib/observability.js';
import { Octokit } from 'octokit';
import OpenAI from 'openai';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

export async function runPRReviewAgent(owner, repo, prNumber, prDiff, prTitle, prBody) {
  trace('PRReviewAgent', 'start', { owner, repo, prNumber, prTitle });

  const prompt = `You are a senior code reviewer. Review this PR diff and provide concise, actionable feedback.

PR Title: ${prTitle}
PR Body: ${prBody}

Diff:
${prDiff.slice(0, 8000)}

Provide feedback in this format:
### Code Review
- **Issue:** [description]
- **Severity:** [ HIGH | MEDIUM | LOW ]
- **Suggestion:** [how to fix]

Focus on: security, bugs, performance, clarity.`;

  trace('PRReviewAgent', 'calling_llm', { owner, repo, prNumber });

  const completion = await openai.chat.completions.create({
    model: 'kimi-k2.5',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });

  const feedback = completion.choices[0].message.content;
  trace('PRReviewAgent', 'llm_response', { feedbackLength: feedback.length });

  const comment = `## 🤖 AI Code Review

${feedback}

---
*Powered by Maintainer Agent Cabinet*`;

  trace('PRReviewAgent', 'posting_comment', { owner, repo, prNumber });

  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: prNumber,
    body: comment
  });

  trace('PRReviewAgent', 'complete', { owner, repo, prNumber });
  return { success: true, feedback };
}

async function getLatestCommit(owner, repo, prNumber) {
  const { data: pr } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: prNumber
  });
  return pr.head.sha;
}

export async function runTriageAgent(owner, repo, issueNumber, issueTitle, issueBody) {
  trace('TriageAgent', 'start', { owner, repo, issueNumber, issueTitle });

  const prompt = `You are a GitHub issue triage assistant. Analyze this issue and categorize it.

Issue Title: ${issueTitle}
Issue Body: ${issueBody}

Categorize as one of:
- BUG: something is broken
- FEATURE: new functionality request
- QUESTION: clarification needed
- DOCUMENTATION: docs related
- DUPLICATE: already reported

Also suggest labels. Provide output in this format:
### Triage Result
- **Category:** [one of the above]
- **Labels:** [comma-separated suggested labels]
- **Priority:** [ HIGH | MEDIUM | LOW ]
- **Action:** [ CLOSE | NEED_INFO | ASSIGN | WONT_FIX ]`;

  trace('TriageAgent', 'calling_llm', { owner, repo, issueNumber });

  const completion = await openai.chat.completions.create({
    model: 'kimi-k2.5',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });

  const triageResult = completion.choices[0].message.content;
  trace('TriageAgent', 'llm_response', { triageResult: triageResult.slice(0, 200) });

  const comment = `## 🤖 Issue Triage

${triageResult}

---
*Powered by Maintainer Agent Cabinet*`;

  trace('TriageAgent', 'posting_comment', { owner, repo, issueNumber });

  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: issueNumber,
    body: comment
  });

  trace('TriageAgent', 'complete', { owner, repo, issueNumber });
  return { success: true, triageResult };
}

export async function runDocsAgent(owner, repo, prNumber, prTitle, prDiff, filesChanged) {
  trace('DocsAgent', 'start', { owner, repo, prNumber, prTitle, filesChanged });

  const prompt = `You are a technical docs assistant. Review this PR for documentation changes needed or suggested.

PR Title: ${prTitle}

Files changed: ${filesChanged.join(', ')}

Diff (first 5000 chars):
${prDiff.slice(0, 5000)}

If documentation updates are needed, provide:
- **Docs Section:** [file/path that needs update]
- **Suggested Content:** [what to add/update]

If no docs needed, respond with: "No documentation changes detected."`;

  trace('DocsAgent', 'calling_llm', { owner, repo, prNumber });

  const completion = await openai.chat.completions.create({
    model: 'kimi-k2.5',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });

  const docsResult = completion.choices[0].message.content;
  trace('DocsAgent', 'llm_response', { docsResult: docsResult.slice(0, 200) });

  const comment = `## 🤖 Documentation Review

${docsResult}

---
*Powered by Maintainer Agent Cabinet*`;

  trace('DocsAgent', 'posting_comment', { owner, repo, prNumber });

  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: prNumber,
    body: comment
  });

  trace('DocsAgent', 'complete', { owner, repo, prNumber });
  return { success: true, docsResult };
}

export { trace };