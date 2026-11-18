/**
 * A wrapping row whose items are separated by middle dots ("by x · 540 HBD/day · 44 days left").
 * Each dot sits in the gap before its item, outside the item's box: an item that starts a line has its
 * dot left of the row, where the row clips it, so no line starts with "·".
 */
export const DOTTED_ROW_CLASS = 'flex flex-wrap items-center gap-x-4 overflow-x-clip';

/** An item of a DOTTED_ROW_CLASS row with a dot before it; the dot takes the item's text colour. */
export const DOTTED_ITEM_CLASS =
  "relative before:absolute before:inset-y-0 before:right-full before:flex before:w-4 before:items-center before:justify-center before:content-['·'/'']";
