// k6/blog-crawler.js — Simulates crawler traffic with unique SSR URLs
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import { check } from 'k6';

const urls = new SharedArray('urls', function () {
  return open('/tmp/urls-all.txt').split('\n').filter(u => u.length > 0);
});

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const UA = __ENV.USER_AGENT || 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

export const options = {
  scenarios: {
    crawler_traffic: {
      executor: 'constant-arrival-rate',
      rate: parseInt(__ENV.RPS || '10'),
      timeUnit: '1s',
      duration: __ENV.DURATION || '10m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<10000'],
  },
};

export default function () {
  const idx = Math.floor(Math.random() * urls.length);
  const url = `${BASE}${urls[idx]}`;

  const res = http.get(url, {
    headers: {
      'User-Agent': UA,
    },
    timeout: '10s',
  });

  check(res, {
    'status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400,
  });
}
