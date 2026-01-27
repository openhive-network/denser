#!/usr/bin/env node
/**
 * Post Lighthouse results as a GitLab MR comment
 * Removes previous Lighthouse comments before posting new one
 *
 * Required env vars:
 *   CI_API_V4_URL, CI_PROJECT_ID, CI_JOB_TOKEN
 *   CI_MERGE_REQUEST_IID (optional - will find MR from branch if not set)
 *   CI_COMMIT_REF_NAME (branch name, used to find MR)
 *
 * Usage: node lighthouse-mr-comment.js [blog-report.json] [wallet-report.json]
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

const path = require('path');

const COMMENT_MARKER = '<!-- lighthouse-metrics-comment -->';
const thresholds = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'lighthouse-thresholds.json'), 'utf8')
);

const {
  CI_API_V4_URL,
  CI_PROJECT_ID,
  CI_JOB_TOKEN,
  CI_PIPELINE_URL,
  CI_COMMIT_REF_NAME,
  LIGHTHOUSE_MR_COMMENT_TOKEN, // Project/group access token (preferred for MR comments)
  PRIVATE_TOKEN,               // Alternative token name
} = process.env;

// Use LIGHTHOUSE_MR_COMMENT_TOKEN or PRIVATE_TOKEN for auth (CI_JOB_TOKEN can't post MR comments)
const authToken = LIGHTHOUSE_MR_COMMENT_TOKEN || PRIVATE_TOKEN || CI_JOB_TOKEN;
const authHeader = (LIGHTHOUSE_MR_COMMENT_TOKEN || PRIVATE_TOKEN) ? 'PRIVATE-TOKEN' : 'JOB-TOKEN';

let mergeRequestIid = process.env.CI_MERGE_REQUEST_IID;

if (!CI_API_V4_URL || !CI_PROJECT_ID || !authToken) {
  console.error('Missing required CI environment variables (need LIGHTHOUSE_MR_COMMENT_TOKEN or CI_JOB_TOKEN)');
  process.exit(1);
}

const blogReportPath = process.argv[2];
const walletReportPath = process.argv[3];

function parseReport(path, appName) {
  if (!path || !fs.existsSync(path)) {
    return null;
  }
  try {
    const report = JSON.parse(fs.readFileSync(path, 'utf8'));
    const categories = report.categories || {};
    const audits = report.audits || {};

    return {
      app: appName,
      scores: {
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        'best-practices': Math.round((categories['best-practices']?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
      },
      metrics: {
        FCP: audits['first-contentful-paint']?.displayValue || 'N/A',
        LCP: audits['largest-contentful-paint']?.displayValue || 'N/A',
        TBT: audits['total-blocking-time']?.displayValue || 'N/A',
        CLS: audits['cumulative-layout-shift']?.displayValue || 'N/A',
        SI: audits['speed-index']?.displayValue || 'N/A',
        TTI: audits['interactive']?.displayValue || 'N/A',
      },
    };
  } catch (err) {
    console.error(`Failed to parse ${path}:`, err.message);
    return null;
  }
}

function scoreEmoji(score, threshold) {
  if (threshold !== undefined && score < threshold) return '❌';
  if (score >= 90) return '🟢';
  if (score >= 50) return '🟠';
  return '🔴';
}

function formatScoreCell(score, threshold) {
  const emoji = scoreEmoji(score, threshold);
  if (threshold !== undefined) {
    return `${emoji} ${score} (≥${threshold})`;
  }
  return `${emoji} ${score}`;
}

function formatReport(data) {
  if (!data) return null;

  const { app, scores, metrics } = data;
  const appThresholds = thresholds[app] || {};

  const lines = [
    `### ${app.charAt(0).toUpperCase() + app.slice(1)}`,
    '',
    '| Category | Score (threshold) |',
    '|----------|-------------------|',
    `| Performance | ${formatScoreCell(scores.performance, appThresholds.performance)} |`,
    `| Accessibility | ${formatScoreCell(scores.accessibility, appThresholds.accessibility)} |`,
    `| Best Practices | ${formatScoreCell(scores['best-practices'], appThresholds['best-practices'])} |`,
    `| SEO | ${formatScoreCell(scores.seo, appThresholds.seo)} |`,
    '',
    '**Core Web Vitals:**',
    `- FCP: ${metrics.FCP} | LCP: ${metrics.LCP} | TBT: ${metrics.TBT}`,
    `- CLS: ${metrics.CLS} | Speed Index: ${metrics.SI} | TTI: ${metrics.TTI}`,
  ];

  return lines.join('\n');
}

function buildComment(blogData, walletData) {
  const parts = [
    COMMENT_MARKER,
    '## 🚦 Lighthouse Results',
    '',
  ];

  const blogReport = formatReport(blogData);
  const walletReport = formatReport(walletData);

  if (blogReport) parts.push(blogReport, '');
  if (walletReport) parts.push(walletReport, '');

  if (!blogReport && !walletReport) {
    parts.push('_No Lighthouse reports available._', '');
  }

  parts.push('---');
  parts.push(`_View full reports in [pipeline artifacts](${CI_PIPELINE_URL})_`);

  return parts.join('\n');
}

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CI_API_V4_URL}${path}`);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        [authHeader]: authToken,
        'Content-Type': 'application/json',
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`API ${method} ${path} failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function findMergeRequestIid() {
  if (mergeRequestIid) {
    return mergeRequestIid;
  }

  if (!CI_COMMIT_REF_NAME) {
    console.log('No branch name available to find MR');
    return null;
  }

  console.log(`Looking for open MR for branch: ${CI_COMMIT_REF_NAME}`);
  const path = `/projects/${encodeURIComponent(CI_PROJECT_ID)}/merge_requests?source_branch=${encodeURIComponent(CI_COMMIT_REF_NAME)}&state=opened&per_page=1`;

  try {
    const mrs = await apiRequest('GET', path);
    if (mrs && mrs.length > 0) {
      console.log(`Found MR !${mrs[0].iid}: ${mrs[0].title}`);
      return mrs[0].iid;
    }
    console.log('No open MR found for this branch');
    return null;
  } catch (err) {
    console.warn('Failed to find MR:', err.message);
    return null;
  }
}

async function deleteOldComments(mrIid) {
  const path = `/projects/${encodeURIComponent(CI_PROJECT_ID)}/merge_requests/${mrIid}/notes?per_page=100`;

  try {
    const notes = await apiRequest('GET', path);
    for (const note of notes) {
      if (note.body && note.body.includes(COMMENT_MARKER)) {
        console.log(`Deleting old Lighthouse comment (note_id: ${note.id})`);
        await apiRequest(
          'DELETE',
          `/projects/${encodeURIComponent(CI_PROJECT_ID)}/merge_requests/${mrIid}/notes/${note.id}`
        );
      }
    }
  } catch (err) {
    console.warn('Failed to delete old comments:', err.message);
  }
}

async function postComment(mrIid, body) {
  const path = `/projects/${encodeURIComponent(CI_PROJECT_ID)}/merge_requests/${mrIid}/notes`;
  await apiRequest('POST', path, { body });
  console.log(`Posted Lighthouse comment to MR !${mrIid}`);
}

async function main() {
  const blogData = parseReport(blogReportPath, 'blog');
  const walletData = parseReport(walletReportPath, 'wallet');

  if (!blogData && !walletData) {
    console.log('No reports found, skipping comment');
    process.exit(0);
  }

  const mrIid = await findMergeRequestIid();
  if (!mrIid) {
    console.log('No MR found, skipping comment');
    process.exit(0);
  }

  const comment = buildComment(blogData, walletData);
  console.log('Generated comment:\n', comment);

  await deleteOldComments(mrIid);
  await postComment(mrIid, comment);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
