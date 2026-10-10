/// <reference path="../../wax-signers-zod-core.d.ts" />
import { config } from 'wax-signers-zod-core';

// zod 4 probes `new Function('')` when it builds an object schema, to decide whether to compile
// its parsers; the nonce CSP (no 'unsafe-eval') blocks the probe and reports a violation.
// Jitless zod never probes. Must be imported before @hiveio/wax-signers-external.
config({ jitless: true });
