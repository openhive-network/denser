#!/bin/sh
# Fill homeserver.yaml from its template and .env (secrets never echoed), and make
# Synapse's signing key and log config once.
set -eu
cd "$(dirname "$0")"
. ./.env
sed -e "s|@POSTGRES_PASSWORD@|$POSTGRES_PASSWORD|" \
    -e "s|@REGISTRATION_SHARED_SECRET@|$REGISTRATION_SHARED_SECRET|" \
    -e "s|@MACAROON_SECRET_KEY@|$MACAROON_SECRET_KEY|" \
    -e "s|@FORM_SECRET@|$FORM_SECRET|" \
    -e "s|@DENSER_OAUTH_MATRIX_SECRET@|$DENSER_OAUTH_MATRIX_SECRET|" \
    synapse/homeserver.yaml.tmpl > synapse/homeserver.yaml
chmod 644 synapse/homeserver.yaml
if [ ! -f synapse/log.config ]; then
  cat > synapse/log.config <<'LOG'
version: 1
formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(request)s - %(message)s'
handlers:
  console:
    class: logging.StreamHandler
    formatter: precise
root:
  level: INFO
  handlers: [console]
disable_existing_loggers: false
LOG
fi
