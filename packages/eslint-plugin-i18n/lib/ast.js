/** AST helpers shared by the rules. */

// Attributes and props that carry text by their name: title, aria-label, label="Save", content, closeLabel, …
const TEXT_ATTRIBUTE =
  /^(aria-(label|description|roledescription|valuetext|placeholder)|title|alt|placeholder|label|content|description|tooltip|message|heading|caption|subtitle|text)$|(Label|Text|Title|Message|Description|Placeholder|Tooltip|Heading|Caption)$/;

const TYPE_WRAPPERS = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression']);

/** A t() call, also as i18n.t(). */
const isTranslateCall = (node) =>
  node?.type === 'CallExpression' &&
  ((node.callee.type === 'Identifier' && node.callee.name === 't') ||
    (node.callee.type === 'MemberExpression' && !node.callee.computed && node.callee.property.name === 't'));

/** The name of a property key, an identifier or a string. */
const keyName = (key) => {
  if (key?.type === 'Identifier') return key.name;
  if (key?.type === 'Literal' && typeof key.value === 'string') return key.value;
  return undefined;
};

/** The name of a JSX attribute, `aria-label` or `xlink:href`. */
const attributeName = (attribute) =>
  attribute.name.type === 'JSXNamespacedName'
    ? `${attribute.name.namespace.name}:${attribute.name.name.name}`
    : attribute.name.name;

/** Whether an attribute is on a DOM element (<td>, <input>) rather than a component (<UsePriceButton>). */
const isDomAttribute = (attribute) =>
  attribute.parent.name.type === 'JSXIdentifier' && /^[a-z]/.test(attribute.parent.name.name);

/** Whether `node` is a JSX child: an expression or text between an element's tags. */
const isJsxChild = (node) => node.parent?.type === 'JSXElement' || node.parent?.type === 'JSXFragment';

/**
 * Each expression `node` can evaluate to when it is shown: both branches of a ?: (at any depth),
 * both sides of a logical expression and the expression under a type assertion; else `node` itself.
 */
function renderedLeaves(node) {
  if (!node) return [];
  if (node.type === 'ConditionalExpression')
    return [...renderedLeaves(node.consequent), ...renderedLeaves(node.alternate)];
  if (node.type === 'LogicalExpression') return [...renderedLeaves(node.left), ...renderedLeaves(node.right)];
  if (TYPE_WRAPPERS.has(node.type)) return renderedLeaves(node.expression);
  return [node];
}

/** The name a function is known by: its own, its variable's, or its property's. */
function functionName(fn) {
  if (fn.id?.name) return fn.id.name;
  const parent = fn.parent;
  if (parent?.type === 'VariableDeclarator' && parent.init === fn) return parent.id.name;
  if ((parent?.type === 'Property' || parent?.type === 'MethodDefinition') && parent.value === fn)
    return keyName(parent.key);
  return undefined;
}

module.exports = {
  isTranslateCall,
  keyName,
  attributeName,
  isDomAttribute,
  isJsxChild,
  renderedLeaves,
  functionName,
  TEXT_ATTRIBUTE,
  TYPE_WRAPPERS
};
