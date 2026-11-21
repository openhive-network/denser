# Glossary: Japanese (ja)

Applies to `apps/blog/locales/ja/common_blog.json`,
`apps/wallet/locales/ja/common_wallet.json` and
`packages/smart-signer/locales/ja/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the Japanese strings yet, so every term is
`unreviewed`: the rendering the locale files use most as of 2026-11-19.

## Terms

| English | Japanese | Status | Notes |
|---|---|---|---|
| Safe Storage | 安全なストレージ | unreviewed | Every string since #1698. |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "Keychainを使用". |
| witness / witnesses | 証人 | unreviewed | Every string since #1698. |
| voters | 投票者 | unreviewed | |
| proposal / proposals | 提案 | unreviewed | |
| Unfunded | 未資金 | unreviewed | |
| Up to … left | 最大 <amount/> 残り | unreviewed | |
| refund (proposal) | 返金 | unreviewed | |
| delegation / delegate | 委託 / 委託する | unreviewed | Every string since #1698. |
| power up / power down | パワーアップ / パワーダウン | unreviewed | |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout / after payout | 支払い / 支払い後 | unreviewed | 20 of 23 strings. |
| rewards / claim rewards | 報酬 / 報酬を受け取る | unreviewed | |
| curation rewards | キュレーション報酬 | unreviewed | |
| beneficiary | 受益者 | unreviewed | |
| posting / active / owner / memo key | 投稿キー / アクティブキー / オーナーキー / メモキー | unreviewed | |
| Keys & Permissions / Authorities | キーと権限 / 権限 | unreviewed | |
| memo | メモ | unreviewed | |
| transfer | 送金 | unreviewed | |
| savings | 貯蓄 | unreviewed | |
| price feed | 価格フィード | unreviewed | |
| proxy | 代理人 | unreviewed | A tie: 5 strings 代理人, 5 プロキシ. |
| Resource Credits (RC) | リソースクレジット（RC） | unreviewed | |
| upvote / downvote | 賛成票 / 反対票 | unreviewed | 4 strings say アップボート. |
| vote weight / downvote power | 投票の重み / 反対票パワー | unreviewed | |
| follow / mute | フォロー / ミュート | unreviewed | |
| reblog | リブログ | unreviewed | |
| community | コミュニティ | unreviewed | |
| community subscribers | 購読者; "購読者 {{value}} 人" | unreviewed | #1717 |
| post / comment / reply | 投稿 / コメント / 返信 | unreviewed | |
| wallet | ウォレット | unreviewed | |
| log in / log out | ログイン / ログアウト | unreviewed | |
| forget a saved key | 保存されたキーを消去 | unreviewed | As the existing "…消去されます": "消去してログアウト" (#1703). |
| password | パスワード | unreviewed | |
| passkey | パスキー | unreviewed | |
| biometric unlock | 生体認証によるロック解除 | unreviewed | As in `login_form.passkey_prompt.*`. |
| market / interest | マーケット / 利息 | unreviewed | |
| this session (key badge) | このセッション | unreviewed | |
| recovery account | リカバリーアカウント | unreviewed | |
| witness owner (witness list) | 運営者 | unreviewed | 「運営者: @gtg」(#1698); not 作成者 (author). |
| notification / notifications | 通知 | unreviewed | Toast announcement label 「通知」 (#1739). |
| Hive core (API set) | Hive コア | unreviewed | API-set title (#1747); the API names in brackets (database, condenser, broadcast) stay English. |
| lite accounts | ライトアカウント | unreviewed | As in the lite-account strings; API-set title (#1747). |
| Balance API | 残高 API | unreviewed | API-set title (#1747). Bridge, Hivemind REST, HAfAH and HiveSense are API names, not translated. |
| For You feed | おすすめフィード | unreviewed | As in the For You feed strings; API-set title (#1747). |
| API node / API set panel | ノード; API ファミリー | unreviewed | /healthchecker (#1725): 「API ファミリー別の API サーバー」, node states 「利用可能」「非対応」「ダウン」「不明」「性能低下」; 「自動選択」「デフォルト」「使用中」. List separator 「、」. |

## Register

Polite です/ます style: "…がリセットされます", "…してください". Buttons and
labels are noun or dictionary forms ("報酬を受け取る").

## Plural forms

One category, `other`. Write the count with a counter word, not a plural
noun: "{{count}} 件", "+{{count}} 件（集計対象外）".

| Category | Example |
|---|---|
| other | 支払い後の投票 +1 件（集計対象外） / 5 時間前 |

## Numbers, dates and times

- Decimal point, comma grouping: "1,234.5".
- Abbreviated amounts: the app's K/M suffix, "651.7K" (not 万, which
  `Intl`'s compact notation would give).
- Dates: "2026年5月15日", short "2026/05/15".
- Times: 24-hour, "14:05".
- Relative times (`Intl.RelativeTimeFormat`): "5 時間前", "昨日".
- Full-width parentheses and colon in running text: "（RC）", "：".
- Percent: "12.5%".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, API; HIVE, HBD, HP, HIVE POWER.

## Known drift

None known. The #1698 review fixed the drift listed here before.
