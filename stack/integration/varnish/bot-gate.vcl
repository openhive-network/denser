vcl 4.1;

# The bot gate (compose.bot-gate.yml; README.md, "Bot gate"): asked by caddy, before it
# routes, about every page document of the blog and the wallet (caddy/Caddyfile.bot-gate
# picks those requests and sends the client's address as X-Gate-Client). It never
# fetches anything: a 204 lets caddy carry on to the app, any other answer goes to the
# client as it is.

import directors;
import std;
import vsthrottle;

backend default none;

# The challenge's proof of work: about 2^17 SHA-256 hashes, the few hundred ms on a
# mid-range phone a reader pays once (README.md, "Bot gate"). A hash qualifies below this.
# 4294967296 / 32768 = 2^17.
sub gate_work_bound {
	set req.http.X-Gate-Work-Bound = "32768";
}

sub vcl_init {
	# Its key() is the last 4 bytes of a string's SHA-256, read little-endian: the only
	# hash the image's vmods offer, and the challenge's script computes the same.
	new sha256 = directors.shard();
	# Without its secret the gate does not start, and caddy fails open (Caddyfile.bot-gate).
	if (std.getenv("GATE_SECRET") !~ ".{16}") {
		return (fail);
	}
}

# X-Gate-Issued (a unix time) -> X-Gate-Seed, "<issued>.<mac>": 64 bits of SHA-256 over the
# secret, the client's address and the time. An IPv6 client is bound to its /64, so its
# privacy addresses keep the cookie (when Go's form spells the /64's four groups out).
sub gate_seed {
	set req.http.X-Gate-Holder = regsub(req.http.X-Gate-Client,
	    "^([0-9a-f]{1,4}(:[0-9a-f]{1,4}){3}):.*$", "\1::/64");
	set req.http.X-Gate-Seed = req.http.X-Gate-Issued + "."
	    + sha256.key("1|" + std.getenv("GATE_SECRET") + "|" + req.http.X-Gate-Holder + "|" + req.http.X-Gate-Issued) + "."
	    + sha256.key("2|" + std.getenv("GATE_SECRET") + "|" + req.http.X-Gate-Holder + "|" + req.http.X-Gate-Issued);
}

# denser_human=<seed>.<nonce> is a reader's proof: a seed this gate issued to this address
# in the last 30 days, and a nonce whose hash with it is below the work bound.
sub gate_proven {
	unset req.http.X-Gate-Proven;
	if (req.http.Cookie ~ "(^|;)\s*denser_human=[0-9]{1,10}\.[0-9]{1,10}\.[0-9]{1,10}\.[0-9]{1,10}\s*(;|$)") {
		set req.http.X-Gate-Proof = regsub(req.http.Cookie, "^(.*;)?\s*denser_human=([0-9.]+)\s*(;.*)?$", "\2");
		set req.http.X-Gate-Issued = regsub(req.http.X-Gate-Proof, "\..*$", "");
		call gate_seed;
		if (regsub(req.http.X-Gate-Proof, "\.[0-9]+$", "") == req.http.X-Gate-Seed
		    && std.integer(req.http.X-Gate-Issued, 0) > std.integer(time=now) - 2592000
		    && std.integer(req.http.X-Gate-Issued, 0) <= std.integer(time=now)
		    && sha256.key(req.http.X-Gate-Proof) < std.integer(req.http.X-Gate-Work-Bound, 0)) {
			set req.http.X-Gate-Proven = "1";
		}
	}
}

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
	# Every reader, signed in or not, proves a JS engine and some work once per address and
	# 30 days. The signed-in cookies varnish/default.vcl passes are no exemption: any client
	# can send them, and their values are not checked here. The cookie is not part of the
	# HTML cache's key.
	call gate_work_bound;
	call gate_proven;
	if (!req.http.X-Gate-Proven) {
		set req.http.X-Gate-Issued = std.integer(time=now);
		call gate_seed;
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
	# The script shows "Loading…", then (after a paint) searches the proof's nonce with its
	# own SHA-256, the one of sha256.key(), and sets the proof as the cookie. The cookie
	# is set only where it can be (Secure needs https), and the page reloads
	# only once it is, so a browser refusing it doesn't reload forever; it says why
	# instead, in the first of navigator.languages it has the message in (the blog's
	# locales; English otherwise), with <html lang> to match. A browser that keeps the cookie
	# and has no NEXT_LOCALE yet gets that language as NEXT_LOCALE (English needs none), so
	# the reload renders, and finds in the HTML cache, the page in it. The script follows the
	# message's element, so it can fill it at once. A quote right before a closing brace
	# would end the long string, hence the space before the map's closing brace.
	if (resp.status == 200) {
		synthetic({"<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Loading…</title></head><body><p id="gate"></p><noscript>This site needs JavaScript.</noscript><script>var seed=""} + req.http.X-Gate-Seed + {"",bound="} + req.http.X-Gate-Work-Bound + {";var K=[],w=[],p=2,i,j;for(i=0;i<64;p++){for(j=2;j*j<=p&&p%j;j++);if(j*j>p)K[i++]=Math.pow(p,1/3)*4294967296|0;}function work(s){var a=0x6a09e667,b=0xbb67ae85,c=0x3c6ef372,d=0xa54ff53a,e=0x510e527f,f=0x9b05688c,g=0x1f83d9ab,h=0x5be0cd19,i,x,y,t;for(i=0;i<16;i++)w[i]=0;for(i=0;i<s.length;i++)w[i>>2]|=s.charCodeAt(i)<<24-8*(i&3);w[i>>2]|=128<<24-8*(i&3);w[15]=s.length*8;for(i=0;i<64;i++){if(i>15){x=w[i-15];y=w[i-2];w[i]=w[i-16]+((x>>>7|x<<25)^(x>>>18|x<<14)^x>>>3)+w[i-7]+((y>>>17|y<<15)^(y>>>19|y<<13)^y>>>10)|0;}t=h+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+(e&f^~e&g)+K[i]+w[i]|0;x=((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+(a&b^a&c^b&c);h=g;g=f;f=e;e=d+t|0;d=c;c=b;b=a;a=t+x|0;}h=h+0x5be0cd19|0;return(h>>>24|h>>8&65280|(h&65280)<<8|(h&255)<<24)>>>0;}var messages={en:"This site needs cookies to continue. Please allow cookies for this site and reload.",ar:"يحتاج هذا الموقع إلى ملفات تعريف الارتباط للمتابعة. يرجى السماح بملفات تعريف الارتباط لهذا الموقع وإعادة تحميل الصفحة.",es:"Este sitio necesita cookies para continuar. Permite las cookies para este sitio y vuelve a cargar la página.",fr:"Ce site a besoin de cookies pour continuer. Veuillez autoriser les cookies pour ce site et recharger la page.",it:"Questo sito ha bisogno dei cookie per continuare. Consenti i cookie per questo sito e ricarica la pagina.",ja:"このサイトを続けて表示するには Cookie が必要です。このサイトの Cookie を許可して、再読み込みしてください。",ko:"계속하려면 이 사이트에 쿠키가 필요합니다. 이 사이트의 쿠키를 허용한 후 새로고침하세요.",pl:"Ta strona potrzebuje plików cookie, aby kontynuować. Zezwól na pliki cookie dla tej strony i odśwież ją.",ru:"Этому сайту нужны файлы cookie, чтобы продолжить. Разрешите файлы cookie для этого сайта и перезагрузите страницу.",zh:"本网站需要 Cookie 才能继续。请允许本网站使用 Cookie 并重新加载页面。" },lang="en",wanted=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""];for(var i=0;i<wanted.length;i++){var code=String(wanted[i]).toLowerCase().split("-")[0];if(messages.hasOwnProperty(code)){lang=code;break;}}document.documentElement.lang=lang;if(lang=="ar")document.documentElement.dir="rtl";var gate=document.getElementById("gate");gate.textContent="Loading…";setTimeout(function(){for(var nonce=0;work(seed+"."+nonce)>=bound;nonce++);var proof=seed+"."+nonce;document.cookie="denser_human="+proof+"; Max-Age=2592000; Path=/; SameSite=Lax"+(location.protocol=="https:"?"; Secure":"");var stored=document.cookie.match(/(^|;)\s*denser_human=([0-9.]+)/);if(!stored||stored[2]!=proof){gate.textContent=messages[lang];return;}if(lang!="en"&&!/(^|;)\s*NEXT_LOCALE=/.test(document.cookie))document.cookie="NEXT_LOCALE="+lang+"; Max-Age=31536000; Path=/; SameSite=Lax";location.reload();});</script></body></html>"});
	} else {
		synthetic(resp.reason);
	}
	return (deliver);
}
