# Matrix test deployment for denser's chat

A closed Matrix homeserver and Element Web for denser's chat widget in Matrix mode
(`CHAT_PROVIDER=matrix`), next to the integration site (`../integration`).

- **https://matrix.discuss.peerverity.info**: Synapse (`/_matrix`, `/_synapse`) with
  PostgreSQL. No federation, no open registration. Ordinary users sign in only through
  SSO with denser's OAuth server (IdP `oidc-denser`, client `matrix`), as
  `@<hive name>:matrix.discuss.peerverity.info`, and join `#general` on their first sign-in.
- **https://chat.discuss.peerverity.info**: Element Web, which only denser's site may frame.
  It also serves `/denser-session.html` (`chat-origin/`), where denser's widget starts: it
  keeps Element's session when it is the expected user's, and otherwise clears Element's
  storage and signs in through SSO. Loaded without a user, it only clears that storage;
  the widget does so when its user signs out or switches account.
- **Host:** predicate-testing.syncad.com, `~/matrix-test`, behind `~/sites-router`. caddy
  listens on 127.0.0.5 and takes the client address from the router's PROXY header.

## Setup

```bash
cp .env.example .env   # fill in every value: openssl rand -hex 32 for the secrets,
                       # DENSER_OAUTH_MATRIX_SECRET as denser's DENSER_SERVER_OAUTH_MATRIX_SECRET,
                       # CLOUDFLARE_API_TOKEN for the zone
./setup.sh             # writes synapse/homeserver.yaml (and synapse/log.config once)
docker compose up -d
# route the names: two lines in ~/sites-router/sites.map, then ./render.sh there
#   matrix.discuss.peerverity.info    matrix-test-caddy-1
#   chat.discuss.peerverity.info      matrix-test-caddy-1
```

Re-run `./setup.sh` and `docker compose restart synapse` after changing `.env` or
`synapse/homeserver.yaml.tmpl`. Neither `.env` nor `synapse/homeserver.yaml` is committed.

An admin account (a password login; ordinary users have none), for the admin API and room setup:

```bash
docker compose exec synapse register_new_matrix_user -c /config/homeserver.yaml \
  --admin -u admin http://localhost:8008
```

Create `#general:matrix.discuss.peerverity.info` as that admin once; new users are
joined to it, and Synapse does not create it (`autocreate_auto_join_rooms: false`).

## denser's side

On the integration site, in `../integration/.env` (its compose passes them to the blog and wallet
as `REACT_APP_CHAT_PROVIDER`, `REACT_APP_MATRIX_ELEMENT_URL`, `REACT_APP_MATRIX_HOMESERVER_URL`,
`REACT_APP_LOGIN_AUTHENTICATE_ON_BACKEND`), then `./upgrade.sh` there:

```bash
CHAT_PROVIDER=matrix
# Required: the widget shows, and denser's OAuth authorizes, only a user the server signed in.
LOGIN_AUTHENTICATE_ON_BACKEND=yes
MATRIX_ELEMENT_URL=https://chat.discuss.peerverity.info
MATRIX_HOMESERVER_URL=https://matrix.discuss.peerverity.info
DENSER_SERVER_OAUTH_MATRIX_SECRET=<DENSER_OAUTH_MATRIX_SECRET of this .env>
```

Elsewhere the app settings are `REACT_APP_CHAT_PROVIDER`, `REACT_APP_MATRIX_ELEMENT_URL`,
`REACT_APP_MATRIX_HOMESERVER_URL`, `REACT_APP_LOGIN_AUTHENTICATE_ON_BACKEND=yes`,
`REACT_APP_MATRIX_SERVER_NAME` (default: the homeserver's host), `REACT_APP_MATRIX_IDP_ID` (default `oidc-denser`), and on the blog's server
`DENSER_SERVER_OAUTH_MATRIX_SECRET` and, optionally, `DENSER_SERVER_OAUTH_MATRIX_REDIRECT_URI`
(default `<homeserver>/_synapse/client/oidc/callback`).

The widget shows for a user the server signed in (strict login, or any with
`REACT_APP_OPENHIVE_CHAT_ALLOW_NON_STRICT_LOGIN=yes`), limited to
`REACT_APP_OPENHIVE_CHAT_ALLOWED_USERS` when that is set. denser's `authorize` issues the
code at once to a signed-in user, without a consent page, so the drawer opens straight into Element.
