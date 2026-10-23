import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveBackground, parseCssColor, textContrast } from './contrast.ts';

const SLATE_800 = 'rgb(30, 41, 59)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

void describe('textContrast', () => {
  void it('is 21 for black on white and 1 for a color on itself', () => {
    assert.equal(textContrast('rgb(0, 0, 0)', ['rgb(255, 255, 255)']).toFixed(2), '21.00');
    assert.equal(textContrast(SLATE_800, [SLATE_800]), 1);
  });

  void it('measures the dark proposal card colors as the WCAG formula does', () => {
    // slate-500 and red-500 on slate-800 fail AA; slate-400 and red-400 pass.
    assert.equal(textContrast('rgb(100, 116, 139)', [SLATE_800]).toFixed(2), '3.07');
    assert.equal(textContrast('rgb(239, 68, 68)', [SLATE_800]).toFixed(2), '3.89');
    assert.ok(textContrast('rgb(148, 163, 184)', [SLATE_800]) > 4.5);
    assert.ok(textContrast('rgb(248, 113, 113)', [SLATE_800]) > 4.5);
  });

  void it('looks through transparent backgrounds to the nearest painted one', () => {
    assert.equal(
      textContrast('rgb(100, 116, 139)', [TRANSPARENT, TRANSPARENT, SLATE_800]),
      textContrast('rgb(100, 116, 139)', [SLATE_800])
    );
  });

  void it('blends translucent text into its background', () => {
    assert.ok(
      textContrast('rgba(255, 255, 255, 0.5)', [SLATE_800]) < textContrast('rgb(255, 255, 255)', [SLATE_800])
    );
  });
});

void describe('effectiveBackground', () => {
  void it('paints translucent layers over the ones below and an unpainted page as white', () => {
    assert.deepEqual(effectiveBackground(['rgba(0, 0, 0, 0.5)', 'rgb(200, 200, 200)']), {
      r: 100,
      g: 100,
      b: 100,
      a: 1
    });
    assert.deepEqual(effectiveBackground([TRANSPARENT]), { r: 255, g: 255, b: 255, a: 1 });
  });
});

void describe('parseCssColor', () => {
  void it('reads the comma and space syntaxes', () => {
    assert.deepEqual(parseCssColor('rgb(1, 2, 3)'), { r: 1, g: 2, b: 3, a: 1 });
    assert.deepEqual(parseCssColor('rgb(1 2 3 / 50%)'), { r: 1, g: 2, b: 3, a: 0.5 });
  });

  void it('rejects a color it cannot measure', () => {
    assert.throws(() => parseCssColor('oklch(0.5 0.1 200)'), /Not an rgb\(\) color/);
  });
});
