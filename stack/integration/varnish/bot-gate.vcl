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
	# only once it is, so a browser refusing it doesn't reload forever; it says why
	# instead, in the first of navigator.languages it has the message in (the blog's
	# locales; English otherwise), with <html lang> to match. A browser that keeps the cookie
	# and has no NEXT_LOCALE yet gets that language as NEXT_LOCALE (English needs none), so
	# the reload renders, and finds in the HTML cache, the page in it. The script follows the
	# message's element, so it can fill it at once. A quote right before a closing brace
	# would end the long string, hence the space before the map's closing brace.
	if (resp.status == 200) {
		synthetic({"<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Loading…</title></head><body><p id="gate"></p><noscript>This site needs JavaScript.</noscript><script>document.cookie="denser_human=1; Max-Age=2592000; Path=/; SameSite=Lax"+(location.protocol=="https:"?"; Secure":"");var stored=/(^|;)\s*denser_human=1/.test(document.cookie);var messages={en:"This site needs cookies to continue. Please allow cookies for this site and reload.",ar:"يحتاج هذا الموقع إلى ملفات تعريف الارتباط للمتابعة. يرجى السماح بملفات تعريف الارتباط لهذا الموقع وإعادة تحميل الصفحة.",es:"Este sitio necesita cookies para continuar. Permite las cookies para este sitio y vuelve a cargar la página.",fr:"Ce site a besoin de cookies pour continuer. Veuillez autoriser les cookies pour ce site et recharger la page.",it:"Questo sito ha bisogno dei cookie per continuare. Consenti i cookie per questo sito e ricarica la pagina.",ja:"このサイトを続けて表示するには Cookie が必要です。このサイトの Cookie を許可して、再読み込みしてください。",ko:"계속하려면 이 사이트에 쿠키가 필요합니다. 이 사이트의 쿠키를 허용한 후 새로고침하세요.",pl:"Ta strona potrzebuje plików cookie, aby kontynuować. Zezwól na pliki cookie dla tej strony i odśwież ją.",ru:"Этому сайту нужны файлы cookie, чтобы продолжить. Разрешите файлы cookie для этого сайта и перезагрузите страницу.",zh:"本网站需要 Cookie 才能继续。请允许本网站使用 Cookie 并重新加载页面。" },lang="en",wanted=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""];for(var i=0;i<wanted.length;i++){var code=String(wanted[i]).toLowerCase().split("-")[0];if(messages.hasOwnProperty(code)){lang=code;break;}}document.documentElement.lang=lang;if(lang=="ar")document.documentElement.dir="rtl";document.getElementById("gate").textContent=stored?"Loading…":messages[lang];if(stored&&lang!="en"&&!/(^|;)\s*NEXT_LOCALE=/.test(document.cookie))document.cookie="NEXT_LOCALE="+lang+"; Max-Age=31536000; Path=/; SameSite=Lax";if(stored)location.reload();</script></body></html>"});
	} else {
		synthetic(resp.reason);
	}
	return (deliver);
}
