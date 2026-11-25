---
date: 2026-11-25
status: accepted
decision-makers: [dan]
consulted: []
informed: []

id: DR-010
proposed_by: claude
area: smart-signer/passkey-unlock
related_issues: [1774, 1780, 1782]
related_decisions: []
---

# Encrypt every passkey-unlock record of a device under one shared device PRF salt

## Context and Problem Statement

#1774 made the passkey sign-in request name no credential (`allowCredentials: []`), so that a credential
another device replaced never brings back Chrome's "No passkeys available" dialog. WebAuthn's PRF
extension (Level 3, §10.1.4) refuses `evalByCredential` while `allowCredentials` is empty. So a request
naming no credential can ask the PRF of only one or two salts, not one salt per record. Each record was
encrypted under its own random `prfSalt`, so picking another linked account's passkey at sign-in needed a
second request naming that account's credential, which means two biometric confirmations (#1780).

## Considered Options

* Keep per-record salts and two confirmations for the other-account switch
* Name the device's stored credential IDs in the sign-in request with `evalByCredential`: one
  confirmation, but Chrome's "No passkeys available" returns whenever none of them exists any more
* One shared device salt for every record of the device, asked in the request that names no credential

## Decision Outcome

Chosen option: **"one shared device salt"** (dan, denser#1782, note 783107), because it gives one
confirmation and keeps the no-ID request.

* The device salt is 32 random bytes in its own IndexedDB database, `/passkeys_v3_device`, created on
  first need. It is not a new store in `/passkeys_v3`, because that would need a version bump that
  hb-auth's own open of that database at version 1 refuses.
* The record format is unchanged: each record's `prfSalt` holds the device salt, so hb-auth's
  `hasPasskey`, `removePasskey` and `biometricUnlock` read the records as before.
* The discovery request asks the device salt in its `first` slot and, where it differs, the record's own
  salt in `second`.
* Create, reuse, relink and migration all write under the device salt.
* Existing records migrate during their own account's normal unlock, with no extra confirmation. The
  migration runs only after safe storage accepts the password. The re-encrypted copy is decrypted before
  it replaces the record in one write, and a failed move keeps the old record.
* #1774's no-ID request and its rule that a record is never dropped without the user's choice, and
  #1770's signal rules, are unchanged.

### Consequences

* Good, because picking any linked account whose record is on the device salt signs it in with one
  confirmation.
* Good, because hb-auth reads the records unchanged.
* Bad, because a record not yet moved still takes two confirmations to switch to, until its own account
  unlocks once.
* Bad, because losing `/passkeys_v3_device` alone (not the records) puts every record back on the
  migration path. The records still unlock through their own salt, and they move again.
* A change to how records choose their salt, or to the device-salt store, takes a decision record that
  supersedes this one.
