// The recording's clock, for the deterministic Lighthouse pass (.aidev/run-lighthouse-fixture.sh).
//
// Recorded data was current at one instant; rendered against today's clock, "x minutes ago",
// payout windows and any request that carries a time would drift from run to run (and miss
// the recording). So `Date` starts at that instant and advances at the real rate.
//
//   node --require clock.cjs ...       the app servers: DENSER_FIXTURE_CLOCK=<ISO instant>
//   browserClockScript(now, nonce)     the same shift for a page, as an inline <script> the
//                                      site router puts first in each document's <head>; it
//                                      carries the page's CSP nonce, or the policy blocks it
//
// Only `Date` moves: timers, performance.now() and the event loop keep real time.
'use strict';

// Kept self-contained: browserClockScript sends its source to the page.
function installShiftedDate(target, startMs) {
  const RealDate = target.Date;
  const offset = startMs - RealDate.now();
  function ShiftedDate(...args) {
    if (!new.target) return new RealDate(RealDate.now() + offset).toString();
    return args.length ? new RealDate(...args) : new RealDate(RealDate.now() + offset);
  }
  ShiftedDate.prototype = RealDate.prototype;
  ShiftedDate.now = () => RealDate.now() + offset;
  ShiftedDate.parse = RealDate.parse;
  ShiftedDate.UTC = RealDate.UTC;
  target.Date = ShiftedDate;
}

/** An inline script that starts the page's `Date` at `nowMs` (the server's shifted now). */
function browserClockScript(nowMs, nonce) {
  const nonceAttribute = nonce ? ` nonce="${nonce}"` : '';
  return `<script${nonceAttribute}>(${installShiftedDate.toString()})(window,${Math.round(nowMs)})</script>`;
}

if (process.env.DENSER_FIXTURE_CLOCK) {
  const start = Date.parse(process.env.DENSER_FIXTURE_CLOCK);
  if (Number.isNaN(start)) throw new Error(`DENSER_FIXTURE_CLOCK is not a date: ${process.env.DENSER_FIXTURE_CLOCK}`);
  installShiftedDate(globalThis, start);
}

module.exports = { browserClockScript };
