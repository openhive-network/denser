export * from "./app-types";
export * from "./extended-hive.chain";
// NOTE: hive-chain-service (the wax runtime — createHiveChain → ~2.4 MB WASM) is
// intentionally NOT re-exported here. This entry is types-only so that bundles
// importing only types (e.g. the post feed) don't pull wax. Import the runtime
// from '@hive/common-hiveio-packages/wax/chain' instead.
