import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  diffAgainstBaseline,
  mergeIntoBaseline,
  newMissesMessage,
  type IFixtureMiss,
  type IKnownMiss,
  type IMissRun
} from './known-misses.ts';

const SPEC = 'postEditCommunity.spec.ts';
const GET_COMMUNITY: IFixtureMiss = { spec: SPEC, method: 'bridge.get_community', hash: '50f0a6832c3ff911' };
const POST_HEADER: IFixtureMiss = { spec: SPEC, method: 'bridge.get_post_header', hash: 'd36fe00401414219' };
const OTHER_SPEC: IKnownMiss = { spec: 'homepage.spec.ts', method: 'bridge.get_profile', hash: 'aaaaaaaaaaaaaaaa' };
const NOTE = 'made only when the draft auto-save lands first';

const run = (misses: IFixtureMiss[], specs = [SPEC]): IMissRun => ({ specs: new Set(specs), misses });

void describe('diffAgainstBaseline', () => {
  void it('accepts a listed miss whatever its params', () => {
    const diff = diffAgainstBaseline([GET_COMMUNITY], run([{ ...GET_COMMUNITY, params: { name: 'hive-137823' } }]));

    assert.deepEqual(diff, { added: [], gone: [] });
  });

  void it('does not report an intermittent entry as gone when the run does not hit it', () => {
    const diff = diffAgainstBaseline([{ ...GET_COMMUNITY, intermittent: NOTE }], run([]));

    assert.deepEqual(diff, { added: [], gone: [] });
  });

  void it('reports an unlisted miss as added and a regular entry the run did not hit as gone', () => {
    const baseline: IKnownMiss[] = [POST_HEADER];

    const diff = diffAgainstBaseline(baseline, run([GET_COMMUNITY]));

    assert.deepEqual(diff.added, [GET_COMMUNITY]);
    assert.deepEqual(diff.gone, [POST_HEADER]);
  });

  void it('judges only the specs that ran', () => {
    const diff = diffAgainstBaseline([OTHER_SPEC], run([]));

    assert.deepEqual(diff.gone, []);
  });
});

void describe('mergeIntoBaseline', () => {
  void it('keeps an intermittent entry and its note when the run does not hit it', () => {
    const baseline: IKnownMiss[] = [{ ...GET_COMMUNITY, intermittent: NOTE }, POST_HEADER, OTHER_SPEC];

    const merged = mergeIntoBaseline(baseline, run([]));

    assert.deepEqual(merged, [OTHER_SPEC, { ...GET_COMMUNITY, intermittent: NOTE }]);
  });

  void it('keeps the note when the run hits the intermittent miss', () => {
    const merged = mergeIntoBaseline([{ ...GET_COMMUNITY, intermittent: NOTE }], run([GET_COMMUNITY, POST_HEADER]));

    assert.deepEqual(merged, [{ ...GET_COMMUNITY, intermittent: NOTE }, POST_HEADER]);
  });

  void it('writes no params into the baseline', () => {
    const merged = mergeIntoBaseline([], run([{ ...POST_HEADER, params: { author: 'a', permlink: 'p' } }]));

    assert.deepEqual(merged, [POST_HEADER]);
  });
});

void describe('newMissesMessage', () => {
  void it("prints each new miss's hash and params", () => {
    const miss: IFixtureMiss = { ...GET_COMMUNITY, params: { name: 'hive-137823', observer: '' } };

    const message = newMissesMessage([miss], 'known-misses.json', 'misses.json');

    assert.match(
      message,
      /postEditCommunity\.spec\.ts {2}bridge\.get_community {2}\(hash 50f0a6832c3ff911\) {2}params \{"name":"hive-137823","observer":""\}/
    );
  });
});
