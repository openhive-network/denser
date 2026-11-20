const { createTextMatcher } = require('../lib/text');
const { attributeName, isJsxChild, keyName, renderedLeaves, TEXT_ATTRIBUTE } = require('../lib/ast');

// DOM attributes read out or shown as text: a dotted key here is no less text than a sentence.
const DOM_TEXT_ATTRIBUTE = /^(aria-label|placeholder|title|alt)$/;
// Attributes whose values are never text: class names, styles, addresses, identifiers.
const CODE_ATTRIBUTE = /^(className|class|style|href|src|srcSet|id|key|htmlFor|data-.*)$/;
// An object's title, description or label: a toast and its builders' results, a select option, page metadata.
const TEXT_PROPERTY = /^(title|description|label)$/;
const MESSAGE_CALLEE = /^(toast|handleError)$/;
// A default label of a shared component (closeLabel = 'Close'): take the translated text as a prop instead.
const TEXT_PARAMETER = /^(label|text|title)$|(Label|Text|Title)$/;

/** Whether `property` is the `message` of an object handed to toast() or handleError(), at any depth. */
function isToastMessage(property) {
  if (keyName(property.key) !== 'message') return false;
  for (let node = property.parent; node; node = node.parent) {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      MESSAGE_CALLEE.test(node.callee.name)
    ) {
      return true;
    }
    if (node.type.startsWith('Function') || node.type === 'ArrowFunctionExpression') return false;
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Translate user-facing text with t() instead of a string literal' },
    messages: { translate: 'Translate user-facing text with t() instead of a string literal.' },
    schema: [
      {
        type: 'object',
        properties: {
          untranslatedNames: { type: 'array', items: { type: 'string' } },
          jsxOnly: { type: 'boolean' }
        },
        additionalProperties: false
      }
    ]
  },
  create(context) {
    const { untranslatedNames = [], jsxOnly = false } = context.options[0] ?? {};
    const { isText, isTemplateText, isProse } = createTextMatcher(untranslatedNames);
    const report = (node) => context.report({ node, messageId: 'translate' });

    /** Reports the text `expression` shows: a string or template in any of its branches. */
    const checkShown = (expression, isWholeText) => {
      for (const leaf of renderedLeaves(expression)) {
        if (leaf.type === 'Literal' && isWholeText(leaf.value)) report(leaf);
        if (leaf.type !== 'TemplateLiteral') continue;
        if (leaf.expressions.length === 0) {
          if (isWholeText(leaf.quasis[0].value.cooked)) report(leaf.quasis[0]);
          continue;
        }
        leaf.quasis.filter((quasi) => isTemplateText(quasi.value.raw)).forEach(report);
      }
    };
    const isStringText = (value) => isText(value, { allowKeys: true });

    const jsxListeners = {
      JSXText(node) {
        if (isText(node.value)) report(node);
      },
      JSXExpressionContainer(node) {
        if (isJsxChild(node)) checkShown(node.expression, isStringText);
      },
      JSXAttribute(node) {
        if (!node.value) return;
        const name = attributeName(node);
        if (CODE_ATTRIBUTE.test(name)) return;
        const domText = DOM_TEXT_ATTRIBUTE.test(name);
        const isWholeText = domText || TEXT_ATTRIBUTE.test(name) ? isStringText : isProse;
        if (node.value.type === 'Literal') {
          if (domText ? isText(node.value.value) : isWholeText(node.value.value)) report(node.value);
        } else if (node.value.type === 'JSXExpressionContainer') {
          checkShown(node.value.expression, isWholeText);
        }
      }
    };
    if (jsxOnly) return jsxListeners;

    return {
      ...jsxListeners,
      Property(node) {
        if (TEXT_PROPERTY.test(keyName(node.key) ?? '') || isToastMessage(node))
          checkShown(node.value, isStringText);
      },
      AssignmentPattern(node) {
        if (node.left.type === 'Identifier' && TEXT_PARAMETER.test(node.left.name))
          checkShown(node.right, isStringText);
      }
    };
  }
};
