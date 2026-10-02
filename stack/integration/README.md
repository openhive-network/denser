# denser integration site

The tip of `aidev/integration`, deployed for anyone to try: denser's counterpart of
discuss.syncad.com (ratings). Laid out like hive/haf_api_node's `ui` profile, which is
how API nodes run denser: the `blog-subdirectory` / `wallet-subdirectory` images, with
the blog at `/blog` and the wallet at `/wallet` on one hostname.

- **URL:** https://denser.discuss.peerverity.info/blog (wallet: `/wallet`, status:
  `/status/deployed.json`).
- **Host:** predicate-testing.syncad.com, `~/denser-integration/stack/integration`,
  behind `~/sites-router` (haproxy on 192.168.50.199 that routes by TLS SNI). The site's
  caddy listens on 127.0.0.4 and takes the client address from the router's PROXY
  header. `*.discuss.peerverity.info` resolves there internally and publicly.
- **Network:** `DENSER_NETWORK=mainnet` (default, api.hive.blog) or `mirrornet`
  (api.fake.openhive.network); see `networks/`. Switching is a restart, not a rebuild:
  edit `.env`, then `docker compose up -d`.
  On mainnet, logging in signs **real** transactions.

## How it updates

1. A promote of an AIDEV session into `aidev/integration` publishes
   `registry.gitlab.syncad.com/hive/denser/{blog,wallet}-subdirectory:<sha>` and moves
   their `:integration` tag (`.aidev/project.yaml` `publish:`).
2. `systemd/denser-integration-upgrade@.timer` runs `upgrade.sh --quiet` every 5
   minutes. It fast-forwards this checkout, pulls, recreates what changed and rewrites
   `status/deployed.json` (image digests and `org.opencontainers.image.revision`).

No GitLab CI is involved.

## Setup (done once per host)

```bash
git clone --branch aidev/integration git@gitlab.syncad.com:hive/denser.git ~/denser-integration
cd ~/denser-integration/stack/integration
cp .env.example .env    # fill in CLOUDFLARE_API_TOKEN (the zone of SITE_HOST) and
                        # DENSER_SERVER_SECRET_COOKIE_PASSWORD (openssl rand -hex 32)
./upgrade.sh
# route the name: one line in ~/sites-router/sites.map, then ./render.sh there
#   denser.discuss.peerverity.info    denser-integration-caddy-1
sudo cp systemd/denser-integration-upgrade@.* /etc/systemd/system/
inst=$(systemd-escape --path "$PWD")
sudo systemctl daemon-reload && sudo systemctl enable --now "denser-integration-upgrade@${inst}.timer"
```

To pin a version, set `DENSER_TAG=<sha8>` in `.env`. To follow a release instead, set
the tag that release publishes.
