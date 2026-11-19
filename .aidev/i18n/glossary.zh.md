# Glossary: Chinese, Simplified (zh)

Applies to `apps/blog/locales/zh/common_blog.json`,
`apps/wallet/locales/zh/common_wallet.json` and
`packages/smart-signer/locales/zh/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the Chinese strings yet, so every term is
`unreviewed`: the rendering the locale files use most as of 2026-11-19.

## Terms

| English | Chinese | Status | Notes |
|---|---|---|---|
| Safe Storage | 安全存储 | unreviewed | 34 of 37 strings. |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "使用 Keychain". |
| witness / witnesses | 见证人 | unreviewed | 34 of 37 strings. |
| voters | 投票者 | unreviewed | |
| proposal / proposals | 提案 | unreviewed | |
| Unfunded | 未资助 | unreviewed | "never funded" 从未获得资助. |
| Up to … left | 最多剩余 <amount/> | unreviewed | |
| refund (proposal) | 退款 | unreviewed | |
| delegation / delegate | 代理 | unreviewed | 24 of 33 strings; 8 say 委托, including the wallet's navigation and page title. Needs review first: 代理 is also the witness-voting proxy (投票代理), so the two concepts share a word. |
| power up / power down | Power Up / Power Down | unreviewed | Kept in English in most strings; the wallet buttons say 增加 Hive Power / 降低 Hive Power. |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout / after payout | 支付 / 支付后 | unreviewed | 12 of 23 strings; the rest mix 赏金, 收益, 付款 and 奖励 (see drift). |
| rewards / claim rewards | 奖励 / 领取奖励 | unreviewed | 45 of 48 strings. |
| curation rewards | 审查奖励 | unreviewed | 9 of 12 strings; 3 say 策展奖励. Needs review: 审查 reads as "inspection, censorship". |
| beneficiary | 受益人 | unreviewed | |
| posting / active / owner / memo key | 发帖密钥 / 活动密钥 / Owner 密钥 / Memo 密钥 | unreviewed | Posting and Active are also kept in English in about 16 strings each; owner is 所有者密钥 in 9. |
| Keys & Permissions / Authorities | 密钥与权限 / 权限 | unreviewed | |
| memo | 备注 | unreviewed | The transfer field. |
| transfer | 转账 | unreviewed | |
| savings | 储蓄 | unreviewed | |
| price feed | 喂价 | unreviewed | |
| proxy | 投票代理 / 代理 | unreviewed | See delegation. |
| Resource Credits (RC) | 资源积分（RC） | unreviewed | |
| upvote / downvote | 赞成票 / 反对票 | unreviewed | 4 strings say 点赞. |
| follow / mute | 关注 / 静音 | unreviewed | Follow 29 of 35; mute 25 of 31 (4 say 屏蔽). |
| reblog | 转发 | unreviewed | |
| community | 社区 | unreviewed | |
| post / comment / reply | 帖子 / 评论 / 回复 | unreviewed | 帖子 in 65 of 114 strings, 文章 in 27. |
| wallet | 钱包 | unreviewed | |
| log in / log out | 登录 / 退出登录 | unreviewed | |
| forget a saved key | 忘记已保存的密钥 | unreviewed | As the existing "会将其遗忘": "忘记并退出登录" (#1703). |
| password | 密码 | unreviewed | |
| passkey | 通行密钥 | unreviewed | |
| market / interest | 市场 / 利息 | unreviewed | |

## Register

Informal 你 is the more frequent form (168 uses against 102 of 您). Use 你
in new strings and do not mix the two within a screen.

## Plural forms

One category, `other`. Use a measure word: "{{count}} 票", "{{count}} 条回复".

| Category | Example |
|---|---|
| other | 支付后 +1 票（未计入） / 5小时前 |

## Numbers, dates and times

- Decimal point, comma grouping: "1,234.5".
- Abbreviated amounts: the app's K/M suffix, "651.7K" (not 万).
- Dates: "2026年5月15日".
- Times: 24-hour, "14:05".
- Relative times (`Intl.RelativeTimeFormat`): "5小时前", "昨天".
- Full-width punctuation in running text: "，", "：", "（RC）".
- Percent: "12.5%".

## Untranslated names

Hive, Hive Keychain, HiveAuth, Hivesigner, PeakVault, MetaMask, Google Drive,
Hive Bridge, Ecency, PeakD, Hive.blog, Blocktrades, Ionomy, OpenHive; FAQ,
NSFW, RC, DHF, API; HIVE, HBD, HP, HIVE POWER, Power Up, Power Down.

## Known drift

- wallet `witnesses_page.witness` is Russian text ("Делегаты").
- mute: blog `user_profile.mute_button` 沉默的 (an adjective, "silent").
- follow: blog `user_profile.follow_button` 跟随 against 关注.
- redeem: blog `navigation.profile_notifications_tab_navbar.redeem` 赎回
  (buy back) against 领取奖励.
- payout: 支付, 赏金, 收益, 付款 and 奖励 for the same concept; the blog's
  `settings_page.decline_payout` says 不接受奖励.
- delegation: 代理 against 委托 (wallet navigation, page title).
- log out: blog 登出, wallet 退出登录.
- Google Drive: 4 strings say Google 云端硬盘.
