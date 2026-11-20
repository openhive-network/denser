# Glossary: Korean (ko)

Applies to `apps/blog/locales/ko/common_blog.json`,
`apps/wallet/locales/ko/common_wallet.json` and
`packages/smart-signer/locales/ko/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the Korean strings yet (they were added in
#1207), so every term is `unreviewed`: the rendering the locale files use
most as of 2026-11-19. `scripts/korean-translations.test.js` checks their
markup and plural keys, not their wording.

## Terms

| English | Korean | Status | Notes |
|---|---|---|---|
| Safe Storage | 안전 저장소 | unreviewed | Every string since #1698. |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "Keychain 사용". |
| witness / witnesses | 증인 | unreviewed | 36 of 37 strings. |
| voters | 투표자 | unreviewed | |
| proposal / proposals | 제안 | unreviewed | |
| Unfunded | 미지급 | unreviewed | "not funded" is 지원 안 됨, "never funded" 지원받은 적 없음; a reviewer should decide whether the label should say 미지원 to match them. |
| Up to … left | 최대 <amount/> 남음 | unreviewed | |
| refund (proposal) | 환불 | unreviewed | |
| delegation / delegate | 위임 / 위임하기 | unreviewed | 33 of 33 strings. |
| power up / power down | 파워 업 / 파워 다운 | unreviewed | |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout / after payout | 지급 / 지급 후 | unreviewed | 21 of 23 strings. |
| rewards / claim rewards | 보상 / 보상 받기 | unreviewed | |
| curation rewards | 큐레이션 보상 | unreviewed | |
| beneficiary | 수혜자 | unreviewed | |
| posting / active / owner / memo key | 포스팅 키 / 액티브 키 / 소유자 키 / 메모 키 | unreviewed | |
| Keys & Permissions / Authorities | 키 및 권한 / 계정 권한 | unreviewed | |
| memo | 메모 | unreviewed | |
| transfer | 송금 | unreviewed | |
| savings | 저축 | unreviewed | |
| price feed | 가격 피드 | unreviewed | |
| proxy | 프록시 | unreviewed | |
| Resource Credits (RC) | 리소스 크레딧(RC) | unreviewed | |
| vote / upvote / downvote | 보팅 / 업보팅 / 다운보팅 | unreviewed | Hive community usage; "voters" stays 투표자. |
| follow / mute | 팔로우 / 뮤트 | unreviewed | |
| reblog | 리블로그 | unreviewed | |
| community | 커뮤니티 | unreviewed | |
| community subscribers | 구독자; "구독자 {{value}}명" | unreviewed | #1717 |
| post / comment / reply | 게시물 / 댓글 / 답글 | unreviewed | |
| wallet | 지갑 | unreviewed | |
| log in / log out | 로그인 / 로그아웃 | unreviewed | |
| forget a saved key | 저장된 키 지우기 | unreviewed | As the existing "…지워집니다": "지우고 로그아웃" (#1703). |
| password | 비밀번호 | unreviewed | |
| passkey | 패스키 | unreviewed | |
| market / interest | 마켓 / 이자 | unreviewed | |
| this session (key badge) | 이 세션 | unreviewed | |
| recovery account | 복구 계정 | unreviewed | |
| witness owner (witness list) | 운영자 | unreviewed | "운영자: @gtg" (#1698); not 작성자 (author). |

## Register

Polite formal endings: statements in -습니다/-ㅂ니다, requests in -하세요
("…가 초기화됩니다", "…를 입력하세요"). Labels and buttons are nouns
("보상 받기", "뮤트 해제").

## Plural forms

One category, `other`; `key_one` may be omitted where `key_other` exists
(`scripts/korean-translations.test.js`). Use a counter: "{{count}}건",
"{{count}}명".

| Category | Example |
|---|---|
| other | +지급 후 보팅 1건 (집계되지 않음) / 5시간 전 |

## Numbers, dates and times

- Decimal point, comma grouping: "1,234.5".
- Abbreviated amounts: the app's K/M suffix, "651.7K" (not 만).
- Dates: "2026. 5. 15.", long "2026년 5월 15일".
- Times: 12-hour with 오전/오후, "오후 2:05".
- Relative times (`Intl.RelativeTimeFormat`): "5시간 전", "어제".
- Percent: "12.5%".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, API; HIVE, HBD, HP, HIVE POWER.

## Known drift

None known. The #1698 review fixed the drift listed here before.
