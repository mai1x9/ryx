import { trace } from '../lib/observability.js';
import { Octokit } from 'octokit';
import { App } from "@octokit/app";

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

const privateKey = fs.readFileSync(
  path.join(process.cwd(), './src/agents/ryx.pem'),
  'utf8'
);

console.log("Maintainer Agent Cabinet starting up...", process.env.GITHUB_APP_ID);
const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey
});

console.log(app, privateKey)



export async function getInstallationOctokit(installationId) {
  console.log("Getting octokit for installation:", installationId);
  
  // This is the correct method - it's already available on your app object!
  const octokit = await app.getInstallationOctokit(installationId);
  
  return octokit;
}



export async function runPRReviewAgent(owner, repo, prNumber, prDiff, prTitle, prBody, octokit) {
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

async function getLatestCommit(owner, repo, prNumber, octokit) {
  const { data: pr } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: prNumber
  });
  return pr.head.sha;
}

export async function runTriageAgent(owner, repo, issueNumber, issueTitle, issueBody, octokit) {
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


export async function runDocsAgent(owner, repo, prNumber, prTitle, prDiff, filesChanged, octokit) {
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

/**
 * Find similar issues for a PR based on diff files and issue references
 * Links top 3 related issues back to the PR
 */
export async function triageAgentOnPR(owner, repo, prNumber, prTitle, prBody, prDiff, filesChanged) {
  trace('TriageAgentOnPR', 'start', { owner, repo, prNumber, prTitle, filesChanged });

  // Extract issue references from PR body and comments
  const issueRefs = extractIssueReferences(prBody);
  trace('TriageAgentOnPR', 'issue_refs_found', { issueRefs });

  // Get existing issues to search through
  const allIssues = await getRepositoryIssues(owner, repo);
  trace('TriageAgentOnPR', 'total_issues', { count: allIssues.length });

  // Score and rank issues by similarity to PR
  const scoredIssues = scoreIssuesByRelevance(allIssues, prDiff, filesChanged, issueRefs);
  
  // Take top 3 most relevant issues
  const topIssues = scoredIssues.slice(0, 3);
  trace('TriageAgentOnPR', 'top_similar_issues', { 
    count: topIssues.length,
    issueNumbers: topIssues.map(i => i.number)
  });

  if (topIssues.length === 0) {
    const comment = `## 🔗 Issue Triage

No similar issues found for this PR.

---
*Powered by Maintainer Agent Cabinet*`;

    await postPRComment(owner, repo, prNumber, comment);
    trace('TriageAgentOnPR', 'complete', { owner, repo, prNumber, issuesFound: 0 });
    return { success: true, similarIssues: [] };
  }

  // Build the comment with linked issues
  const issueLinks = topIssues.map(issue => 
    `- #${issue.number}: ${issue.title} (${issue.state}) — relevance: ${issue.score}%`
  ).join('\n');

  const comment = `## 🔗 Related Issues

This PR may be related to the following existing issues:

${issueLinks}

${issueRefs.length > 0 ? `\n**Referenced in PR:** ${issueRefs.map(r => `#${r}`).join(', ')}` : ''}

---
*Powered by Maintainer Agent Cabinet*`;

  trace('TriageAgentOnPR', 'posting_comment', { owner, repo, prNumber });

  await postPRComment(owner, repo, prNumber, comment);

  // Optionally, comment on each linked issue to reference the PR
  for (const issue of topIssues) {
    await postIssueComment(owner, repo, issue.number, 
      `🔗 Related PR: #${prNumber} — ${prTitle}`
    );
  }

  trace('TriageAgentOnPR', 'complete', { 
    owner, 
    repo, 
    prNumber, 
    issuesFound: topIssues.length 
  });

  return { success: true, similarIssues: topIssues };
}

/**
 * Extract issue references from text (e.g., "fixes #123", "related to #456")
 */
function extractIssueReferences(text) {
  if (!text) return [];
  const regex = /(?:closes|fixes|resolves|references|related\s+to|#)\s*(\d+)/gi;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map(m => parseInt(m[1], 10)))];
}

/**
 * Fetch all open issues from the repository
 */
async function getRepositoryIssues(owner, repo) {
  const issues = [];
  let page = 1;
  
  while (true) {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/issues', {
      owner,
      repo,
      state: 'all',
      per_page: 100,
      page
    });
    
    if (data.length === 0) break;
    issues.push(...data.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state,
      labels: issue.labels.map(l => l.name)
    })));
    
    page++;
    if (data.length < 100) break;
  }
  
  return issues;
}

/**
 * Score issues by relevance to the PR
 */
function scoreIssuesByRelevance(issues, prDiff, filesChanged, explicitRefs) {
  const scored = issues.map(issue => {
    let score = 0;

    // Explicit references get highest score
    if (explicitRefs.includes(issue.number)) {
      score += 100;
    }

    // Score based on label matching with files changed
    const fileKeywords = filesChanged.flatMap(f => 
      f.split(/[\/\-_]/).filter(Boolean)
    );
    
    for (const keyword of fileKeywords) {
      if (issue.title.toLowerCase().includes(keyword.toLowerCase()) ||
          issue.body.toLowerCase().includes(keyword.toLowerCase())) {
        score += 20;
      }
    }

    // Score based on diff content similarity
    const diffKeywords = prDiff.slice(0, 3000)
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 50);
    
    for (const keyword of diffKeywords) {
      if (issue.title.toLowerCase().includes(keyword.toLowerCase()) ||
          issue.body.toLowerCase().includes(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // Boost open issues
    if (issue.state === 'open') {
      score += 10;
    }

    return { ...issue, score };
  });

  // Sort by score descending
  return scored
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Post a comment on a PR
 */
async function postPRComment(owner, repo, prNumber, body) {
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: prNumber,
    body
  });
}

/**
 * Post a comment on an issue
 */
async function postIssueComment(owner, repo, issueNumber, body) {
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: issueNumber,
    body
  });
}

export { trace };