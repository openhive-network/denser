// k6/resolve-post-only.js — Tests only the resolve-post API route
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { check } from 'k6';

// Reuse the URL corpus but filter to post URLs only (/@user/permlink)
const urls = new SharedArray('urls', function () {
  return open('/tmp/urls-all.txt').split('\n').filter(u => u.match(/^\/@[^/]+\/[^/]+$/));
});

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    resolve_post: {
      executor: 'constant-arrival-rate',
      rate: parseInt(__ENV.RPS || '10'),
      timeUnit: '1s',
      duration: __ENV.DURATION || '10m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
};

export default function () {
  const idx = Math.floor(Math.random() * urls.length);
  const url = `${BASE}${urls[idx]}`;

  // These hit the resolve-post fallback rewrite
  const res = http.get(url, {
    redirects: 0, // Don't follow redirect — we're testing the API route itself
    timeout: '10s',
  });

  check(res, {
    'status is redirect or ok': (r) => r.status === 302 || r.status === 200 || r.status === 404,
  });
}
