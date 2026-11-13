vcl 4.1;

# The bot gate (compose.bot-gate.yml; README.md, "Bot gate"): asked by caddy, before it
# routes, about every page document of the blog and the wallet (caddy/Caddyfile.bot-gate
# picks those requests and sends the client's address as X-Gate-Client). It never
# fetches anything: a 204 lets caddy carry on to the app, any other answer goes to the
# client as it is.

import std;
import vsthrottle;

backend default none;

# Never gated: the fleet's tests, live checks and probes come from these.
acl gate_lan {
	"127.0.0.0"/8;
	"10.0.0.0"/8;
	"172.16.0.0"/12;
	"192.168.0.0"/16;
	"::1";
	"fc00::"/7;
}

sub vcl_recv {
	# X-Gate-Test: 1 puts an exempt client through the gate, to test it.
	if (!req.http.X-Gate-Test && std.ip(req.http.X-Gate-Client, "192.0.2.1") ~ gate_lan) {
		return (synth(204));
	}
	# A typed navigation (Sec-Fetch-Site: none) never carries a Referer; the crawl of
	# 2026-11-13 sends the bare site origin as one.
	if (req.http.Sec-Fetch-Site == "none" && req.http.Referer ~ "^https?://[^/]+/?$") {
		return (synth(403, "Forbidden"));
	}
	# 60 page documents a minute per client address; past that, 429 for 5 minutes.
	if (vsthrottle.is_denied(req.http.X-Gate-Client, 60, 60s, 300s)) {
		return (synth(429, "Too Many Requests"));
	}
	# Signed-in readers (the cookies varnish/default.vcl passes) have run the app already;
	# everyone else proves a JS engine once. The cookie is not part of the HTML cache's key.
	if (req.http.Cookie !~ "(^|;)\s*denser_human=1\s*(;|$)"
	    && req.http.Cookie !~ "(^|;)\s*([^=;]*_session(\.[^=;]*)?|observer|observer-no-own-lists|account_info)\s*=") {
		return (synth(200, "Challenge"));
	}
	return (synth(204));
}

sub vcl_synth {
	unset resp.http.X-Varnish;
	if (resp.status == 204) {
		return (deliver);
	}
	set resp.http.Cache-Control = "no-store";
	set resp.http.Content-Type = "text/html; charset=utf-8";
	if (resp.status == 429) {
		set resp.http.Retry-After = "300";
	}
	# The cookie is set only where it can be (Secure needs https), and the page reloads
	# only once it is, so a browser refusing it doesn't reload forever.
	if (resp.status == 200) {
		synthetic({"<!doctype html><html><head><meta name="robots" content="noindex"><title>Loading…</title><script>document.cookie="denser_human=1; Max-Age=2592000; Path=/; SameSite=Lax"+(location.protocol=="https:"?"; Secure":"");if(/(^|;)\s*denser_human=1/.test(document.cookie))location.reload();</script></head><body><noscript>This site needs JavaScript.</noscript></body></html>"});
	} else {
		synthetic(resp.reason);
	}
	return (deliver);
}
