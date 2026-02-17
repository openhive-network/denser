import { safeJsonForScript, htmlEscapeJsonString } from './html-escape-json';

describe('htmlEscapeJsonString', () => {
  it('escapes < to prevent script breakout', () => {
    const result = htmlEscapeJsonString('</script>');
    expect(result).not.toContain('<');
    expect(result).toContain('\\u003c');
  });

  it('escapes > to prevent comment issues', () => {
    const result = htmlEscapeJsonString('-->');
    expect(result).not.toContain('>');
    expect(result).toContain('\\u003e');
  });

  it('escapes & to prevent HTML entity injection', () => {
    const result = htmlEscapeJsonString('foo&bar');
    expect(result).not.toContain('&');
    expect(result).toContain('\\u0026');
  });

  it('escapes line separator U+2028', () => {
    const result = htmlEscapeJsonString('line\u2028break');
    expect(result).toContain('\\u2028');
  });

  it('escapes paragraph separator U+2029', () => {
    const result = htmlEscapeJsonString('para\u2029break');
    expect(result).toContain('\\u2029');
  });

  it('leaves safe characters unchanged', () => {
    const result = htmlEscapeJsonString('hello world 123');
    expect(result).toBe('hello world 123');
  });
});

describe('safeJsonForScript', () => {
  it('escapes < and > to prevent script breakout', () => {
    const result = safeJsonForScript('</script><script>alert(1)');
    expect(result).not.toContain('</script>');
    expect(result).toContain('\\u003c');
    expect(result).toContain('\\u003e');
  });

  it('escapes & to prevent HTML entity injection', () => {
    const result = safeJsonForScript('foo&bar');
    expect(result).toContain('\\u0026');
  });

  it('escapes line terminators', () => {
    const result = safeJsonForScript('line\u2028break');
    expect(result).toContain('\\u2028');
  });

  it('produces valid JavaScript that evaluates to original value', () => {
    const original = 'test</script>&\u2028value';
    const escaped = safeJsonForScript(original);
    // eval is safe here - we control the input
    // eslint-disable-next-line no-eval
    const evaluated = eval(escaped);
    expect(evaluated).toBe(original);
  });

  it('handles null', () => {
    expect(safeJsonForScript(null)).toBe('null');
  });

  it('handles objects', () => {
    const obj = { key: '<script>test</script>' };
    const result = safeJsonForScript(obj);
    expect(result).not.toContain('<script>');
    expect(result).toContain('\\u003c');
  });

  it('handles arrays', () => {
    const arr = ['<', '>', '&'];
    const result = safeJsonForScript(arr);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('&');
  });
});
