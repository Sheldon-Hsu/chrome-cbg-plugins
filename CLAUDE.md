# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Manifest V3 Chrome extension for valuing 梦幻西游 (Fantasy Westward Journey) characters listed on 藏宝阁 (`xyq.cbg.163.com` and the mobile site `xyq-m.cbg.163.com`). It reads cultivation/skill levels from a character page or listing page, converts "cost from zero to current level" into game currency using `data/data.json`, converts that to RMB with a user-supplied gold price, and compares it with the listing price to produce a discount (`折扣`).

The UI lives in Chrome's Side Panel. All game-page reading happens by injecting scripts from the service worker via `chrome.scripting.executeScript`.

## Development

There is no build step, package manager, linter, or automated test suite (no `package.json`). Everything is vanilla JS loaded directly by Chrome.

- Load unpacked: `chrome://extensions` → enable Developer Mode → Load unpacked → select the repo root.
- After editing, click the reload icon on the extension card; then close/reopen the side panel.
- The action click opens the side panel (`chrome.action.onClicked` in `background.js`).
- Release archives are kept by hand in `version/` (`cbg-calcuator-<version>.zip`); bump `version` in `manifest.json` when cutting one.
- `html/*.mhtml` and `test/*.mhtml` are saved copies of the PC and pocket list/detail pages, kept as DOM-structure references for selector work. They are not wired into any test runner, and the batch code only queries real `xyq.cbg.163.com` tabs.

## Runtime architecture

### Page flow

`manifest.json` declares `side_panel.default_path = index.html`.

1. `index.html` + `index.js` — launcher. Pick 电脑版/口袋版 and 单个计算/批量计算. Saves the mode to `chrome.storage.local.calcMode` (`"pc"` | `"pocket"`) and sends `{action:"switchPage", page}`.
2. `sidebar.html` + `sidebar.js` — single-character calculator. Fully DOM-driven: an input per stat, `setCost()` per row, checkbox-gated totals. It can also be opened as an independent popup window (`sidebar.html?standalone=1`, from `batch.html`); in that mode it shows a target-tab picker (populated by `chrome.tabs.query` directly in the page) and reads the explicitly selected tab by id, so batch mode keeps running in the side panel.
3. `batch.html` + `batch.js` — batch results table. It performs no page scraping and no tab navigation itself; it only computes from data messages and renders/edits/sorts/merges rows.
4. `background.js` — the service worker and the only place that touches game tabs: extraction, pagination, opening/closing detail tabs, the batch loop, pause/resume/stop state, and all cross-context messaging.

`switchPage` is handled by `chrome.sidePanel.setOptions({path})`; going "back" sends `switchPage` with `index.html`.

### Message protocol

All messages are `chrome.runtime.sendMessage`. The service worker is the hub.

| Action | Sent by | Meaning |
| --- | --- | --- |
| `switchPage` | index/sidebar/batch | Change side-panel path |
| `fetchData` | sidebar | Scrape a PC detail page (`tabId` or the active tab) and reply via `sendResponse` `{ok:true,data}` / `{ok:false,error}` |
| `fetchPocketData` | sidebar | Same for a pocket detail page |
| `batchFetchData` | batch | Scrape the current PC list page, reply `batchUpdateData` |
| `batchFetchPocketData` | batch | Scrape the current pocket list page, reply `batchUpdateData` |
| `autoBatchFetch` | batch | Loop over N PC list pages, emit `autoBatchProgress` |
| `autoBatchPocketFetch` | batch | Loop over N pocket list items, emit `autoBatchProgress` |
| `goToFirstPage` / `goToNextPage` | batch | Drive PC pagination manually |
| `pauseBatchCalc` / `resumeBatchCalc` / `stopBatchCalc` | batch | Set service-worker flags checked between pages/items |
| `fetchQydFromDetail` | batch | After a row opens its detail tab, read only 乾元丹/机缘 (via `pcExtractDetailData`) and reply `qydFetched` (no high-value check) |
| `batchHighValueScan` | batch | Open each result's detail page in a background tab and run the high-value check |
| `stopHighValueScan` | batch | Stop the running high-value scan |
| `batchUpdateData` | background → batch | `{results}` or `{error}` for one list page |
| `autoBatchProgress` | background → batch | `{status: start/extracting/pageDone/done/end, currentPage, totalPages, results?, error?}` |
| `qydFetched` | background → batch | `{detailUrl, ordersn, qyd, jyCur, jyMax}` (values are `null` when the detail page could not be read) |
| `highValueFetched` | background → batch | `{ordersn, detailUrl, hvDone, hvHigh, hvItemCount, hvItemBreakdown, hvAdvancedPetCount, hvPetChecked, hvLxValues, hvReasons, hvError}` |
| `highValueScanProgress` | background → batch | `{status: scanning/done, index, total, stopped?}` |

There is no persistent store besides `calcMode`; gold price, guozi price, and the four ratios live only in the inputs and reset to defaults on reload.

### PC vs pocket mode

Mode is chosen in `index.js` and read from `chrome.storage.local` by both `sidebar.js` and `batch.js` (it drives which buttons show and their labels).

- PC (`xyq.cbg.163.com`): batch pagination relies on the page's global `pager`/`goto`; list data is embedded JSON in `textarea#other_info_<ordersn>`; each row links to a detail page.
- Pocket (`xyq-m.cbg.163.com`): no pagination — the code clicks each `.list-item-link.product-item.js_product_item` (skipping the recommended area `.root_j7DZQ`), waits for the detail view, switches the `.hair-tab .tabs .item` tabs, and reads text with regexes. Price is `.price_OskaR`.

## Data extraction

Both modes produce the same `charData` shape consumed by the calculators:

- Cultivation: `gjxl`, `fsxl`, `fyxl`, `kfxl` (+ `*Upper` limit columns), `gjkzl`, `fskzl`, `fykzl`, `kfkzl` for pets.
- 乾元丹: `qyd`; 机缘: `jyCur` / `jyMax`.
- School skills: `skill_0`…`skill_6`.
- Life skills: `qs` 强身, `mx` 冥想, `cWeapon` 暗器, `cook` 烹饪, `zy` 中药, `ys` 养生, `js` 健身, `qj` 巧匠, `strong` 强壮, `speed` 神速.
- Listing metadata: `ordersn`, `school`, `level`, `server`, `price`, `detailUrl`.

Key extraction details:

- The PC list JSON (`other_info_*`) has cultivation in `iExptSki1..4` / `iMaxExpt1..4`, pets in `iBeastSki1..4`, and all skills in `all_skills`.
- **Field order is authoritative**: `iExptSki1/2/3/4` = 攻击/防御/法术/抗法修炼 and `iBeastSki1/2/3/4` = 攻击/防御/法术/抗法控制力 (per the official `RoleInfoParser.parse_role_xiulian` / `parse_pet_ctrl_skill`). `gongxiu` and `fangxiu` are different price tables (攻修 = 1.5× 防修), so swapping 防御 and 法术 changes the total whenever their levels differ.
- Life-skill IDs are mapped by `LIFE_SKILL_IDS`/`LIFE_SKILL_MAP` (the 10 skills that have a price table; IDs/names come from the official `game_auto_config.js → life_skill`).
- School skills are selected by the **official school-skill ID set** (`SCHOOL_SKILL_ID_RANGES`: 1–2, 4–20, 23–25, 29–146, 4001–4007, from `game_auto_config.js → school_skill`), capped at 180. Do not go back to "IDs < 200, top 7 by level": that also catches 剧情技能 (IDs 151–199) and diverges from the detail page. If more than 7 school skills are present, the detail page renders “师门技能信息有误” and no list, so the list extractor also yields zeros.
- `qyd` and 机缘 (`jyCur`/`jyMax`) are not available in the PC list JSON (`qyd` hard-coded to 0). Clicking a result row opens the detail tab in a new tab and sends `fetchQydFromDetail`; the worker waits 3 s, reuses `pcExtractDetailData`, replies `qydFetched`. Only these two fields are taken from the detail page — everything else is already identical at list-extraction time. The `qydFetched` handler writes `qyd`/`jyCur`/`jyMax` back into `charDataMap` and `cachedRawData` and recomputes that row; `mergePreservingHighValue` keeps them when the same character is scraped again.
- PC detail extraction uses however many school-skill `<p>` tags are rendered (missing ones count as 0), matching the list extractor's set.
- Page scrolling/pagination and anything needing page globals run with `world: "MAIN"`; DOM-only extraction runs in the default isolated world.
- `server` is used for the "ignore 花样年华" filter.

## Cost model

`data/data.json` is loaded at runtime with `fetch(chrome.runtime.getURL('data/data.json'))` (also listed in `web_accessible_resources`).

- Units: `totalcost` and `guozi_size` are in **万两**; `yxbPrice` is **元/万两** (default `0.0716`); `guoziPrice` is **万两 per 修炼果** (default `85`).
- `lookupCost(type, level, upper)` reads `costData[type][level].totalcost`, except `bbxiu`, whose cost is `guozi_size * guoziPrice`.
- Cultivation upper limits: when `upper > 20`, add `xiulianshangxian[upper].times * 2` for `fangxiu` and `* 3` for `gongxiu`.
- Two totals are computed: `total_origin` (no ratios) and `total_discount` (each category multiplied by its ratio). RMB is each total × `yxbPrice`.
- Ratios: `xiulian_ratio` for 乾元丹+人物修炼, `bbxiu_ratio` for pet cultivation, `school_skill_ratio`, `life_skill_data_ratio`. Empty input means 1 (`parseRatio` in both `batch.js` and `sidebar.js`); 0 is allowed.
- Both implementations accumulate the exact per-item cost × ratio and round only once at the RMB step, so the single calculator and the batch table give the same number. All ten life skills are counted in both by default.
- 机缘 bonus: if `jyMax > 0 && jyMax - jyCur <= 3`, add **500 RMB** to both totals.
- `discount = price / rmbDiscount * 10` (`5` means 5折). Batch colors: `≤ 5` green 捡漏, `> 5 && ≤ 6.5` amber 适中, otherwise red 偏贵. The batch table's 差值 column is `rmbDiscount - price`.
- Missing levels return `null` and are silently skipped in batch (contribute 0). The single calculator instead alerts "等级超过限制". Keep this difference in mind when a level exceeds the table.

Lookup-table ranges: `qianyuandan` 0–9, `gongxiu`/`fangxiu`/`bbxiu` 0–25, `xiulianshangxian` 21–25, `qiangzhuang` 1–60 (the JSON also has a `"0"` entry), `school_skill` 0–180, `life_skill` 0–160.

## Batch behavior

- `batch.js` caches raw rows in `cachedRawData`, results in `cachedCalcResults`, and per-`ordersn` full data in `charDataMap`.
- `addToCompare` (checked by default) merges new pages/items into the cache and dedupes by `ordersn`; otherwise each run replaces the table.
- Ratio or price changes trigger `recalculateAll()` over the cache; auto-batch pages always merge.
- `ignore_huanian` (checked by default) drops rows whose `server` contains 花样年华.
- 「单算窗口」opens `sidebar.html?standalone=1` in a separate popup window (`chrome.windows.create`) while the side panel stays on `batch.html`; the batch loop keeps running. In this mode `sidebar.js` lists game tabs (detail tabs first, then most recently accessed) and sends the selected `tabId` with `fetchData`/`fetchPocketData`. The popup URL also carries the batch page's 金价/修炼果价/四项比例 as query params, so a character scores the same in both windows.
- Rows are computed from list-page data alone and already match the single calculator; expanding a row only fills the two detail-only fields (乾元丹/机缘) via `qydFetched`. The list extractor therefore has to be exactly right — see the field-order and school-ID notes in “Data extraction”.
- Tab titles on both sites are all the same (梦幻西游藏宝阁), so the standalone picker labels each tab by injecting a small read-only script (`readTabInfo`): detail pages show server · school · level · price (`.infoList li.names` / `#role_info_box[data-school]` / `.infoList .price`; pocket uses `.pi-info .server` / `.level` / `.price`), list pages show the current page (`第N页/共M页`, from `.pager_bar`) or item count. Falls back to `#` + the last 8 chars of `eid`/order sn. Discarded tabs are not injected.
- Batch start/pagination handlers use `pickBatchTab()`: they prefer the active list-page tab, then the most recently accessed list-page tab, so having a character detail tab active does not make the batch scrape the wrong page.
- Clicking a result row opens the detail URL in a new tab and expands an editable detail panel; collapsing removes the tab. The panel's 重新计算 reruns `calculateFromData()` with edited values and per-field checkboxes.
- **High-value hint**: `pcDetectHighValue()` (in `background.js`, injected into the detail page) flags a character when the 道具 area has more than 5 items (counts `#RoleUsingEquips` + `#RoleStoreEquips` + `#RoleSplitEquips`; 法宝/灵宝/神器 excluded) or when more than 1 pet has 历史灵性值 > 10. The pet tab is lazy-loaded, so the function clicks `#role_pets`, reads any visible attribute blocks (`.petAttr`, `.tip-for-pet`, `.solidPetTip`) keyed per node so a pet is never counted twice, and — when blocks are not all rendered — clicks each pet avatar (falling back to `.btn-pet-detail`, then 属性/查看详情 text) until 2 advanced pets are found or all entries are tried; a whole-tab `innerText` scan with multiset diff is the last-resort fallback. Results come back as `highValueFetched` and are kept in `cachedRawData`/`charDataMap` (`hv*` fields), so they survive recalculations and page merges. They render as a row badge and a panel banner. Detection runs **only** when the 「检测高价值」 button is clicked (it walks all uncached rows sequentially using hidden tabs); expanding a row does not trigger it.
- Table sorting is click-to-toggle on `折扣` and `差值`.

## Gotchas: duplicated logic

The extension has no modules, so several algorithms are intentionally (or historically) duplicated. When changing one, grep for the others:

- **Cost lookup/formula** exists twice: `sidebar.js:setCost()` + `calculator()` (DOM-driven) and `batch.js:calculateFromData()` (pure). Change both or results diverge.
- **PC list extraction** (`extractPageData`) is duplicated in `batchFetchData` and `autoBatchFetch`; the surrounding loop and progress handling also differ slightly. Likewise **pocket detail extraction** is duplicated in `batchFetchPocketData` and `autoBatchPocketFetch`.
- **Default prices** `0.0716` / `85` are hard-coded in `index.html`, `sidebar.html`, and `batch.html`.
- Skill field names are repeated across background extraction, sidebar input IDs, batch panel HTML, and the calculators.

## Repo layout notes

- `background.js`, `sidebar.*`, `batch.*`, `index.*` — runtime code (see above).
- `data/data.json` — cost tables (`bbxiu`, `fangxiu`, `gongxiu`, `xiulianshangxian`, `qianyuandan`, `qiangzhuang`, `school_skill`, `life_skill`).
- `_locales/zh_CN/messages.json` — extension name/description/action title; `manifest.json` uses `__MSG_*`.
- `html/`, `test/` — saved page snapshots and screenshots for selector reference.
- `analyze/核心代码.txt` — captured CBG page parser source, useful for understanding the embedded `other_info` fields; not part of the extension.
- `version/` — historical packaged zips.
