// Server-side half of the deterministic Lighthouse pass's "nothing leaves the host" check
// (.aidev/run-lighthouse-fixture.sh); Lighthouse's own request list covers the browser.
//
//   node --require egress-guard.cjs ...   DENSER_EGRESS_LOG=<file> [DENSER_EGRESS_BLOCK=1]
//
// Every TCP connection the process opens to a host other than loopback appends
// "<host>:<port>" to DENSER_EGRESS_LOG; with DENSER_EGRESS_BLOCK=1 the connection is
// also refused, so a replayed page can never be served live data. fetch (undici), http
// and https all connect through net.Socket.
'use strict';

const fs = require('fs');
const net = require('net');

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const log = process.env.DENSER_EGRESS_LOG;
const block = process.env.DENSER_EGRESS_BLOCK === '1';

function destinationOf(args) {
  const [first, second] = Array.isArray(args[0]) ? args[0] : args;
  if (typeof first === 'object' && first !== null) {
    if (first.path) return null; // a unix socket
    return { host: first.host || 'localhost', port: first.port };
  }
  if (typeof first === 'string' && !/^\d+$/.test(first)) return null; // a unix socket path
  return { host: typeof second === 'string' ? second : 'localhost', port: first };
}

if (log) {
  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function guardedConnect(...args) {
    const destination = destinationOf(args);
    if (destination && !LOOPBACK.has(destination.host)) {
      fs.appendFileSync(log, `${destination.host}:${destination.port}\n`);
      if (block) {
        process.nextTick(() => this.destroy(new Error(`egress blocked: ${destination.host}:${destination.port}`)));
        return this;
      }
    }
    return connect.apply(this, args);
  };
}
