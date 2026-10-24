# Matrix test deployment for denser's chat

A closed Matrix homeserver and Element Web for denser's chat widget in Matrix mode
(`CHAT_PROVIDER=matrix`), next to the integration site (`../integration`).

- **https://matrix.discuss.peerverity.info**: Synapse (`/_matrix`, `/_synapse/client`, and
  `/_synapse/admin` from private addresses only) with PostgreSQL. No federation, no open registration. Ordinary users sign in only through
  SSO with denser's OAuth server (IdP `oidc-denser`, client `matrix`), as
  `@<hive name>:matrix.discuss.peerverity.info`, and join `#general` on their first sign-in.
- **https://chat.discuss.peerverity.info**: Element Web, which only denser's site may frame.
  It also serves `/denser-session.html` (`chat-origin/`), where denser's widget starts: it
  keeps Element's session when it is the expected user's, and otherwise clears Element's
  storage and signs in through SSO. Loaded without a user, it only clears that storage;
  the widget does so when its user signs out or switches account.
- **Host:** predicate-testing.syncad.com, `~/matrix-test`, behind `~/sites-router`. caddy
  listens on 127.0.0.5 and takes the client address from the router's PROXY header.
  The host uses BBR congestion control (`/etc/sysctl.d/90-bbr.conf`, plus `sysctls:` on the
  router's haproxy service), because clients in Poland are 134 ms away.

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

denser deletes a user's Matrix devices when they sign out of denser or switch account
(`DENSER_SERVER_MATRIX_ADMIN_TOKEN` below), since Element's sign-out in the browser leaves
them, with their access tokens, on Synapse. That needs an access token of the admin, from a
password login:

```bash
curl -s https://matrix.discuss.peerverity.info/_matrix/client/v3/login \
  -d '{"type":"m.login.password","identifier":{"type":"m.id.user","user":"admin"},"password":"<admin password>","device_id":"denser-admin-api"}' \
  | jq -r .access_token
```

Keep that device: logging it out (or deleting it) revokes the token.

caddy routes the admin API (`/_synapse/admin/*`), which that cleanup calls, only for
private client addresses (`remote_ip private_ranges`): denser's blog and wallet reach it from
this LAN, and caddy sees an internet client's real, public address through the router's PROXY
header, so it gets the catch-all 404. The admin token still gates every call.

## Encryption is off

The chat rooms are public and unencrypted, so end-to-end encryption protects nothing here,
while Element's cross-signing makes every drawer sign-in (a new device, as the session page
clears Element's storage) stop at a blocking "Confirm your digital identity" screen.
`/.well-known/matrix/client` (caddy) therefore carries
`"io.element.e2ee": {"default": false, "force_disable": true}`: Element creates no
encrypted rooms and no cross-signing keys. An account that already has cross-signing keys
still gets the blocking screen until those keys are reset.

Element has no setting for its "Verify this device" toast, which can still show once after a
sign-in; it is dismissable. `UIFeature.BulkUnverifiedSessionsReminder: false` in
`element/config.json` hides the reminder about the account's other unverified sessions, and
denser's device cleanup at sign-out leaves none.

In the drawer, Element follows denser's light or dark theme: the widget passes denser's resolved
theme to the session page (`theme=light|dark`), which sets it, with "use system theme" off, in
Element's device settings (`localStorage` `mx_local_settings`, merged into the settings there)
before continuing into Element or SSO. A change of denser's theme loads the session page again
with the new theme, keeping the same user's session. Element opened on its own, outside the
drawer, defaults to the dark theme (`default_theme` and `use_system_theme: false` in
`element/config.json`).

## denser's side

On the integration site, in `../integration/.env` (its compose passes them to the blog and wallet
as `REACT_APP_CHAT_PROVIDER`, `REACT_APP_MATRIX_ELEMENT_URL`, `REACT_APP_MATRIX_HOMESERVER_URL`,
`REACT_APP_MATRIX_DEFAULT_ROOM`, `REACT_APP_LOGIN_AUTHENTICATE_ON_BACKEND`, and
`DENSER_SERVER_MATRIX_ADMIN_TOKEN` as is), then `./upgrade.sh` there:

```bash
CHAT_PROVIDER=matrix
# Required: the widget shows, and denser's OAuth authorizes, only a user the server signed in.
LOGIN_AUTHENTICATE_ON_BACKEND=yes
MATRIX_ELEMENT_URL=https://chat.discuss.peerverity.info
MATRIX_HOMESERVER_URL=https://matrix.discuss.peerverity.info
DENSER_SERVER_OAUTH_MATRIX_SECRET=<DENSER_OAUTH_MATRIX_SECRET of this .env>
# Optional: deletes the user's Matrix devices at sign-out (the admin token above)
DENSER_SERVER_MATRIX_ADMIN_TOKEN=<admin access token>
# Optional: the room the drawer opens in; default #general:matrix.discuss.peerverity.info
MATRIX_DEFAULT_ROOM=
```

Elsewhere the app settings are `REACT_APP_CHAT_PROVIDER`, `REACT_APP_MATRIX_ELEMENT_URL`,
`REACT_APP_MATRIX_HOMESERVER_URL`, `REACT_APP_LOGIN_AUTHENTICATE_ON_BACKEND=yes`,
`REACT_APP_MATRIX_SERVER_NAME` (default: the homeserver's host), `REACT_APP_MATRIX_IDP_ID` (default `oidc-denser`),
`REACT_APP_MATRIX_DEFAULT_ROOM` (the room alias or ID the drawer opens in, after SSO and when
Element already holds the session; default `#general:<server name>`),
`REACT_APP_MATRIX_CHAT_PRELOAD` (when the widget loads Element, hidden in the closed drawer, so the
first opening is as fast as a reopen: `idle`, the default, a few seconds after the page loads and
on pointing at, focusing or pressing the chat button; `intent`, on the button only; `off`, on
opening the drawer; never on idle under the browser's Save-Data), and on the blog's server
`DENSER_SERVER_OAUTH_MATRIX_SECRET` and, optionally, `DENSER_SERVER_OAUTH_MATRIX_REDIRECT_URI`
(default `<homeserver>/_synapse/client/oidc/callback`). On the blog's and wallet's servers,
`DENSER_SERVER_MATRIX_ADMIN_TOKEN` (the admin token above; empty: no device cleanup) makes
sign-out and account switches delete the user's Matrix devices
(`GET /_synapse/admin/v2/users/<user id>/devices`, then `POST .../delete_devices`), in the
background with a 5 s bound per call; a failure is logged, without the token, and does not hold
up the sign-out. Signing in again as the same user keeps the devices.

The widget shows for a user the server signed in (strict login, or any with
`REACT_APP_OPENHIVE_CHAT_ALLOW_NON_STRICT_LOGIN=yes`), limited to
`REACT_APP_OPENHIVE_CHAT_ALLOWED_USERS` when that is set. denser's `authorize` issues the
code at once to a signed-in user, without a consent page, so the drawer opens straight into Element.
