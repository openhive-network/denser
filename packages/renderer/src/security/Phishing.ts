/**
 * Phishing domain detection and management module.
 *
 * This module provides protection against phishing attacks by maintaining
 * a list of known malicious domains. When URLs are checked against this list,
 * matches are flagged as suspicious.
 *
 * Based on: https://github.com/openhive-network/condenser/blob/master/src/app/utils/Phishing.js
 *
 * @module Phishing
 * @security This is a critical security component. The domain list should be
 * regularly updated to protect against new phishing attempts.
 */

/**
 * Built-in Set of known phishing domains for O(1) lookup performance.
 * This list is curated from known phishing attempts targeting Hive/Steem users.
 *
 * Categories of domains included:
 * - Typosquatting domains (steemit variants, exchange impersonators)
 * - Fake wallet/login pages
 * - Auto-vote/bot scam sites
 * - URL shorteners used for phishing
 *
 * @internal This is the default list. Use Phishing.addDomain() to add custom domains.
 */
const builtInDomains: ReadonlySet<string> = new Set([
    'aba.ae',
    'affiliatemarketer.website',
    'alphy.co.nf',
    'appics.ml',
    'autobidbot.cf',
    'autobidbot.ga',
    'autobidbot.gq',
    'autobidbot.ml',
    'autobooststeem.cf',
    'autobooststeem.ga',
    'autobooststeem.gq',
    'autobooststeem.ml',
    'autobooststeem.tk',
    'autobotsteem.cf',
    'autobotsteem.ga',
    'autobotsteem.gq',
    'autobotsteem.ml',
    'autocapslock.info',
    'autorestemed.ml',
    'autosteem.cf',
    'autosteem.ga',
    'autosteem.gq',
    'autosteem.info',
    'autosteem.ml',
    'autosteem.tk',
    'autosteembot.cf',
    'autosteembot.ga',
    'autosteembot.gq',
    'autosteembot.ml',
    'autosteemer.club',
    'autosteemer.com',
    'autosteemit.wapka.mobi',
    'autoupvotes.bid',
    'autoupvotes.trade',
    'bethereum.tk',
    'bonussteem.cf',
    'bonussteem.ga',
    'bonussteem.gq',
    'bonussteem.ml',
    'bonussteem.tk',
    'boosbot.ml',
    'boostbot.ga',
    'boostbot.gq',
    'boostwhaleup.cf',
    'boostwhaleup.ga',
    'boostwhaleup.gq',
    'boostwhaleup.ml',
    'boostwhaleup.tk',
    'clubinter.tk',
    'coolman.cf',
    'coolman.co.nf',
    'coolman.ga',
    'coolman.gq',
    'coolman.info',
    'coolman.ml',
    'coolman.tk',
    'coolman.website',
    'cutt.us',
    'dereferer.me',
    'eb2a.com',
    'ecotrain.cf',
    'ecotrain.ga',
    'ecotrain.gq',
    'ecotrain.ml',
    'ecotrain.tk',
    'fajafun.website',
    'fotobay.cf',
    'fotobay.ga',
    'fotobay.gq',
    'fotobay.ml',
    'fotobay.tk',
    'fotolove.cf',
    'fotolove.ga',
    'fotolove.gq',
    'fotolove.ml',
    'fotolove.tk',
    'fotoshot.cf',
    'fotoshot.ga',
    'fotoshot.gq',
    'fotoshot.ml',
    'fotoshot.tk',
    'fotoy.cf',
    'fotoy.ga',
    'fotoy.gq',
    'fotoy.ml',
    'fotoy.tk',
    'galaxy5.co.nf',
    'goodjobz.cf',
    'goodjobz.co.nf',
    'goodjobz.ga',
    'goodjobz.gq',
    'goodjobz.info',
    'goodjobz.ml',
    'goodjobz.tk',
    'goodjobz.website',
    'gooogly.co.nf',
    'green7y.cf',
    'green7y.ga',
    'green7y.gq',
    'green7y.ml',
    'green7y.tk',
    'guglee.co.nf',
    'hadilana.2host.me',
    'hassani.co.vu',
    'hitman2.co.nf',
    'hiveproject.us',
    'hivesignjustnetwork.blogspot.com',
    'hostkda.com',
    'htmlpasta.com',
    'iness.ga',
    'japonias.cf',
    'japonias.ga',
    'japonias.gq',
    'japonias.ml',
    'japonias.tk',
    'johnylinks.cf',
    'johnylinks.ga',
    'johnylinks.gq',
    'johnylinks.ml',
    'johnylinks.tk',
    'justnetwork-defi.blogspot.com',
    'justnetwork.my.id',
    'justnetwork.tech',
    'kimberlyameyrealty.ga',
    'koreas.cf',
    'lazherleeja.co.nf',
    'lensshot.cf',
    'lensshot.ga',
    'lensshot.gq',
    'lensshot.ml',
    'lensshot.tk',
    'linking2.co.nf',
    'lokako.co.nf',
    'lordlinkers.tk',
    'manel.co.nf',
    'mcg6000.com',
    'metamaskblog.weebly.com',
    'minnowbooster.cf',
    'minnowbooster.ga',
    'minnowbooster.gq',
    'minnowbooster.ml',
    'minnowbooster.tk',
    'minnowboosternetwhitelistinvite.000webhostapp.com',
    'moresteam.cf',
    'moresteam.ga',
    'moresteam.gq',
    'moresteam.ml',
    'moresteam.tk',
    'mybott.cf',
    'mybott.ga',
    'mybott.gq',
    'mybott.ml',
    'mybott.tk',
    'mysteembot.cf',
    'mysteembot.ga',
    'mysteembot.gq',
    'mysteembot.ml',
    'mysteembot.tk',
    'mysteemhelp.cf',
    'mysteemhelp.ga',
    'mysteemhelp.gq',
    'mysteemhelp.ml',
    'mysteemhelp.tk',
    'narutos.cf',
    'narutos.co.nf',
    'narutos.ga',
    'narutos.gq',
    'narutos.info',
    'narutos.ml',
    'narutos.tk',
    'narutos.website',
    'nullrefer.com',
    'openlinks.cf',
    'openlinks.ga',
    'openlinks.gq',
    'openlinks.ml',
    'openlinks.tk',
    'photoshort.cf',
    'photoshort.ga',
    'photoshort.gq',
    'photoshort.ml',
    'photoshort.tk',
    'pixz.cf',
    'pixz.ga',
    'pixz.gq',
    'pixz.ml',
    'pixz.tk',
    'portall.co.nf',
    'postpromoter.cf',
    'postpromoter.ga',
    'postpromoter.gq',
    'postpromoter.ml',
    'postpromoter.tk',
    'postup4all.cf',
    'postup4all.ga',
    'postup4all.gq',
    'postup4all.ml',
    'postup4all.tk',
    'postupper.cf',
    'postupper.ga',
    'postupper.gq',
    'postupper.ml',
    'postupsteem.cf',
    'postupsteem.ga',
    'postupsteem.gq',
    'postupsteem.ml',
    'postupsteem.tk',
    'promo1dollar.cf',
    'promo1dollar.ga',
    'promo1dollar.gq',
    'promo1dollar.ml',
    'promo1dollar.tk',
    'promoteme.bid',
    'promoteme.cf',
    'promoteme.co.nf',
    'promoteme.ga',
    'promoteme.gq',
    'promoteme.ml',
    'promoteme.tk',
    'promoteme.trade',
    'promoteme.website',
    'promoteme.win',
    'promotsteem.cf',
    'promotsteem.ga',
    'promotsteem.gq',
    'promotsteem.ml',
    'promotsteem.tk',
    'propuuer.cf',
    'propuuer.ga',
    'propuuer.gq',
    'propuuer.ml',
    'propuuer.tk',
    'protectsteem.cf',
    'protectsteem.ga',
    'protectsteem.gq',
    'protectsteem.ml',
    'protectsteem.tk',
    'redireck.ml',
    'sleemit.com',
    'smartsteembot.cf',
    'smartsteembot.ga',
    'smartsteembot.gq',
    'smartsteembot.ml',
    'smartsteembot.tk',
    'steamit.ga',
    'steeemit.co.nf',
    'steeemit.ml',
    'steeemitt.aba.ae',
    'steemart.cf',
    'steemart.ga',
    'steemart.gq',
    'steemart.ml',
    'steemart.tk',
    'steemautobot.bid',
    'steemautobot.cf',
    'steemautobot.ga',
    'steemautobot.gq',
    'steemautobot.ml',
    'steemautobot.trade',
    'steemb0t.cf',
    'steemb0t.ga',
    'steemb0t.gq',
    'steemb0t.ml',
    'steemboost.cf',
    'steemboost.ga',
    'steemboost.gq',
    'steemboost.ml',
    'steemboost.tk',
    'steemboostup.cf',
    'steemboostup.ga',
    'steemboostup.gq',
    'steemboostup.icu',
    'steemboostup.ml',
    'steemboostup.tk',
    'steemboostup.xyz',
    'steembost.cf',
    'steembost.ga',
    'steembost.gq',
    'steembost.ml',
    'steembost.tk',
    'steembot.cf',
    'steembot.ga',
    'steembot.gq',
    'steembot.ml',
    'steembotter.cf',
    'steembotter.ga',
    'steembotter.gq',
    'steembotter.ml',
    'steembotter.tk',
    'steembottrackar.cf',
    'steembottrackar.ga',
    'steembottrackar.gq',
    'steembottrackar.ml',
    'steembottrackar.tk',
    'steembottracker.cf',
    'steembottracker.co.nf',
    'steembottracker.ga',
    'steembottracker.gq',
    'steembottracker.info',
    'steembottracker.ml',
    'steembottracker.tk',
    'steembottracker.trade',
    'steembottracker.website',
    'steembottracker.win',
    'steembottrakkr.cf',
    'steembottrakkr.ga',
    'steembottrakkr.gq',
    'steembottrakkr.ml',
    'steembottrakkr.tk',
    'steembotup.cf',
    'steembotup.ga',
    'steembotup.gq',
    'steembotup.ml',
    'steembotup.tk',
    'steemconnect.xyz',
    'steemconnect2.000webhostapp.com',
    'steemengine.net',
    'steemers.aba.ae',
    'steemeth.com',
    'steemfoto.cf',
    'steemfoto.ga',
    'steemfoto.gq',
    'steemfoto.ml',
    'steemfoto.tk',
    'steemians.cf',
    'steemians.ga',
    'steemians.gq',
    'steemians.ml',
    'steemians.tk',
    'steemig.cf',
    'steemig.ga',
    'steemig.gq',
    'steemig.ml',
    'steemig.tk',
    'steemiit.cf',
    'steemiit.ga',
    'steemiit.tk',
    'steemij.tk',
    'steemik.ga',
    'steemik.tk',
    'steemil.cf',
    'steemil.com',
    'steemil.ga',
    'steemil.gq',
    'steemil.ml',
    'steemil.tk',
    'steemin.tk',
    'steemir.tk',
    '\u0219teemit.com',
    'steemit24.cf',
    'steemit24.ga',
    'steemit24.gq',
    'steemit24.ml',
    'steemit24.tk',
    'steemitbounty.cf',
    'steemitbounty.ga',
    'steemitbounty.gq',
    'steemitbounty.ml',
    'steemitbounty.tk',
    'steemitconnect.cf',
    'steemitconnect.ga',
    'steemitconnect.gq',
    'steemitconnect.ml',
    'steemitconnect.tk',
    'steemitfollowup.cf',
    'steemitfollowup.gq',
    'steemitfollowup.ml',
    'steemitfoto.cf',
    'steemitfoto.ga',
    'steemitfoto.gq',
    'steemitfoto.ml',
    'steemitfoto.tk',
    'steemitgiveaway.cf',
    'steemitgiveaway.ga',
    'steemitgiveaway.gq',
    'steemitgiveaway.ml',
    'steemitgiveaway.tk',
    'steemitlover.cf',
    'steemitlover.ga',
    'steemitlover.gq',
    'steemitlover.ml',
    'steemitlover.tk',
    'steemitmanager.website',
    'steemitpasswordprotection.000webhostapp.com',
    'steemitphoto.cf',
    'steemitphoto.ga',
    'steemitphoto.gq',
    'steemitphoto.ml',
    'steemitphoto.tk',
    'steemitpostpromoter.us',
    'steemitpromoit.website',
    'steemitr.cf',
    'steemitr.ga',
    'steemitr.gq',
    'steemitr.ml',
    'steemitr.tk',
    'steemits.cf',
    'steemits.ga',
    'steemits.gq',
    'steemits.ml',
    'steemits.tk',
    'steemitservices.ga',
    'steemitservices.gq',
    'steemitsupport.cf',
    'steemitsupport.ga',
    'steemitsupport.gq',
    'steemitsupport.ml',
    'steemitsupport.tk',
    'steemitsupport.website',
    'steemituper.cf',
    'steemituper.ga',
    'steemituper.gq',
    'steemituper.ml',
    'steemituper.tk',
    'steemitupvote.cf',
    'steemitupvote.ga',
    'steemitupvote.gq',
    'steemitupvote.ml',
    'steemitupvote.tk',
    'steemitx.cf',
    'steemitx.ga',
    'steemitx.gq',
    'steemitx.ml',
    'steemitx.tk',
    'steemiv.cf',
    'steemiv.ga',
    'steemiv.gq',
    'steemiv.ml',
    'steemiv.tk',
    'steemiz.cf',
    'steemiz.ga',
    'steemiz.gq',
    'steemiz.ml',
    'steemiz.tk',
    'steemlove.cf',
    'steemlove.ga',
    'steemlove.gq',
    'steemlove.ml',
    'steemlove.tk',
    'steemnow.cf',
    'steemnow.ga',
    'steemnow.gq',
    'steemnow.ml',
    'steemomg.cf',
    'steemomg.ga',
    'steemomg.gq',
    'steemomg.ml',
    'steemomg.tk',
    'steemone.cf',
    'steemone.ga',
    'steemone.gq',
    'steemone.ml',
    'steemphoto.cf',
    'steemphoto.ga',
    'steemphoto.gq',
    'steemphoto.ml',
    'steemphoto.tk',
    'steempix.cf',
    'steempix.ga',
    'steempix.gq',
    'steempix.ml',
    'steempix.tk',
    'steempostupper.cf',
    'steempostupper.ga',
    'steempostupper.gq',
    'steempostupper.ml',
    'steempostupper.tk',
    'steempostupper.win',
    'steempostuppr.cf',
    'steempostuppr.ga',
    'steempostuppr.gq',
    'steempostuppr.ml',
    'steempostuppr.tk',
    'steempromoit.cf',
    'steempromoit.ga',
    'steempromoit.gq',
    'steempromoit.ml',
    'steempromoit.tk',
    'steemprotect.cf',
    'steemprotect.ga',
    'steemprotect.gq',
    'steemprotect.ml',
    'steemprotect.tk',
    'steemrain.cf',
    'steemrain.ga',
    'steemrain.gq',
    'steemrain.info',
    'steemrain.ml',
    'steemrain.tk',
    'steemrain.us',
    'steemrew.cf',
    'steemrew.ga',
    'steemrew.gq',
    'steemrew.ml',
    'steemrew.tk',
    'steemrewards.ml',
    'steemrobot.cf',
    'steemrobot.ga',
    'steemrobot.info',
    'steemrobot.ml',
    'steemupgot.cf',
    'steemupgot.ga',
    'steemupgot.gq',
    'steemupper.cf',
    'steemupper.ga',
    'steemupper.gq',
    'steemupper.ml',
    'steenit.cf',
    'steewit.com',
    'stemitwallet.cf',
    'stemitwallet.com',
    'stemitwallet.ga',
    'stemitwallet.gq',
    'stemitwallet.ml',
    'stemitwallet.tk',
    'stoura22.co.nf',
    'stssmater.aba.ae',
    'supportsteem.cf',
    'supportsteem.ga',
    'supportsteem.gq',
    'supportsteem.ml',
    'supportsteem.tk',
    'techsteem.cf',
    'techsteem.ga',
    'techsteem.gq',
    'techsteem.ml',
    'techsteem.tk',
    'teeesrw.blogspot.com',
    'thetraffic.xyz',
    'toolsfree.info',
    'topupresteem.ml',
    'uppervotes.ga',
    'uppervotes.gq',
    'upperwhale.cf',
    'upperwhale.gq',
    'upperwhaleplus.cf',
    'upperwhaleplus.ga',
    'upperwhaleplus.gq',
    'upperwhaleplus.ml',
    'upvoteme.cf',
    'upvoteme.ga',
    'upvoteme.gq',
    'upvoteme.ml',
    'url.rw',
    'us.aba.ae',
    'weedy.ltd',
    'whaleboostup.cf',
    'whaleboostup.ga',
    'whaleboostup.gq',
    'whaleboostup.ml',
    'whaleboostup.tk',
    'wheeler.atwebpages.com',
    'wheelspin.cf',
    'wheelspin.ga',
    'wheelspin.gq',
    'wheelspin.ml',
    'wheelspin.tk',
    'yoyou.co.nf',
    'zity.ga'
]);

/**
 * Custom domains added at runtime via addDomain() or addDomains().
 * These are kept separate from built-in domains to allow for easy management.
 * @internal
 */
const customDomains: Set<string> = new Set();

/**
 * Extracts the hostname from a URL string.
 * Falls back to searching the full URL if parsing fails.
 *
 * @param url - The URL to extract hostname from
 * @returns The hostname in lowercase, or the full lowercase URL if parsing fails
 */
function extractHostname(url: string): string {
    try {
        // Handle URLs without protocol
        const urlToParse = url.startsWith('http') ? url : `https://${url}`;
        return new URL(urlToParse).hostname.toLowerCase();
    } catch {
        return url.toLowerCase();
    }
}

/**
 * Checks if a hostname matches any domain in the provided set.
 * Uses efficient Set-based lookup with suffix matching for subdomains.
 *
 * @param hostname - The hostname to check
 * @param domains - Set of blocked domains
 * @returns true if hostname matches any blocked domain
 */
function matchesDomain(hostname: string, domains: ReadonlySet<string> | Set<string>): boolean {
    // Direct match (O(1) lookup)
    if (domains.has(hostname)) {
        return true;
    }

    // Check if hostname ends with any blocked domain (for subdomain matching)
    // e.g., "sub.steemit.com" should match "steemit.com" if blocked
    for (const domain of domains) {
        if (hostname.endsWith(`.${domain}`)) {
            return true;
        }
    }

    return false;
}

/**
 * Phishing detection and domain management class.
 *
 * Provides methods to:
 * - Check if a URL appears to be a phishing attempt
 * - Add custom domains to the blocklist
 * - Remove domains from the blocklist
 * - Retrieve the current list of blocked domains
 *
 * @example
 * ```typescript
 * // Check if URL is suspicious
 * if (Phishing.looksPhishy('https://steemlt.com/login')) {
 *     console.warn('Phishing URL detected!');
 * }
 *
 * // Add custom domain
 * Phishing.addDomain('my-phishing-domain.com');
 *
 * // Add multiple domains
 * Phishing.addDomains(['domain1.com', 'domain2.com']);
 *
 * // Get all blocked domains
 * const allDomains = Phishing.getDomains();
 * ```
 */
export class Phishing {
    /**
     * Checks if a URL contains any known phishing domain.
     *
     * Uses efficient Set-based O(1) lookup for exact domain matches,
     * with fallback to suffix matching for subdomain detection.
     *
     * @param questionableUrl - The URL to check for phishing indicators
     * @returns `true` if the URL contains a known phishing domain, `false` otherwise
     *
     * @example
     * ```typescript
     * Phishing.looksPhishy('https://steemlt.com'); // true - typosquat of steemit
     * Phishing.looksPhishy('https://hive.blog');   // false - legitimate domain
     * Phishing.looksPhishy('https://sub.steemlt.com'); // true - subdomain of phishing site
     * ```
     */
    public static looksPhishy = (questionableUrl: string): boolean => {
        const hostname = extractHostname(questionableUrl);

        // Check built-in domains (O(1) for exact match, O(n) worst case for subdomain)
        if (matchesDomain(hostname, builtInDomains)) {
            return true;
        }

        // Check custom domains
        if (matchesDomain(hostname, customDomains)) {
            return true;
        }

        return false;
    };

    /**
     * Adds a single domain to the phishing blocklist.
     *
     * The domain is normalized to lowercase before being added.
     * Duplicate domains are silently ignored (Set behavior).
     *
     * @param domain - The domain to add (e.g., 'phishing-site.com')
     *
     * @example
     * ```typescript
     * Phishing.addDomain('new-phishing-site.com');
     * Phishing.addDomain('UPPERCASE.COM'); // Stored as 'uppercase.com'
     * ```
     */
    public static addDomain(domain: string): void {
        if (domain && typeof domain === 'string') {
            customDomains.add(domain.toLowerCase().trim());
        }
    }

    /**
     * Adds multiple domains to the phishing blocklist.
     *
     * Each domain is normalized to lowercase before being added.
     * Invalid entries (non-strings, empty strings) are silently skipped.
     *
     * @param domains - Array of domains to add
     *
     * @example
     * ```typescript
     * Phishing.addDomains([
     *     'phishing-site1.com',
     *     'phishing-site2.com',
     *     'fake-exchange.net'
     * ]);
     * ```
     */
    public static addDomains(domains: string[]): void {
        if (Array.isArray(domains)) {
            for (const domain of domains) {
                Phishing.addDomain(domain);
            }
        }
    }

    /**
     * Removes a domain from the custom blocklist.
     *
     * Note: This only removes domains added via addDomain()/addDomains().
     * Built-in domains cannot be removed through this method for security reasons.
     *
     * @param domain - The domain to remove
     * @returns `true` if the domain was removed, `false` if it wasn't in the custom list
     *
     * @example
     * ```typescript
     * Phishing.addDomain('example.com');
     * Phishing.removeDomain('example.com'); // returns true
     * Phishing.removeDomain('not-added.com'); // returns false
     * ```
     */
    public static removeDomain(domain: string): boolean {
        if (domain && typeof domain === 'string') {
            return customDomains.delete(domain.toLowerCase().trim());
        }
        return false;
    }

    /**
     * Retrieves all domains in the blocklist (both built-in and custom).
     *
     * Returns a new array each time to prevent external modification
     * of the internal domain lists.
     *
     * @returns Array of all blocked domains (sorted alphabetically)
     *
     * @example
     * ```typescript
     * const domains = Phishing.getDomains();
     * console.log(`Blocking ${domains.length} phishing domains`);
     * ```
     */
    public static getDomains(): string[] {
        return [...Array.from(builtInDomains), ...customDomains].sort();
    }

    /**
     * Retrieves only the custom domains added via addDomain()/addDomains().
     *
     * Useful for persisting custom domain lists or debugging.
     *
     * @returns Array of custom-added domains
     *
     * @example
     * ```typescript
     * const custom = Phishing.getCustomDomains();
     * // Save to database for persistence across restarts
     * await db.savePhishingDomains(custom);
     * ```
     */
    public static getCustomDomains(): string[] {
        return [...customDomains].sort();
    }

    /**
     * Clears all custom domains added via addDomain()/addDomains().
     *
     * Built-in domains are not affected by this operation.
     * Useful for testing or resetting the custom list.
     *
     * @example
     * ```typescript
     * Phishing.clearCustomDomains();
     * console.log(Phishing.getCustomDomains()); // []
     * ```
     */
    public static clearCustomDomains(): void {
        customDomains.clear();
    }

    /**
     * Returns the count of all blocked domains (built-in + custom).
     *
     * @returns Total number of domains in the blocklist
     *
     * @example
     * ```typescript
     * console.log(`Protecting against ${Phishing.getDomainCount()} phishing domains`);
     * ```
     */
    public static getDomainCount(): number {
        return builtInDomains.size + customDomains.size;
    }
}
