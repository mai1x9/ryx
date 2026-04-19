import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { runPRReviewAgent, runTriageAgent, runDocsAgent } from './agents/index.js';
import { trace, getTraces } from './lib/observability.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    name: 'Maintainer Agent Cabinet',
    version: '1.0.0',
    status: 'running',
    endpoints: ['/webhook/github', '/test/pr-review', '/test/triage', '/traces']
  });
});

app.get('/traces', (req, res) => {
  res.json({ traces: getTraces() });
});

app.post('/webhook/github', async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  trace('Webhook', 'received', { event, action: payload.action });

  if (event === 'pull_request' && (payload.action === 'opened' || payload.action === 'synchronize')) {
    const pr = payload.pull_request;
    const [owner, repo] = pr.base.repo.full_name.split('/');
    const prNumber = pr.number;

    trace('Webhook', 'processing_pr', { owner, repo, prNumber });

    try {
      const diff = 'diff_placeholder';
      await runPRReviewAgent(owner, repo, prNumber, diff, pr.title, pr.body || '');
      await runDocsAgent(owner, repo, prNumber, pr.title, diff, []);
      res.json({ status: 'agents_dispatched' });
    } catch (err) {
      trace('Webhook', 'error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  } else if (event === 'issues' && payload.action === 'opened') {
    const issue = payload.issue;
    const [owner, repo] = issue.repository_url.split('/').slice(-2);
    const issueNumber = issue.number;

    trace('Webhook', 'processing_issue', { owner, repo, issueNumber });

    try {
      await runTriageAgent(owner, repo, issueNumber, issue.title, issue.body || '');
      res.json({ status: 'triage_dispatched' });
    } catch (err) {
      trace('Webhook', 'error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json({ status: 'ignored', event });
  }
});

app.post('/test/pr-review', async (req, res) => {
  const { owner, repo, prNumber } = req.body;
  if (!owner || !repo || !prNumber) {
    return res.status(400).json({ error: 'Missing owner, repo, or prNumber' });
  }

  try {
    const result = await runPRReviewAgent(owner, repo, prNumber, 'test_diff', 'Test PR', 'This is a test PR');
    res.json({ status: 'success', result });
  } catch (err) {
    console.log('Error running PR Review Agent:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/test/triage', async (req, res) => {
  const { owner, repo, issueNumber } = req.body;
  if (!owner || !repo || !issueNumber) {
    return res.status(400).json({ error: 'Missing owner, repo, or issueNumber' });
  }

  try {
    const result = await runTriageAgent(owner, repo, issueNumber, 'Test Issue', 'This is a test issue');
    res.json({ status: 'success', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  app.listen(PORT, () => {
    console.log(`Maintainer Agent Cabinet running on port ${PORT}`);
  });
}

export { app };