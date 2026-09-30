import { LiteRelayValidationError, validateLiteReply, type ValidatedReply } from '@hive/lite-account';
import type { LiteRelayConfig } from './config';
import type { LiteReplyRequestInput } from './schema';

export { LiteRelayValidationError as RelayValidationError };

/** Semantic validation of a schema-checked request against this relay's configuration. */
export function validateReply(req: LiteReplyRequestInput, cfg: LiteRelayConfig, nowMs = Date.now()): ValidatedReply {
  return validateLiteReply(req, {
    gateAccount: cfg.gateAccount,
    chainId: cfg.chainId,
    maxExpirationMinutes: cfg.maxExpirationMinutes,
    maxBodyBytes: cfg.maxBodyBytes,
    nowMs
  });
}
