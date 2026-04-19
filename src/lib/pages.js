export function loginPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RyxBot - Login</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 500px;
      margin: 100px auto;
      padding: 40px 20px;
      background: #fafafa;
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    p {
      color: #666;
      margin-bottom: 40px;
    }
    .login-btn {
      display: inline-block;
      padding: 16px 40px;
      background: #24292e;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
    }
    .login-btn:hover {
      background: #1b1f23;
    }
  </style>
</head>
<body>
  <h1>RyxBot</h1>
  <p>AI-powered code review, triage, and docs for your repos</p>
  <a href="/signup/github" class="login-btn">Login with GitHub</a>
</body>
</html>`;
}

export function tracesPage(traces) {
  const rows = traces.map(t => `
    <tr>
      <td>${t.agent}</td>
      <td>${t.step}</td>
      <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
      <td><pre>${JSON.stringify(t.data).slice(0, 100)}</pre></td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RyxBot - Traces</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #fafafa;
    }
    h1 {
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .logout-btn {
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    pre {
      margin: 0;
      font-size: 12px;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>RyxBot Traces</h1>
    <a href="/logout" class="logout-btn">Logout</a>
  </div>
  <table>
    <thead>
      <tr>
        <th>Agent</th>
        <th>Step</th>
        <th>Time</th>
        <th>Data</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">No traces yet</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}