const {
  attributeName,
  functionName,
  isDomAttribute,
  isJsxChild,
  isTranslateCall,
  TEXT_ATTRIBUTE,
  TYPE_WRAPPERS
} = require('../lib/ast');

// String methods whose result still shows the formatted digits: x.toFixed(3).replace(/0+$/, '').
const STRING_METHODS = new Set([
  'replace',
  'replaceAll',
  'padStart',
  'padEnd',
  'trim',
  'toString',
  'concat',
  'slice'
]);
// DOM attributes that take a value for an input or for code, not text to read.
const VALUE_ATTRIBUTE = /^(value|defaultValue|min|max|step|key|data-.*)$/;
// A helper whose result is for reading: formatRcSummary, displayAmount, amountLabel; not formatRcInput.
const DISPLAY_HELPER = /^(format|display)[A-Z_]|(Label|Text|Summary|Title)$/;
const VALUE_HELPER = /(Input|Value|Raw)$/;
const LIBRARY_DATES = new Set(['dayjs', 'moment']);

const isMethodCall = (node, names) =>
  node?.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  !node.callee.computed &&
  names.has(node.callee.property.name);

/** Whether a .format() call formats a date of dayjs or moment: dayjs(date).utc().format('LL'). */
function isLibraryDateFormat(node) {
  if (!isMethodCall(node, new Set(['format']))) return false;
  let object = node.callee.object;
  while (object.type === 'CallExpression' || object.type === 'MemberExpression') {
    if (object.type === 'CallExpression' && object.callee.type === 'Identifier')
      return LIBRARY_DATES.has(object.callee.name);
    object = object.type === 'CallExpression' ? object.callee : object.object;
  }
  return object.type === 'Identifier' && LIBRARY_DATES.has(object.name);
}

/** The outermost expression that still holds `node`'s text unchanged: String(x), x.replace(), a ?: branch. */
function carriedValue(node) {
  for (;;) {
    const parent = node.parent;
    if (
      parent.type === 'MemberExpression' &&
      parent.object === node &&
      isMethodCall(parent.parent, STRING_METHODS)
    ) {
      node = parent.parent;
    } else if (
      parent.type === 'CallExpression' &&
      parent.callee.type === 'Identifier' &&
      parent.callee.name === 'String' &&
      parent.arguments[0] === node
    ) {
      node = parent;
    } else if (
      (parent.type === 'ConditionalExpression' && parent.test !== node) ||
      parent.type === 'LogicalExpression' ||
      TYPE_WRAPPERS.has(parent.type)
    ) {
      node = parent;
    } else {
      return node;
    }
  }
}

/** The function `node` is the result of: its concise body, or the argument of one of its returns. */
function returningFunction(node) {
  const parent = node.parent;
  if (parent.type === 'ArrowFunctionExpression' && parent.body === node) return parent;
  if (parent.type !== 'ReturnStatement') return undefined;
  for (let scope = parent.parent; scope; scope = scope.parent) {
    if (/Function/.test(scope.type)) return scope;
  }
  return undefined;
}

/** Whether an object is the interpolation values of a t() call or of a <Trans values={{ … }}>. */
const isTranslationValues = (object) =>
  (isTranslateCall(object.parent) && object.parent.arguments.includes(object)) ||
  (object.parent.type === 'JSXExpressionContainer' &&
    object.parent.parent.type === 'JSXAttribute' &&
    attributeName(object.parent.parent) === 'values');

/** Whether an attribute shows its value: a DOM element's, but an input's value, or a component's text prop. */
const isShownAttribute = (attribute) => {
  const name = attributeName(attribute);
  return isDomAttribute(attribute) ? !VALUE_ATTRIBUTE.test(name) : TEXT_ATTRIBUTE.test(name);
};

/** Whether the text `node` gives is shown: rendered, put in a template, a concatenation or t(), or returned by a display helper. */
function isShown(node) {
  const value = carriedValue(node);
  const parent = value.parent;
  switch (parent.type) {
    case 'JSXExpressionContainer':
      return isJsxChild(parent) || (parent.parent.type === 'JSXAttribute' && isShownAttribute(parent.parent));
    case 'TemplateLiteral':
      return true;
    case 'BinaryExpression':
      return parent.operator === '+';
    case 'Property':
      return (
        parent.value === value &&
        parent.parent.type === 'ObjectExpression' &&
        isTranslationValues(parent.parent)
      );
    default: {
      const fn = returningFunction(value);
      const name = fn && functionName(fn);
      return Boolean(name && DISPLAY_HELPER.test(name) && !VALUE_HELPER.test(name));
    }
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Format numbers and dates for display with @ui/lib/locale-format' },
    messages: {
      format:
        'Format numbers, amounts and dates for display with @ui/lib/locale-format (formatNumber, formatAmount, formatDateTime, …) and the active locale.'
    },
    schema: []
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'format' });
    return {
      CallExpression(node) {
        if ((isMethodCall(node, new Set(['toFixed'])) || isLibraryDateFormat(node)) && isShown(node))
          report(node);
        // The runtime's default locale, or whichever the caller happened to pass.
        if (isMethodCall(node, new Set(['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'])))
          report(node);
      },
      // new Intl.NumberFormat(…), and Intl.NumberFormat(…), which constructs one as well.
      'NewExpression, CallExpression'(node) {
        const { callee } = node;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Intl' &&
          /Format$/.test(callee.property.name ?? '')
        ) {
          report(node);
        }
      }
    };
  }
};
