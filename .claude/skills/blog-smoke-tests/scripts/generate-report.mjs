/**
 * Generate HTML Report for Smoke Tests
 * Creates a detailed HTML report from test results JSON
 */
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const REPORT_DIR = process.env.REPORT_DIR || './playwright/temp_ai_report_tests';

async function generateReport(results) {
  await mkdir(REPORT_DIR, { recursive: true });

  const timestamp = new Date().toISOString();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
  results.sort((a, b) => {
    const pA = priorityOrder[a.priority] ?? 99;
    const pB = priorityOrder[b.priority] ?? 99;
    if (pA !== pB) return pA - pB;
    return a.id.localeCompare(b.id);
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smoke Test Report - ${timestamp}</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --card-bg: #16213e;
      --text: #eee;
      --text-muted: #888;
      --pass: #00d26a;
      --fail: #ff6b6b;
      --border: #0f3460;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 0.5rem; font-size: 2rem; }
    .timestamp { color: var(--text-muted); margin-bottom: 2rem; }
    .summary {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .summary-card {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 1.5rem 2rem;
      flex: 1;
      min-width: 150px;
      border: 1px solid var(--border);
    }
    .summary-card.pass { border-color: var(--pass); }
    .summary-card.fail { border-color: var(--fail); }
    .summary-number { font-size: 3rem; font-weight: bold; }
    .summary-label { color: var(--text-muted); margin-top: 0.25rem; }
    .pass-text { color: var(--pass); }
    .fail-text { color: var(--fail); }
    .tests { display: flex; flex-direction: column; gap: 1rem; }
    .test-card {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .test-card.passed { border-left: 4px solid var(--pass); }
    .test-card.failed { border-left: 4px solid var(--fail); }
    .test-status {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .test-status.passed { background: rgba(0, 210, 106, 0.2); color: var(--pass); }
    .test-status.failed { background: rgba(255, 107, 107, 0.2); color: var(--fail); }
    .test-info { flex: 1; min-width: 200px; }
    .test-id { font-weight: bold; font-size: 1.1rem; }
    .test-name { color: var(--text-muted); }
    .test-priority {
      background: var(--border);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .test-priority.P0 { background: #ff4757; color: white; }
    .test-priority.P1 { background: #ffa502; color: black; }
    .test-priority.P2 { background: #2ed573; color: black; }
    .test-priority.P3 { background: #1e90ff; color: white; }
    .test-priority.P4 { background: #a4b0be; color: black; }
    .test-error {
      background: rgba(255, 107, 107, 0.1);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-family: monospace;
      font-size: 0.85rem;
      width: 100%;
      margin-top: 0.5rem;
      color: var(--fail);
      word-break: break-all;
    }
    .test-artifacts {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      width: 100%;
      margin-top: 0.5rem;
    }
    .artifact-link {
      background: var(--border);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      color: var(--text);
      text-decoration: none;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .artifact-link:hover { background: #1e5099; }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--border);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--pass), var(--pass));
      transition: width 0.3s;
    }
    .trace-viewer-note {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .trace-viewer-note h3 { margin-bottom: 0.5rem; }
    .trace-viewer-note code {
      background: var(--border);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Smoke Test Report</h1>
    <p class="timestamp">${timestamp}</p>

    <div class="progress-bar">
      <div class="progress-fill" style="width: ${(passed / total) * 100}%"></div>
    </div>

    <div class="summary">
      <div class="summary-card">
        <div class="summary-number">${total}</div>
        <div class="summary-label">Total Tests</div>
      </div>
      <div class="summary-card pass">
        <div class="summary-number pass-text">${passed}</div>
        <div class="summary-label">Passed</div>
      </div>
      <div class="summary-card fail">
        <div class="summary-number fail-text">${failed}</div>
        <div class="summary-label">Failed</div>
      </div>
    </div>

    ${failed > 0 ? `
    <div class="trace-viewer-note">
      <h3>View Trace Files</h3>
      <p>To view trace files, run: <code>npx playwright show-trace ./playwright/temp_ai_report_tests/SMOKE-XX-trace.zip</code></p>
    </div>
    ` : ''}

    <div class="tests">
      ${results.map(r => `
        <div class="test-card ${r.passed ? 'passed' : 'failed'}">
          <div class="test-status ${r.passed ? 'passed' : 'failed'}">
            ${r.passed ? '✓' : '✗'}
          </div>
          <div class="test-info">
            <div class="test-id">${r.id}</div>
            <div class="test-name">${r.name}</div>
          </div>
          <span class="test-priority ${r.priority}">${r.priority}</span>
          ${r.attempts ? `<span style="color: var(--text-muted);">${r.attempts} attempt${r.attempts > 1 ? 's' : ''}</span>` : ''}
          ${r.error ? `<div class="test-error">${escapeHtml(r.error)}</div>` : ''}
          ${r.artifacts && r.artifacts.length > 0 ? `
            <div class="test-artifacts">
              ${r.artifacts.map(a => `
                <a href="${a}" class="artifact-link">
                  ${a.endsWith('.png') ? '📷' : '📁'} ${a}
                </a>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

  const reportPath = join(REPORT_DIR, 'report.html');
  await writeFile(reportPath, html);
  console.log(`\nHTML Report generated: ${reportPath}`);
  return reportPath;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// If called directly, read results from command line argument
const args = process.argv.slice(2);
if (args.length > 0) {
  try {
    const results = JSON.parse(args[0]);
    generateReport(results);
  } catch (e) {
    console.error('Error parsing results:', e.message);
    process.exit(1);
  }
}

export { generateReport };
