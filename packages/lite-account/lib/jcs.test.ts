import { describe, it } from 'mocha';
import { expect } from 'chai';
import { canonicalize, JcsError } from './jcs';
import vectors from './__fixtures__/jcs-vectors.json';

/** Reference vectors generated with the Python `rfc8785` package (same source as the HAF C tests). */
describe('canonicalize (RFC 8785, L2 integer profile)', () => {
  for (const v of vectors) {
    it(`matches the rfc8785 reference: ${v.name}`, () => {
      expect(canonicalize(v.input)).to.equal(v.jcs);
    });
  }
  it('sorts keys by UTF-16 code units (astral chars before U+FF21)', () => {
    expect(canonicalize({ 'Ａ': 1, '😀': 2 })).to.equal('{"😀":2,"Ａ":1}');
  });
  it('rejects floats, unsafe integers, bigints and undefined', () => {
    expect(() => canonicalize({ x: 1.5 })).to.throw(JcsError, /floating-point/);
    expect(() => canonicalize({ x: 2 ** 53 })).to.throw(JcsError, /safe range/);
    expect(() => canonicalize({ x: -(2 ** 53) })).to.throw(JcsError, /safe range/);
    expect(() => canonicalize({ x: BigInt(1) })).to.throw(JcsError, /unsupported/);
    expect(() => canonicalize({ x: undefined })).to.throw(JcsError, /undefined/);
  });
  it('serializes -0 as 0 and escapes control characters', () => {
    expect(canonicalize([-0, 'a\u0000b\u001f"\\'])).to.equal('[0,"a\\u0000b\\u001f\\"\\\\"]');
  });
});
