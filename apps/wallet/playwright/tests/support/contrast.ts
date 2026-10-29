/**
 * WCAG 2 contrast of text against what is painted behind it, from the colors a browser computes
 * (`rgb()` / `rgba()`). Behind the text is the stack of its own and its ancestors' background
 * colors, composited over an opaque white canvas, as the page paints them when nothing else
 * (images, gradients, filters) sits in between.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** The minimum contrast WCAG AA asks of normal-size text. */
export const WCAG_AA_TEXT_CONTRAST = 4.5;

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

/** A computed `rgb(…)` / `rgba(…)` color, comma- or space-separated. */
export const parseCssColor = (value: string): Rgba => {
  const match = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!match) throw new Error(`Not an rgb() color: ${value}`);
  const [r, g, b, a = 1] = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((part) => (part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part)));
  return { r, g, b, a };
};

/** `top` painted over the opaque `bottom`. */
const over = (top: Rgba, bottom: Rgba): Rgba => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1
});

const channelLuminance = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = ({ r, g, b }: Rgba) =>
  0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);

/** The opaque color behind an element, given its and its ancestors' background colors, innermost first. */
export const effectiveBackground = (backgrounds: readonly string[]): Rgba =>
  backgrounds.map(parseCssColor).reduceRight((below, layer) => over(layer, below), WHITE);

/** The contrast ratio (1 to 21) of text in `color` over `backgrounds`, innermost first. */
export const textContrast = (color: string, backgrounds: readonly string[]): number => {
  const background = effectiveBackground(backgrounds);
  const text = over(parseCssColor(color), background);
  const [lighter, darker] = [luminance(text), luminance(background)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};
