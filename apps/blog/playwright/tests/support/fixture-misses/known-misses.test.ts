import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  diffAgainstBaseline,
  mergeIntoBaseline,
  type IFixtureMiss,
  type IKnownMiss,
  type IMissRun
} from './known-misses.ts';

const SPEC = 'postEditCommunity.spec.ts';
const GET_COMMUNITY: IFixtureMiss = { spec: SPEC, method: 'bridge.get_community', hash: '50f0a6832c3ff911' };
const POST_HEADER: IFixtureMiss = { spec: SPEC, method: 'bridge.get_post_header', hash: 'd36fe00401414219' };
const OTHER_SPEC: IKnownMiss = { spec: 'homepage.spec.ts', method: 'bridge.get_profile', hash: 'aaaaaaaaaaaaaaaa' };
const NOTE = 'made only when the draft auto-save lands first';

const repoBaseline: IKnownMiss[] = JSON.parse(
  fs.readFileSync(new URL('../../fixture/known-misses.json', import.meta.url), 'utf-8')
);

const run = (misses: IFixtureMiss[], specs = [SPEC]): IMissRun => ({ specs: new Set(specs), misses });

void describe('diffAgainstBaseline', () => {
  void it('accepts the postEditCommunity get_community miss with the repository baseline', () => {
    const diff = diffAgainstBaseline(repoBaseline, run([GET_COMMUNITY]));

    assert.deepEqual(diff.added, []);
  });

  void it('does not report the intermittent get_community entry as gone when the run does not hit it', () => {
    const diff = diffAgainstBaseline(repoBaseline, run([]));

    assert.deepEqual(diff.added, []);
    assert.ok(!diff.gone.some((m) => m.method === GET_COMMUNITY.method && m.hash === GET_COMMUNITY.hash));
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
});
