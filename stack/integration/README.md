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
3. Once every app in `status/deployed.json` runs the checkout's HEAD (the promoted tip),
   `upgrade.sh` runs `lighthouse.sh`: a Lighthouse check of that revision (below).

No GitLab CI is involved.

## Lighthouse after each promote

`lighthouse.sh` measures each revision of `aidev/integration` once, after the site
serves it: it waits for `https://$SITE_HOST/status/deployed.json` to report the
revision for blog and wallet, then runs Lighthouse (mobile, in the pinned
`gitlab-ci-utils/lighthouse` image, 2 CPUs, one run at a time) 3 times on each route
and compares the median performance score, LCP, TBT, CLS and transferred JS with the
`integration` section of `scripts/ci-helpers/lighthouse-thresholds.json`. That section
is also the list of routes. `lcp-lazy-loaded: false` there flags a route whose LCP
image is `loading="lazy"` (Lighthouse's own LCP discovery check).

- **Results:** `https://$SITE_HOST/status/lighthouse/<revision>.json` and
  `/status/lighthouse/latest.json`, with `"status": "pass"` or `"breach"` and each
  breach named per route. A breach is also logged in the upgrade unit's journal
  (`journalctl -u 'denser-integration-upgrade@*'`).
- **Advisory:** a breach never fails or rolls back the upgrade.
- **Bounded:** one check (12 Lighthouse runs, about 5 minutes) per promoted revision.
  A revision whose images never deploy, or that a later promote overtakes before it
  is served, is not measured. With `DENSER_TAG` pinned the site never serves the
  tip, so nothing is measured.
- **By hand:** `./lighthouse.sh --force` measures the deployed tip again.
- **Thresholds** are the medians measured on 2026-10-05 with headroom for noise:
  single mobile runs of one build differ by seconds of LCP, which is why each route
  takes the median of 3. Tighten a route's limits as its performance improves.

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
