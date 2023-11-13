import { getLogger } from "@hive/ui/lib/logging";
import { cryptoUtils } from "@hiveio/dhive";

function validateHivePassword(password: string, translateFn: (v: string) => string = (v) => v ) {
    // A Hive generated password is a WIF prefixed with a P.
    // It is possible to login directly with a WIF.
    const wif = /^P/.test(password) ? password.substring(1) : password;

    if (!/^5[HJK].{45,}/i.test(wif)) {
        // 51 is the wif length
        // not even close
        return translateFn('error');
    }
    if (!cryptoUtils.isWif(wif)) {
        return translateFn('error');
    }
    return null;
}
