const { createTextMatcher } = require('../lib/text');
const { isJsxChild, isTranslateCall, renderedLeaves } = require('../lib/ast');

const MARKUP = new Set(['JSXElement', 'JSXFragment']);

const isBlank = (node) =>
  (node.type === 'JSXText' && node.value.trim() === '') ||
  (node.type === 'JSXExpressionContainer' &&
    (node.expression.type === 'JSXEmptyExpression' ||
      (node.expression.type === 'Literal' &&
        typeof node.expression.value === 'string' &&
        node.expression.value.trim() === '')));

/** Whether an expression can give text: anything but markup, nothing, or a markup-only `cond && <b />`. */
function givesText(node) {
  if (node.type === 'LogicalExpression' && node.operator === '&&') return givesText(node.right);
  const leaves = renderedLeaves(node);
  if (leaves.length > 1 || leaves[0] !== node) return leaves.some(givesText);
  return (
    !MARKUP.has(node.type) &&
    !(node.type === 'Literal' && (node.value === null || typeof node.value === 'boolean'))
  );
}

/** Whether a JSX child renders text beside a translation. */
const rendersText = (child) => child.type === 'JSXExpressionContainer' && givesText(child.expression);

/** The nearest children of `container`'s element on either side, past blanks (whitespace, {' '}, comments). */
function neighbours(container) {
  const siblings = container.parent.children;
  const index = siblings.indexOf(container);
  const nearest = (step) => {
    for (let i = index + step; i >= 0 && i < siblings.length; i += step) {
      if (!isBlank(siblings[i])) return siblings[i];
    }
    return undefined;
  };
  return [nearest(-1), nearest(1)].filter(Boolean);
}

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Translate a whole sentence in one key instead of joining translated fragments' },
    messages: {
      join: 'Do not join translated fragments into a sentence: put the whole sentence in one key with {{placeholders}}, use <Trans>, or formatList() from @ui/lib/locale-format.'
    },
    schema: [
      {
        type: 'object',
        properties: { untranslatedNames: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false
      }
    ]
  },
  create(context) {
    const { untranslatedNames = [] } = context.options[0] ?? {};
    const { isText } = createTextMatcher(untranslatedNames);
    const report = (node) => context.report({ node, messageId: 'join' });

    /** Whether a template holds more than the translation, or words of its own; a title's site name affix
     * (`${t('page_titles.market')} - Hive`) is neither. */
    const joinsTemplate = (template) =>
      template.expressions.length > 1 || template.quasis.some((quasi) => isText(quasi.value.raw));

    return {
      CallExpression(node) {
        if (!isTranslateCall(node)) return;
        const parent = node.parent;
        if (parent.type === 'BinaryExpression' && parent.operator === '+') report(node);
        if (parent.type === 'TemplateLiteral' && joinsTemplate(parent)) report(node);
        if (
          parent.type === 'ArrayExpression' &&
          parent.parent.type === 'MemberExpression' &&
          parent.parent.object === parent &&
          parent.parent.property.name === 'join' &&
          parent.parent.parent.type === 'CallExpression'
        ) {
          report(node);
        }
        // {t('a.claim')}{formatList(items)}: a fragment rendered beside another expression.
        if (parent.type === 'JSXExpressionContainer' && isJsxChild(parent)) {
          if (neighbours(parent).some(rendersText)) report(node);
        }
      }
    };
  }
};
