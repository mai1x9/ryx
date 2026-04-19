export function generateSignupSuccessHtml({ user, email, apiKey, webhookUrl }) {
  const yaml = `name: RyxBot Docs

on:
  workflow_dispatch:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]

jobs:
  RyxBot:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 20

      - name: Trigger RyxBot
        env:
          RYX_API_KEY: ${apiKey}
          RYX_URL: ${webhookUrl}

        run: |
          set -e

          REPO_ROOT=$(git rev-parse --show-toplevel)
          CURRENT_DIR=$(pwd)
          BASE_PATH=\${CURRENT_DIR#\$REPO_ROOT}
          BASE_PATH=\${BASE_PATH#/}

          echo "Repo root: \$REPO_ROOT"
          echo "Current dir: \$CURRENT_DIR"
          echo "Base path: \$BASE_PATH"

          [ -d "$REPO_ROOT/docs/RyxBot" ] && echo "Docs exist, skip" && exit 0

          ALL_FILES_RAW=\$(git ls-files | jq -R . | jq -s .)

          if [ -n "$BASE_PATH" ]; then
            ALL_FILES=\$(echo "\$ALL_FILES_RAW" | jq --arg prefix "\$BASE_PATH/" 'map($prefix + .)')
          else
            ALL_FILES="\$ALL_FILES_RAW"
          fi

          echo ""
          echo "📋 All tracked files (first 20):"
          echo "--------------------------------"
          echo "\$ALL_FILES" | jq -r '.[:20][]'

          TOP=\$(find . -maxdepth 2 \\
            ! -path '*/.git/*' \\
            ! -path '*/node_modules/*' \\
            ! -path '*/dist/*' \\
            ! -path '*/build/*' \\
            ! -path '*/vendor/*' \\
            ! -path '*/venv/*' \\
            ! -path '*/.venv/*' \\
            | head -50 | jq -R . | jq -s .)

          EXT=\$(find . -type f \\
            ! -path '*/.git/*' \\
            ! -path '*/node_modules/*' \\
            ! -path '*/dist/*' \\
            ! -path '*/build/*' \\
            ! -path '*/vendor/*' \\
            ! -path '*/venv/*' \\
            ! -path '*/.venv/*' \\
            ! -path '*/__pycache__/*' \\
            | awk -F. 'NF>1{print \$NF}' | sort | uniq -c | sort -nr | head -10 | jq -R . | jq -s .)

          HOT=\$(git log --name-only --pretty="" -10 | grep . | sort | uniq -c | sort -nr | head -10 | jq -R . | jq -s .)

          COUNT=\$(find . -type f \\
            ! -path '*/.git/*' \\
            ! -path '*/node_modules/*' \\
            ! -path '*/dist/*' \\
            ! -path '*/build/*' \\
            ! -path '*/vendor/*' \\
            ! -path '*/venv/*' \\
            ! -path '*/.venv/*' \\
            ! -path '*/__pycache__/*' \\
            | wc -l | xargs)

          jq -n \\
            --arg repo "\$GITHUB_REPOSITORY" \\
            --arg branch "\${GITHUB_HEAD_REF:-\$GITHUB_REF_NAME}" \\
            --argjson top "\$TOP" \\
            --argjson ext "\$EXT" \\
            --argjson hot "\$HOT" \\
            --arg count "\$COUNT" \\
            --argjson allFiles "\$ALL_FILES" \\
            '{
              repo: $repo,
              branch: $branch,
              topLevel: $top,
              extensions: $ext,
              hotFiles: $hot,
              fileCount: $count,
              allFiles: $allFiles
            }' > payload.json

          echo "📤 Sending payload to RyxBot..."
          echo "URL: \$RYX_URL"

          HTTP_CODE=\$(curl -X POST "\$RYX_URL" \\
            -H "x-api-key: \$RYX_API_KEY" \\
            -H "Content-Type: application/json" \\
            --data @payload.json \\
            -o response.json \\
            -w "%{http_code}" \\
            -s)

          echo ""
          echo "📥 Server Response (HTTP \$HTTP_CODE):"
          cat response.json
          echo ""

          if [ "\$HTTP_CODE" -ge 200 ] && [ "\$HTTP_CODE" -lt 300 ]; then
            echo "✅ Successfully triggered RyxBot"
          else
            echo "❌ Request failed with HTTP \$HTTP_CODE"
            exit 1
          fi`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RyxBot - Sign Up Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fafafa;
      color: #333;
    }
    .success-message {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-size: 18px;
    }
    .api-key-section {
      background: white;
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .api-key-section label {
      display: block;
      font-weight: 600;
      margin-bottom: 10px;
      color: #555;
    }
    .api-key-input {
      display: flex;
      gap: 10px;
    }
    .api-key-input input {
      flex: 1;
      padding: 12px;
      font-family: monospace;
      font-size: 14px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f5f5f5;
    }
    .api-key-input button {
      padding: 12px 20px;
      background: #333;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .api-key-input button:hover {
      background: #555;
    }
    .yaml-section {
      background: white;
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 8px;
    }
    .yaml-section label {
      display: block;
      font-weight: 600;
      margin-bottom: 10px;
      color: #555;
    }
    .yaml-section textarea {
      width: 100%;
      height: 400px;
      padding: 12px;
      font-family: monospace;
      font-size: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #1e1e1e;
      color: #d4d4d4;
      resize: vertical;
    }
    .download-btn {
      display: inline-block;
      margin-top: 10px;
      padding: 10px 20px;
      background: #0366d6;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
    }
    .download-btn:hover {
      background: #0256b4;
    }
    .user-info {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="success-message">
    ✅ You have been signed up successfully!
  </div>

  <div class="user-info">
    <strong>User:</strong> ${user} | <strong>Email:</strong> ${email}
  </div>

  <div class="api-key-section">
    <label>Your API Key (copy this):</label>
    <div class="api-key-input">
      <input type="text" id="apiKey" value="${apiKey}" readonly>
      <button onclick="copyApiKey()">Copy</button>
    </div>
  </div>

  <div class="yaml-section">
    <label>GitHub Actions Workflow YAML:</label>
    <textarea id="yamlContent" readonly>${yaml}</textarea>
    <a href="data:text/yaml;charset=utf-8,${encodeURIComponent(yaml)}" download="ryxbot.yml" class="download-btn">Download YAML</a>
  </div>

  <script>
    function copyApiKey() {
      const input = document.getElementById('apiKey');
      input.select();
      document.execCommand('copy');
      alert('API Key copied!');
    }
  </script>
</body>
</html>`;
}