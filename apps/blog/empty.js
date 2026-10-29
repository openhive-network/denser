// Stand-in for the modules turbopack.resolveAlias in next.config.js points at: the Node
// built-ins (fs, module) in the browser, and Matrix's crypto wasm, which the chat never loads.
module.exports = {};
