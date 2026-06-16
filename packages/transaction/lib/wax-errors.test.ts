import { describe, it } from 'mocha';
import { expect } from 'chai';
import { isTransportError } from './wax-errors';

/**
 * Unit coverage for the transport-vs-definitive error distinction that drives
 * the post route's 5xx-vs-404 decision (hive/denser#926, Obszar 7).
 *
 * This is the layer the fixture-level SSR tests can NOT reach: a proxy-injected
 * 5xx is not faithfully classified by the bundled wax, and this build serves
 * notFound() as HTTP 200 (soft-404), so the "transport failure → 5xx
 * ServiceUnavailable, never a 404" contract has to be pinned here instead.
 */
describe('isTransportError', () => {
  describe('transport failures → must render 5xx ServiceUnavailable, never 404', () => {
    // wax surfaces "could not get a usable answer" as the WaxRequestError family;
    // the class names are stable, so the function matches them by name as well as
    // by instanceof (the name path is the backstop across duplicate wax modules).
    const transportNames = [
      'WaxRequestError',
      'WaxMalformedJsonError',
      'WaxNon_2XX_3XX_ResponseCodeError',
      'WaxUnknownRequestError',
      'WaxRequestTimeoutError',
      'WaxRequestAbortedByUser'
    ];

    for (const name of transportNames) {
      it(`classifies ${name} as a transport error`, () => {
        expect(isTransportError({ name })).to.equal(true);
      });
    }
  });

  describe('definitive API answers → must render a real 404, not a 5xx', () => {
    it('does NOT classify WaxChainApiError ("post does not exist") as transport', () => {
      expect(isTransportError({ name: 'WaxChainApiError' })).to.equal(false);
    });

    it('does NOT classify WaxAssertionError as transport', () => {
      expect(isTransportError({ name: 'WaxAssertionError' })).to.equal(false);
    });
  });

  describe('edge cases', () => {
    // Contract note tied to the SSR soft-404 finding: in the standalone bundle a
    // genuine transport failure can collapse to the BASE class (name 'WaxError',
    // message "Unknown request error caught"), which is intentionally NOT treated
    // as transport here — so the route falls through to notFound() rather than
    // ServiceUnavailable. That is why the fixture-injected 503 could not exercise
    // the 5xx path. If wax is fixed to preserve the specific subclass name, this
    // expectation flips and the fixture-level test becomes viable.
    it('does NOT classify the base WaxError as transport', () => {
      expect(isTransportError({ name: 'WaxError' })).to.equal(false);
    });

    it('returns false for null / undefined / string / plain object', () => {
      expect(isTransportError(null)).to.equal(false);
      expect(isTransportError(undefined)).to.equal(false);
      expect(isTransportError('boom')).to.equal(false);
      expect(isTransportError({})).to.equal(false);
    });
  });
});
