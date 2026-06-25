# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension (Manifest V3) for calculating game character expenses in 梦幻西游 (Fantasy Westward Journey). The extension uses the Chrome Side Panel API to display a calculator that estimates costs based on character cultivation levels and skills.

### 核心功能

这是一个梦幻西游藏宝阁（xyq.cbg.163.com）角色价值计算器。其工作流程如下：

1. **数据采集**：从藏宝阁角色详情页自动读取人物的修炼等级、宠物修炼等级、师门技能等级、生活技能等级等信息
2. **成本计算**：根据各项技能/修炼的等级，查询 `data/data.json` 中的升级消耗表，计算将该角色从零培养到当前等级所需的总游戏币消耗
3. **价值换算**：按照用户设定的游戏币与人民币的汇率，将游戏币总消耗换算为人民币金额
4. **折扣分析**：将计算出的人民币价值与页面上该角色的当前售价进行对比，得出折扣比例，帮助玩家判断该角色售价是否划算

## Architecture

- **background.js** - Service worker: handles data extraction from game pages via `chrome.scripting.executeScript`, communicates extracted data to sidebar via Chrome messaging
- **sidebar.js** - Main calculator logic: loads cost data from JSON, populates UI fields, performs calculations
- **sidebar.html** - Calculator UI with input fields for cultivation levels, skill levels, and display of costs
- **data/data.json** - Cost data structured by type (修炼 categories, 门派技能, 生活技能, etc.)
- **_locales/zh_CN/messages.json** - Chinese localization strings

## Key Features

The extension extracts character data from `xyq.cbg.163.com` pages:
- 乾元丹 (Qianyuan Dan) levels
- 攻修/防修/法修/法抗 (Attack/Defense/Magic/Resistance cultivation)
- BB攻修/BB法修/BB防修/BB法防 (Pet cultivation)
- 门派技能 (School skills, up to 7 slots)
- 生活技能 (Life skills: 强身/冥想/神速/强壮/暗器/烹饪/中药/养生/健身/巧匠)

## Development

This is a pure client-side Chrome extension with no build step. To develop:

1. Load unpacked extension in Chrome: `chrome://extensions` → Enable Developer Mode → Load unpacked
2. Modify files and click refresh on the extension card
3. The extension requires host permissions for `xyq.cbg.163.com`

## Data Structure

`data/data.json` contains cost lookup tables keyed by level:
- `bbxiu` - Pet cultivation costs (uses `guozi_size` field, multiplied by 果子 price)
- `fangxiu`/`gongxiu` - Defense/Attack cultivation costs
- `qianyuandan` - Qianyuan Dan costs
- `qiangzhuang` - Strong body skill costs (up to level 60)
- `school_skill` - School skill costs (up to level 180)
- `life_skill` - Life skill costs (up to level 160)
- `xiulianshangxian` - Cultivation limit bonuses (levels 21-25)

## UI Layout

The calculator has four ratio inputs allowing different multipliers for each cost category:
- `bbxiu_ratio` - For pet cultivation
- `xiulian_ratio` - For character cultivation
- `school_skill_ratio` - For school skills
- `life_skill_data_ratio` - For life skills
