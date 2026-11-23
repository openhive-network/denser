# Glossary: Chinese, Simplified (zh)

Applies to `apps/blog/locales/zh/common_blog.json`,
`apps/wallet/locales/zh/common_wallet.json` and
`packages/smart-signer/locales/zh/smart-signer.json`. Status values and how to
use this file: `.aidev/i18n/README.md`.

No native speaker has reviewed the Chinese strings yet, so every term is
`unreviewed`: the rendering the locale files use most as of 2026-11-19. The
`agreed` rows were decided for #1727 after comparing hive.blog, the Hive
wallet, Ecency and PeakD; a native speaker may still refine them.

## Terms

| English | Chinese | Status | Notes |
|---|---|---|---|
| Safe Storage | 安全存储 | unreviewed | 34 of 37 strings. |
| Hive Keychain / Keychain | Hive Keychain / Keychain | unreviewed | Product name: "使用 Keychain". |
| witness / witnesses | 见证人 | agreed (#1727) | Every string. |
| voters | 投票者 | unreviewed | |
| proposal / proposals | 提案 | unreviewed | |
| Unfunded | 未资助 | unreviewed | "never funded" 从未获得资助. |
| Up to … left | 最多剩余 <amount/> | unreviewed | |
| refund (proposal) | 退款 | unreviewed | |
| delegation / delegate | 委托 | agreed (#1727) | "委托", "委托 RC", "委托给账户", "收到的委托"; delegator 委托人, delegatee 受托人. Never 代理, which names the witness-voting proxy. |
| power up / power down | Power Up / Power Down | unreviewed | Kept in English in most strings; the wallet buttons say 增加 Hive Power / 降低 Hive Power. |
| HIVE, HBD, HIVE POWER, HP | unchanged | unreviewed | Token symbols. |
| payout (amount earned) | 收益 | agreed (#1727) | Author, curation and beneficiary earnings: tabs "收益", "待结算收益：", "累计收益：", "作者收益：", "策展收益：", "最高可接受收益", "拒绝收益". Never 赏金, 支付 or 付款. |
| payout (the moment) / after payout | 结算 / 结算后 | agreed (#1727) | "7天后结算", "结算后 +1 票（未计入）", "没有待结算的收益". 支付 stays for paying in general (proposal payments, fees, power-down installments), not for the post payout. |
| rewards / claim rewards | 奖励 / 领取奖励 | unreviewed | 45 of 48 strings. |
| curation rewards | 策展奖励 | agreed (#1727) | The established Steem/Ecency term; 点赞收益 is fine in explanatory text. Never 审查, which reads as "inspection, censorship". |
| beneficiary | 受益人 | unreviewed | |
| posting / active / owner / memo key | 发帖密钥 / 活动密钥 / Owner 密钥 / Memo 密钥 | unreviewed | Posting and Active are also kept in English in about 16 strings each; owner is 所有者密钥 in 9. |
| Keys & Permissions / Authorities | 密钥与权限 / 权限 | unreviewed | |
| memo | 备注 | unreviewed | The transfer field. |
| transfer | 转账 | unreviewed | |
| savings | 储蓄 | unreviewed | |
| price feed | 喂价 | unreviewed | |
| proxy | 投票代理 / 代理 | agreed (#1727) | The witness-voting proxy only; never for delegation. |
| Resource Credits (RC) | 资源积分（RC） | unreviewed | |
| upvote / downvote | 赞成票 / 反对票 | unreviewed | 4 strings say 点赞. |
| vote weight / downvote power | 投票权重 / 反对票能量 | unreviewed | |
| follow / mute | 关注 / 静音 | unreviewed | Follow 29 of 35; mute 25 of 31 (4 say 屏蔽). |
| reblog | 转发 | unreviewed | |
| community | 社区 | unreviewed | |
| community subscribers | 订阅者; "{{value}} 位订阅者" | unreviewed | #1717 |
| post / comment / reply | 帖子 / 评论 / 回复 | unreviewed | 帖子 in 65 of 114 strings, 文章 in 27. |
| wallet | 钱包 | unreviewed | |
| log in / log out | 登录 / 退出登录 | unreviewed | |
| forget a saved key | 忘记已保存的密钥 | unreviewed | As the existing "会将其遗忘": "忘记并退出登录" (#1703). |
| password | 密码 | unreviewed | |
| passkey | 通行密钥 | unreviewed | |
| biometric unlock | 生物识别解锁 | unreviewed | As in `login_form.passkey_prompt.*`. |
| check before active-key operations | 每次使用活动密钥的操作前都确认；“使用密码或通行密钥确认” | unreviewed | `active_check.*`, `password_form.active_check_*` (#1513). |
| market / interest | 市场 / 利息 | unreviewed | |
| this session (key badge) | 当前会话 | unreviewed | |
| recovery account | 恢复账户 | unreviewed | |
| notification / notifications | 通知 | unreviewed | Toast announcement label "通知" (#1739). |
| Hive core (API set) | Hive 核心 | unreviewed | API-set title (#1747); the API names in brackets (database, condenser, broadcast) stay English. |
| lite accounts | 轻量账户 | unreviewed | As in the lite-account strings; API-set title (#1747). |
| Balance API | 余额 API | unreviewed | API-set title (#1747). Bridge, Hivemind REST, HAfAH and HiveSense are API names, not translated. |
| For You feed | 推荐内容 | unreviewed | As in the For You feed strings; API-set title (#1747). |
| API node / API set panel | 节点；API 类别 | unreviewed | /healthchecker (#1725)：“按 API 类别划分的 API 服务器”，node states “可用”“不支持”“宕机”“未知”“性能下降”；“自动选择”“默认”“使用中”。List separator “、”. |

## Register

Informal 你 is the more frequent form (168 uses against 102 of 您). Use 你
in new strings and do not mix the two within a screen.

## Plural forms

One category, `other`. Use a measure word: "{{count}} 票", "{{count}} 条回复".

| Category | Example |
|---|---|
| other | 结算后 +1 票（未计入） / 5小时前 |

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

None known. #1727 settled the delegation, payout and curation terms listed here before.
