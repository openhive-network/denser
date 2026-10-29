/** The configured gateway base URL (`DENSER_SERVER_LITE_GATEWAY_URL`, see `gateway.ts`), or none. */
export function liteGatewayUrl(): string | undefined {
  const url = (process.env.DENSER_SERVER_LITE_GATEWAY_URL ?? '').trim().replace(/\/+$/, '');
  return url === '' ? undefined : url;
}
