import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { runPRReviewAgent, runTriageAgent, runDocsAgent, triageAgentOnPR, getInstallationOctokit } from './agents/index.js';
import { trace, getTraces } from './lib/observability.js';
import { initSupabase, getSupabase, saveUser, getUserByEmail } from './lib/supabase.js';
import { generateSignupSuccessHtml } from './lib/html.js';
import { loginPage, tracesPage } from './lib/pages.js';

let currentUser = null;

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  if (currentUser) {
    return res.redirect('/traces');
  }
  res.type('html').send(loginPage());
});

app.get('/logout', (req, res) => {
  if (currentUser) {
    currentUser = null;
  }
  res.type('html').send(loginPage());
});

app.get('/traces', (req, res) => {
  if (!currentUser) {
    return res.redirect('/');
  }
  const traces = getTraces();
  res.type('html').send(tracesPage(traces));
});

app.post('/webhook/github', async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body; // ignore push events for now
  // issues and pull_request events are the main focus for now
  const installationId = payload.installation?.id;
  let octokit = null;
  console.log("Received GitHub webhook event:", event, "action:", payload.action, "installationId:", installationId);

  if (installationId) {
    console.log("Getting octokit for installation:", installationId);
    octokit = await getInstallationOctokit(installationId);
    trace('Webhook', 'github_app_trigger', { event, action: payload.action });
  }

  trace('Webhook', 'received', { event, action: payload.action });

  if (event === 'pull_request' && (payload.action === 'opened' || payload.action === 'synchronize')) {
    const pr = payload.pull_request;
    const [owner, repo] = pr.base.repo.full_name.split('/');
    const prNumber = pr.number;

    trace('Webhook', 'processing_pr', { owner, repo, prNumber });

    try {
      const diff = 'diff_placeholder';
      const filesChanged = []; // Would need to fetch from PR files API
      await runPRReviewAgent(owner, repo, prNumber, diff, pr.title, pr.body || '', octokit);
      await runDocsAgent(owner, repo, prNumber, pr.title, diff, [], octokit);

      // await triageAgentOnPR(owner, repo, prNumber, pr.title, pr.body || '', diff, filesChanged, octokit);

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
      await runTriageAgent(owner, repo, issueNumber, issue.title, issue.body || '', octokit);
      res.json({ status: 'triage_dispatched' });
    } catch (err) {
      trace('Webhook', 'error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json({ status: 'ignored', event });
  }
});


app.get('/github/installation', async (req, res) => {
  const installation_id = req.query.installation_id;
  const event = req.headers['x-github-event'];

  trace('Webhook', 'github_installation', { event, installation_id });
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const state = installation_id;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email&state=${encodeURIComponent(state)}`;

  return res.redirect(authUrl);

});

app.post('/webhook/ryx', async (req, res) => {
  const payload = req.body;
  trace('Webhook', 'ryx_webhook', { event: "github-actions", payload });
  res.json({ state: "ok", msg: "Ryx Webhook" });
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

app.get('/signup/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  const state = req.query.installation_id || '';

  if (!clientId) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' });
  }

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user,user:email&state=${encodeURIComponent(state)}`;
  res.redirect(authUrl);
});

app.get('/signup/callback/github', async (req, res) => {
  const { code, state } = req.query;
  console.log("GitHub OAuth callback received with code:", code, "and state:", state);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return res.status(400).json({ error: 'Missing OAuth params' });
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });
    const tokenData = await tokenRes.json();

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    const userData = await userRes.json();

    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    const emails = await emailRes.json();
    const primaryEmail = emails.find(e => e.primary)?.email || emails[0]?.email || '';
    let apiKey = null;

    if (state) {
      // Generate 32-character hexadecimal string
      const hexCode = crypto.randomBytes(16).toString('hex');
      const apiKey = `ryx_${hexCode}`;

      await saveUser({
        fullname: userData.name || userData.login,
        email: primaryEmail,
        installation_id: state,
        api_key: apiKey
      });

      currentUser = { login: userData.login, email: primaryEmail };

      const webhookUrl = process.env.GITHUB_WEBHOOK_URI || 'https://your-url.webhook/github';
      const html = generateSignupSuccessHtml({
        user: userData.login,
        email: primaryEmail,
        apiKey,
        webhookUrl
      });

      res.type('html').send(html);

    } else {
      console.log("No State found", primaryEmail)
      let data = await getUserByEmail(primaryEmail);
      console.log("User Data:", data);
      apiKey = data?.data?.api_key || null;
      currentUser = { login: userData.login, email: primaryEmail };
      res.redirect('/traces');
    }


  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/test/supabase', async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const { data, error } = await supabase.from('users').select('version()').limit(1);
    res.json({ status: 'connected', data, error });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.argv[1] === __filename) {
  app.listen(PORT, async () => {
    console.log(`Maintainer Agent Cabinet running on port ${PORT}`);
    await initSupabase();
  });
}

export { app };

;(async() => {
    const octokit = await getInstallationOctokit(123456); // Replace with actual installation ID
})();