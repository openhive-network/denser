import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionError, MatrixError } from 'matrix-js-sdk';
import { createMatrixSdkLogger, type MatrixLogSink } from './sdk-log-routing.ts';

/** A sink recording each line's level and logged values */
function recordingSink() {
  const lines: Array<{ level: 'debug' | 'error'; message: string; args: unknown[] }> = [];
  const sink: MatrixLogSink = {
    debug: (message, ...args) => lines.push({ level: 'debug', message, args }),
    error: (message, ...args) => lines.push({ level: 'error', message, args })
  };
  return { sink, lines, levels: () => lines.map((line) => line.level) };
}

const cutOffSync = () => new ConnectionError('fetch failed', new TypeError('Failed to fetch'));
const abortedSync = () => new DOMException('The user aborted a request.', 'AbortError');

describe('createMatrixSdkLogger', () => {
  it("logs the SDK's errors as errors, its warnings and info at debug, and drops the rest", () => {
    const { sink, lines, levels } = recordingSink();
    const logger = createMatrixSdkLogger(sink, new EventTarget());

    logger.error('/sync error %s', cutOffSync());
    logger.warn('Adding default global push rule');
    logger.info('Sync state');
    logger.debug('dropped');
    logger.trace('dropped');
    logger.getChild('child').error('from a child');

    assert.deepEqual(levels(), ['error', 'debug', 'debug', 'error']);
    assert.deepEqual(lines[0].message, 'Matrix chat: %o');
    assert.equal(lines[0].args.length, 1);
    const [logged] = lines[0].args;
    assert.ok(Array.isArray(logged));
    assert.equal(logged[0], '/sync error %s');
    assert.equal(logged[1].name, 'ConnectionError');
  });

  for (const event of ['pagehide', 'beforeunload']) {
    it(`logs a sync cut off after ${event} at debug, and any other error still as an error`, () => {
      const { sink, levels } = recordingSink();
      const page = new EventTarget();
      const logger = createMatrixSdkLogger(sink, page);

      page.dispatchEvent(new Event(event));
      logger.error('/sync error %s', cutOffSync());
      logger.error('/sync error %s', abortedSync());
      logger.error('/sync error %s', new MatrixError({ errcode: 'M_UNKNOWN' }, 500));
      logger.error('Caught /sync error', new Error('processing failed'));

      assert.deepEqual(levels(), ['debug', 'debug', 'error', 'error']);
    });
  }

  it('logs a cut-off sync as an error again once the page is shown from the back/forward cache', () => {
    const { sink, levels } = recordingSink();
    const page = new EventTarget();
    const logger = createMatrixSdkLogger(sink, page);

    page.dispatchEvent(new Event('pagehide'));
    page.dispatchEvent(new Event('pageshow'));
    logger.error('/sync error %s', cutOffSync());

    assert.deepEqual(levels(), ['error']);
  });

  it('logs every cut-off sync as an error without a page to watch', () => {
    const { sink, levels } = recordingSink();
    createMatrixSdkLogger(sink).error('/sync error %s', abortedSync());
    assert.deepEqual(levels(), ['error']);
  });
});
