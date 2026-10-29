vcl 4.1;

# The shared HTML cache in front of the blog (compose.cache.yml; README.md, "Shared HTML
# cache"). A request is looked up only when it is an anonymous page document; the
# response is stored only when the blog marks it `public` with an `s-maxage` and sets no
# cookie (packages/middleware/lib/public-cache.ts). Everything else passes untouched.

import std;

# The blog through caddy's cache-origin listener (caddy/Caddyfile.cache-origin), which
# holds a request while follow mode restarts the blog's server, as the /blog route does.
# While the probe says the blog is down, a stale object is served up to its
# stale-if-error without trying the blog first (vcl_hit).
backend blog {
	.host = "caddy";
	.port = "8081";
	.first_byte_timeout = 60s;
	.probe = {
		.url = "/blog/api/health";
		.interval = 5s;
		.timeout = 3s;
		.window = 5;
		.threshold = 3;
		.initial = 3;
	}
}

sub vcl_recv {
	if (req.restarts == 0) {
		unset req.http.X-Cache-Locale;
		unset req.http.X-Cache-Refresh;
	}
	set req.backend_hint = blog;
	# Caddy compresses for the client; stored objects stay identity.
	unset req.http.Accept-Encoding;

	if (req.method != "GET" && req.method != "HEAD") {
		return (pass);
	}
	# Requests the blog never marks public: API routes, Next's own files, the client
	# router's RSC payloads and prefetches, and signed-in readers.
	if (req.http.Authorization
	    || req.url ~ "^/[^/?]+/(api|_next)([/?]|$)"
	    || req.url ~ "[?&]_rsc([=&]|$)"
	    || req.http.RSC
	    || req.http.Next-Router-State-Tree
	    || req.http.Next-Router-Prefetch
	    || req.http.Next-Router-Segment-Prefetch
	    || req.http.Cookie ~ "(^|;)\s*([^=;]*_session(\.[^=;]*)?|observer|observer-no-own-lists|account_info)\s*=") {
		return (pass);
	}

	# The language the blog renders (apps/blog/i18n/settings.ts, resolveLocale): part of
	# the key, and the only cookie the blog still gets. Theme, NSFW and the rest are dropped.
	set req.http.X-Cache-Locale = "en";
	if (req.http.Cookie ~ "(^|;)\s*NEXT_LOCALE=(ar|en|es|fr|it|ja|ko|pl|ru|zh)\s*(;|$)") {
		set req.http.X-Cache-Locale = regsub(req.http.Cookie,
		    "^(.*;)?\s*NEXT_LOCALE=(ar|en|es|fr|it|ja|ko|pl|ru|zh)\s*(;.*)?$", "\2");
	}
	if (req.http.X-Cache-Locale == "en") {
		unset req.http.Cookie;
	} else {
		set req.http.Cookie = "NEXT_LOCALE=" + req.http.X-Cache-Locale;
	}

	# Campaign parameters never change the page; the rest of the query is sorted.
	set req.url = regsuball(req.url, "(?<=[?&])(utm_[^=&]*|fbclid|gclid)(=[^&]*)?(&|$)", "");
	set req.url = regsub(req.url, "[?&]+$", "");
	set req.url = std.querysort(req.url);

	# A stale object past its stale-while-revalidate, with the blog up: fetch, don't serve it.
	# req.grace outlives a restart.
	if (req.http.X-Cache-Refresh) {
		set req.grace = 0s;
	} else {
		unset req.grace;
	}
	return (hash);
}

sub vcl_hash {
	hash_data(req.http.host);
	hash_data(req.url);
	hash_data(req.http.X-Cache-Locale);
	return (lookup);
}

# Objects are kept for max(stale-while-revalidate, stale-if-error) past their s-maxage.
# Beyond stale-while-revalidate the request restarts and fetches, unless the probe says
# the blog is down; when that fetch fails it is served the stale object (vcl_synth).
sub vcl_hit {
	if (obj.ttl <= 0s && req.restarts == 0 && std.healthy(req.backend_hint)
	    && obj.ttl + std.duration(regsub(obj.http.Cache-Control,
	        "^(.*[,\s])?stale-while-revalidate=([0-9]+).*$", "\2s"), 0s) <= 0s) {
		set req.http.X-Cache-Refresh = "1";
		return (restart);
	}
}

# X-Cache-Refresh goes to the blog too: vcl_backend_response reads it.
sub vcl_backend_fetch {
	unset bereq.http.Accept-Encoding;
	unset bereq.http.X-Cache-Locale;
}

sub vcl_backend_response {
	if (bereq.uncacheable) {
		return (deliver);
	}
	# A failed refresh keeps the stale object.
	if (beresp.status >= 500 && (bereq.is_bgfetch || bereq.http.X-Cache-Refresh)) {
		return (abandon);
	}
	if ((beresp.status != 200 && beresp.status != 404)
	    || beresp.http.Set-Cookie
	    || beresp.http.Vary == "*"
	    || beresp.http.Cache-Control !~ "(^|,)\s*public\s*(,|$)"
	    || beresp.http.Cache-Control ~ "(^|,)\s*(private|no-store|no-cache)\s*(,|=|$)"
	    || beresp.http.Cache-Control !~ "(^|[,\s])s-maxage=[0-9]+") {
		call uncacheable;
	}

	set beresp.ttl = std.duration(regsub(beresp.http.Cache-Control,
	    "^(.*[,\s])?s-maxage=([0-9]+).*$", "\2s"), 0s);
	if (beresp.ttl <= 0s) {
		call uncacheable;
	}
	set beresp.grace = std.duration(regsub(beresp.http.Cache-Control,
	    "^(.*[,\s])?stale-while-revalidate=([0-9]+).*$", "\2s"), 0s);
	if (std.duration(regsub(beresp.http.Cache-Control,
	    "^(.*[,\s])?stale-if-error=([0-9]+).*$", "\2s"), 0s) > beresp.grace) {
		set beresp.grace = std.duration(regsub(beresp.http.Cache-Control,
		    "^(.*[,\s])?stale-if-error=([0-9]+).*$", "\2s"), 0s);
	}
	# A missing page may be published any moment.
	if (beresp.status == 404) {
		if (beresp.ttl > 30s) {
			set beresp.ttl = 30s;
		}
		set beresp.grace = 0s;
	}
	set beresp.keep = 0s;
	return (deliver);
}

# Hit-for-miss: the next request for the key goes to the blog too, uncoalesced, and is
# stored if that response is storable.
sub uncacheable {
	set beresp.uncacheable = true;
	set beresp.ttl = 30s;
	set beresp.grace = 0s;
	return (deliver);
}

sub vcl_backend_error {
	if (bereq.is_bgfetch || bereq.http.X-Cache-Refresh) {
		return (abandon);
	}
}

# A refresh that failed (vcl_hit): look up again with the object's whole grace, which
# serves the stale object within its stale-if-error, or fetches once more.
sub vcl_synth {
	if (resp.status == 503 && req.http.X-Cache-Refresh && req.restarts == 1) {
		unset req.http.X-Cache-Refresh;
		return (restart);
	}
}

sub vcl_deliver {
	if (obj.uncacheable) {
		set resp.http.X-Cache = "BYPASS";
	} elsif (obj.hits > 0) {
		set resp.http.X-Cache = "HIT";
	} else {
		set resp.http.X-Cache = "MISS";
	}
	unset resp.http.X-Varnish;
	unset resp.http.Via;
}
