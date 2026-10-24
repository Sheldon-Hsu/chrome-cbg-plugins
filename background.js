chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent(w => {
        if (w) {
            chrome.sidePanel.open({windowId: w.id});
        } else {
            console.error("无法获取当前窗口");
        }
    });
});

let globalCostData = null;

// 批量计算暂停/停止状态
let isBatchPaused = false;
let isBatchStopped = false;

// 高价值检测扫描状态
let isHighValueScanStopped = false;

// 检查是否暂停的辅助函数
async function checkPauseState() {
    while (isBatchPaused && !isBatchStopped) {
        await new Promise(r => setTimeout(r, 200));
    }
    return !isBatchStopped;
}

// ========== PC 详情页数据提取 ==========
// 该函数会被注入到角色详情页中执行，必须自包含（不能引用 background.js 里的其他变量）
function pcExtractDetailData() {
    function upperLimitSchoolSkill(skillLevel) {
        if (!skillLevel) return 0;
        let originLevel = parseInt(skillLevel);
        return originLevel > 180 ? 180 : originLevel;
    }

    try {
        // 先确认当前是角色详情页，避免在列表页上产生副作用或抛异常
        if (!document.getElementById('role_info_box') || !document.querySelector('.infoList')) {
            return {__error: '当前标签页不是角色详情页，请切换到角色详情标签页后再读取'};
        }

        const data = {};

        // 切回"基础信息"页签
        const basicBtn = document.getElementById('role_basic');
        if (basicBtn) basicBtn.click();

        // 价格
        const priceBox = document.querySelector('.infoList').querySelector('.price');
        if (priceBox) {
            const spans = Array.from(priceBox.querySelectorAll('span'));
            for (const span of spans) {
                if (span.textContent.includes('元')) {
                    const parts = span.textContent.replace(/\s/g, '').split('￥');
                    if (parts.length > 1) {
                        data.price = parts[1].split('（元）')[0].trim();
                    }
                    break;
                }
            }
        }

        const roleBox = document.getElementById('role_info_box');
        const kindName = roleBox.querySelector('#kindName');
        data.school = kindName ? kindName.textContent.trim() : '';

        // 乾元丹 / 机缘
        Array.from(roleBox.querySelectorAll('td')).forEach(td => {
            if (td.textContent.includes('新版乾元丹数量')) {
                const parts = td.textContent.split('：');
                if (parts.length > 1) data.qyd = parts[1].trim();
            }
            if (td.textContent.includes('月饼粽子机缘')) {
                let jyStr = td.textContent.split('：')[1];
                if (jyStr) {
                    jyStr = jyStr.trim();
                    if (jyStr.includes('/')) {
                        const parts = jyStr.split('/');
                        data.jyCur = parseInt(parts[0]) || 0;
                        data.jyMax = parseInt(parts[1]) || 0;
                    }
                }
            }
        });

        // 人物 / 宠物修炼
        Array.from(roleBox.querySelectorAll('th')).forEach(th => {
            if (th.textContent.includes('攻击修炼')) {
                const valueCell = th.nextElementSibling;
                if (!valueCell) return;
                const gjxlAndupper = valueCell.textContent.trim();
                data.gjxl = gjxlAndupper.split("/")[0];
                data.gjxlUpper = gjxlAndupper.split("/")[1];
            }
            if (th.textContent.includes('防御修炼')) {
                const valueCell = th.nextElementSibling;
                if (!valueCell) return;
                const fyxlAndupper = valueCell.textContent.trim();
                data.fyxl = fyxlAndupper.split("/")[0];
                data.fyxlUpper = fyxlAndupper.split("/")[1];
            }
            if (th.textContent.includes('法术修炼')) {
                const valueCell = th.nextElementSibling;
                if (!valueCell) return;
                const fsxlAndupper = valueCell.textContent.trim();
                data.fsxl = fsxlAndupper.split("/")[0];
                data.fsxlUpper = fsxlAndupper.split("/")[1];
            }
            if (th.textContent.includes('抗法修炼')) {
                const valueCell = th.nextElementSibling;
                if (!valueCell) return;
                const kfxlAndupper = valueCell.textContent.trim();
                data.kfxl = kfxlAndupper.split("/")[0];
                data.kfxlUpper = kfxlAndupper.split("/")[1];
            }
            if (th.textContent.includes('攻击控制力')) {
                const valueCell = th.nextElementSibling;
                if (valueCell) data.gjkzl = valueCell.textContent.trim();
            }
            if (th.textContent.includes('防御控制力')) {
                const valueCell = th.nextElementSibling;
                if (valueCell) data.fykzl = valueCell.textContent.trim();
            }
            if (th.textContent.includes('法术控制力')) {
                const valueCell = th.nextElementSibling;
                if (valueCell) data.fskzl = valueCell.textContent.trim();
            }
            if (th.textContent.includes('抗法控制力')) {
                const valueCell = th.nextElementSibling;
                if (valueCell) data.kfkzl = valueCell.textContent.trim();
            }
        });

        // 师门技能 / 生活技能
        const skillBtn = document.getElementById('role_skill');
        if (skillBtn) skillBtn.click();
        const skillBox = document.getElementById('role_info_box');
        const schoolSkillLists = skillBox ? skillBox.querySelector('#school_skill_lists') : null;
        if (schoolSkillLists) {
            const skillLevel = Array.from(schoolSkillLists.getElementsByTagName('p'))
                .map(p => p.textContent);
            // 只显示已学习的技能（不足 7 个时后面的按 0 处理），与列表页口径一致
            for (let i = 0; i < 7; i++) {
                data['skill_' + i] = i < skillLevel.length
                    ? upperLimitSchoolSkill(skillLevel[i].trim())
                    : 0;
            }
        }

        const lifeSkillLists = skillBox ? skillBox.querySelector('#life_skill_lists') : null;
        if (lifeSkillLists) {
            lifeSkillLists.querySelectorAll('h5').forEach(h5 => {
                const pValue = h5.previousElementSibling;
                if (!pValue) return;
                const level = pValue.textContent.trim();
                const name = h5.textContent.trim();
                if (name === "强壮") data.strong = level;
                else if (name === "神速") data.speed = level;
                else if (name === "强身术") data.qs = level;
                else if (name === "冥想") data.mx = level;
                else if (name === "暗器技巧") data.cWeapon = level;
                else if (name === "烹饪技巧") data.cook = level;
                else if (name === "中药医理") data.zy = level;
                else if (name === "养生之道") data.ys = level;
                else if (name === "健身术") data.js = level;
                else if (name === "巧匠之术") data.qj = level;
            });
        }

        // 恢复"基础信息"页签
        if (basicBtn) basicBtn.click();

        return data;
    } catch (e) {
        return {__error: '读取详情页失败: ' + (e && e.message ? e.message : String(e))};
    }
}

// ========== PC 详情页：检测高价值道具/召唤兽 ==========
// 该函数会被注入到角色详情页中执行，必须自包含（不能引用 background.js 里的其他变量）
// 规则：
//   - “道具/法宝”页签中的装备/道具（含已装备、行囊、拆卖道具，不含法宝/灵宝/神器）超过 5 件
//   - 或“召唤兽/孩子”页签中历史灵性值 > 10 的召唤兽超过 1 只
// 满足任意一条即视为可能携带高价值装备/召唤兽。
async function pcDetectHighValue() {
    const delay = ms => new Promise(r => setTimeout(r, ms));
    // 页签/宠物入口可能监听 mousedown/mouseup，逐个派发更稳妥
    const fireClick = (el) => {
        if (!el) return;
        try {
            ['mousedown', 'mouseup', 'click'].forEach(type => {
                el.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, view: window}));
            });
        } catch (e) {
            try { el.click(); } catch (ignore) { /* 忽略 */ }
        }
    };
    const out = {
        hvDone: false,
        hvHigh: false,
        hvItemCount: 0,
        hvItemBreakdown: {using: 0, store: 0, split: 0},
        hvAdvancedPetCount: 0,
        hvPetChecked: false,
        hvPetCount: 0,
        hvLxValues: [],
        hvReasons: [],
        hvError: ''
    };

    try {
        if (!document.getElementById('role_info_box')) {
            out.hvError = '当前标签页不是角色详情页';
            return out;
        }

        // 1）统计“道具”区域：已装备 / 行囊 / 拆卖道具
        const countItems = (id) => {
            const el = document.getElementById(id);
            if (!el) return 0;
            const imgs = el.querySelectorAll('img[data_equip_name]');
            if (imgs.length > 0) return imgs.length;
            return el.querySelectorAll('[data_equip_name]').length;
        };
        out.hvItemBreakdown = {
            using: countItems('RoleUsingEquips'),
            store: countItems('RoleStoreEquips'),
            split: countItems('RoleSplitEquips')
        };
        out.hvItemCount = out.hvItemBreakdown.using + out.hvItemBreakdown.store + out.hvItemBreakdown.split;

        // 记住当前页签，检测结束后恢复
        const currentTab = document.querySelector('.tabs li.on');
        const petsTab = document.getElementById('role_pets');
        let petBox = document.getElementById('role_info_box');
        let petReady = false;

        if (petsTab) {
            // 2）切换到“召唤兽/孩子”页签（内容为懒加载）
            const beforeText = petBox ? (petBox.textContent || '') : '';
            if (!petsTab.classList.contains('on')) fireClick(petsTab);

            const start = Date.now();
            while (Date.now() - start < 12000) {
                petBox = document.getElementById('role_info_box') || petBox;
                const text = petBox ? (petBox.textContent || '') : '';
                if (text.indexOf('历史灵性值') !== -1) {
                    petReady = true;
                    break;
                }
                if (petBox && petBox.querySelector('.petAttr, .petZiZhiTb, .btn-pet-detail, .tip-for-pet, .solidPetTip')) {
                    petReady = true;
                    break;
                }
                // 页签已切换且内容发生变化：即使没有召唤兽也算加载完成
                if (text !== beforeText && (petsTab.classList.contains('on')
                    || text.indexOf('查看详情') !== -1 || text.indexOf('召唤兽') !== -1)) {
                    petReady = true;
                    break;
                }
                await delay(300);
            }

            // 3）提取页面文本中的“历史灵性值”
            const extractLx = (text) => {
                const vals = [];
                if (!text) return vals;
                const re = /历史灵性值[^0-9]{0,12}(\d{1,3})/g;
                let m;
                while ((m = re.exec(text)) !== null) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n)) vals.push(n);
                }
                return vals;
            };
            const isVisible = (el) => {
                if (!el) return false;
                try {
                    const st = window.getComputedStyle(el);
                    if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                } catch (e) {
                    return false;
                }
            };
            // 可见的宠物属性块：可能每只召唤兽一块，也可能是点击后弹出的面板
            const visiblePanels = () => {
                const all = document.querySelectorAll('.tip-for-pet, .solidPetTip, .petAttr');
                const list = [];
                for (let i = 0; i < all.length; i++) {
                    if (isVisible(all[i])) list.push(all[i]);
                }
                // 去掉被其它属性块包含的节点，避免嵌套结构重复统计同一只
                return list.filter(node => !list.some(other => other !== node && other.contains(node)));
            };
            const nodeText = (node) => (node ? (node.innerText || node.textContent || '') : '');
            // 用 innerText 而不是 textContent，避免把 display:none 的模板/隐藏属性也统计进来
            const petBoxText = () => (petBox ? (petBox.innerText || petBox.textContent || '') : '');
            const advancedCount = (vals) => vals.filter(v => v > 10).length;

            // 记录每个属性块最近一次已统计的内容：内容变化才重新统计，避免同一只重复计数
            const panelState = new Map();
            let petValues = [];
            const collectPanels = () => {
                visiblePanels().forEach(node => {
                    const t = nodeText(node);
                    if (!t || panelState.get(node) === t) return;
                    panelState.set(node, t);
                    extractLx(t).forEach(v => petValues.push(v));
                });
            };
            collectPanels();
            const initialPanelCount = panelState.size;
            const hasPanel = initialPanelCount > 0;
            // 没有可识别的属性块时，直接扫描整个页签文本（属性可能已全部内联渲染）
            if (!hasPanel) extractLx(petBoxText()).forEach(v => petValues.push(v));

            // 4）逐个点击召唤兽入口，展开尚未渲染的属性
            if (petReady) {
                const candidates = [];
                const pushCandidate = (el) => {
                    if (!el || candidates.indexOf(el) !== -1) return;
                    candidates.push(el);
                };
                // 按优先级只取一种入口，避免同一只召唤兽被重复计数
                // 优先用召唤兽/孩子头像（每只一个），排除技能图标和拆卖区
                document.querySelectorAll('img[src*="/images/pets/"], img[src*="/images/child_icon/"]').forEach(el => {
                    if (!el.closest('.petSkill, #pet_skill_primary_panel, #not_pet_skill_wrap, .pet-split-img-wrap')) {
                        pushCandidate(el);
                    }
                });
                if (candidates.length === 0) {
                    document.querySelectorAll('.btn-pet-detail').forEach(pushCandidate);
                }
                if (candidates.length === 0) {
                    document.querySelectorAll('#role_info_box a, #role_info_box button, #role_info_box span, #role_info_box li').forEach(el => {
                        const t = (el.textContent || '').replace(/\s/g, '');
                        if (t === '属性' || t === '查看详情' || t === '查看属性' || t === '详情') {
                            pushCandidate(el);
                        }
                    });
                }
                out.hvPetCount = candidates.length;

                // 所有召唤兽的属性块都已内联渲染时无需再点击
                const allRendered = hasPanel && initialPanelCount >= candidates.length;

                if (candidates.length > 0 && !allRendered && advancedCount(petValues) < 2) {
                    const maxClicks = Math.min(candidates.length, 30);
                    // 点击过程中可能出现属性面板：一旦出现就改用面板统计
                    let panelMode = hasPanel;
                    // 无属性面板时的兜底：用多重集差集统计整块文本里新增的灵性值
                    let seenInBox = Object.create(null);
                    if (!hasPanel) {
                        extractLx(petBoxText()).forEach(v => {
                            seenInBox[v] = (seenInBox[v] || 0) + 1;
                        });
                    }
                    const addNewFromBox = (text) => {
                        const counts = Object.create(null);
                        Object.keys(seenInBox).forEach(k => { counts[k] = seenInBox[k]; });
                        const fresh = [];
                        extractLx(text).forEach(v => {
                            if (counts[v] > 0) {
                                counts[v]--;
                            } else {
                                fresh.push(v);
                            }
                        });
                        // 新出现的值计入结果，同时记为已统计，避免下次重复计数
                        fresh.forEach(v => {
                            petValues.push(v);
                            counts[v] = (counts[v] || 0) + 1;
                        });
                        seenInBox = counts;
                    };

                    for (let i = 0; i < maxClicks; i++) {
                        if (advancedCount(petValues) >= 2) break;
                        const el = candidates[i];
                        // 跳过会跳转到其它页面的链接，避免检测过程离开详情页
                        const anchor = el.closest ? el.closest('a[href]') : null;
                        if (anchor) {
                            const href = anchor.getAttribute('href') || '';
                            if (href && href !== '#' && href.indexOf('javascript:') !== 0) continue;
                        }

                        const beforeBox = hasPanel ? '' : petBoxText();
                        try {
                            el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
                            el.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
                        } catch (e) {
                            // 悬浮事件失败时仍继续尝试点击
                        }
                        fireClick(el);
                        await delay(320);

                        if (!panelMode && visiblePanels().length > 0) panelMode = true;
                        if (panelMode) {
                            // 只统计新出现/内容发生变化的属性块
                            collectPanels();
                        } else {
                            const afterBox = petBoxText();
                            if (afterBox !== beforeBox) addNewFromBox(afterBox);
                        }
                    }
                }
            }

            out.hvPetChecked = petReady || petValues.length > 0;
            out.hvLxValues = petValues.slice();
            out.hvAdvancedPetCount = advancedCount(petValues);
        }

        // 恢复原先的页签
        if (currentTab && currentTab.id && currentTab.id !== 'role_pets') {
            fireClick(currentTab);
        }

        out.hvDone = true;
        if (out.hvItemCount > 5) {
            const b = out.hvItemBreakdown;
            out.hvReasons.push('道具 ' + out.hvItemCount + ' 件（已装备 ' + b.using + ' / 行囊 ' + b.store
                + ' / 拆卖 ' + b.split + '，>5）');
        }
        if (out.hvAdvancedPetCount > 1) {
            const advVals = out.hvLxValues.filter(v => v > 10).slice(0, 6).join('、');
            out.hvReasons.push('进阶召唤兽 ' + out.hvAdvancedPetCount + ' 只'
                + (advVals ? '（历史灵性值 ' + advVals + '）' : '') + '，>1');
        }
        out.hvHigh = out.hvItemCount > 5 || out.hvAdvancedPetCount > 1;
        if (!out.hvPetChecked && !out.hvError) {
            out.hvError = '未能读取召唤兽属性';
        }
    } catch (e) {
        out.hvError = '检测失败: ' + (e && e.message ? e.message : String(e));
    }
    return out;
}

// 把上面的检测函数注入指定标签页（返回 Promise）
function injectHighValueDetect(tabId) {
    return new Promise((resolve) => {
        chrome.scripting.executeScript({
            target: {tabId: tabId},
            function: pcDetectHighValue
        }, (results) => {
            if (chrome.runtime.lastError) {
                resolve({
                    hvDone: false,
                    hvHigh: false,
                    hvError: chrome.runtime.lastError.message || '脚本注入失败'
                });
                return;
            }
            const data = results && results[0] ? results[0].result : null;
            resolve(data || {hvDone: false, hvHigh: false, hvError: '页面未返回检测结果'});
        });
    });
}

// 等待标签页加载完成（超时返回 false）
function waitForTabComplete(tabId, timeoutMs) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            try { chrome.tabs.onUpdated.removeListener(onUpdated); } catch (e) { /* 忽略 */ }
            clearTimeout(timer);
            resolve(ok);
        };
        const onUpdated = (id, info) => {
            if (id === tabId && info.status === 'complete') finish(true);
        };
        chrome.tabs.onUpdated.addListener(onUpdated);
        const timer = setTimeout(() => finish(false), timeoutMs);
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) return;
            if (tab && tab.status === 'complete') finish(true);
        });
    });
}

// 批量为当前结果逐页检测高价值道具/召唤兽（后台标签页，逐个进行）
async function runHighValueScan(items) {
    isHighValueScanStopped = false;
    const total = items.length;
    for (let i = 0; i < total; i++) {
        if (isHighValueScanStopped) break;
        const item = items[i] || {};
        chrome.runtime.sendMessage({
            action: 'highValueScanProgress',
            status: 'scanning',
            index: i + 1,
            total: total,
            ordersn: item.ordersn || ''
        });

        let tabId = null;
        try {
            const tab = await new Promise((resolve, reject) => {
                chrome.tabs.create({url: item.detailUrl, active: false}, (t) => {
                    if (chrome.runtime.lastError || !t) {
                        reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : '打开详情页失败'));
                    } else {
                        resolve(t);
                    }
                });
            });
            tabId = tab.id;
            // 给页面一点启动时间，再等加载完成（检测函数内部还会等待懒加载的召唤兽页签）
            await new Promise(r => setTimeout(r, 1200));
            await waitForTabComplete(tabId, 20000);
            if (isHighValueScanStopped) break;

            const hv = await injectHighValueDetect(tabId);
            chrome.runtime.sendMessage(Object.assign({
                action: 'highValueFetched',
                ordersn: item.ordersn || '',
                detailUrl: item.detailUrl || ''
            }, hv));
        } catch (e) {
            chrome.runtime.sendMessage({
                action: 'highValueFetched',
                ordersn: item.ordersn || '',
                detailUrl: item.detailUrl || '',
                hvDone: false,
                hvHigh: false,
                hvError: '检测失败: ' + (e && e.message ? e.message : String(e))
            });
        } finally {
            if (tabId !== null) {
                try { chrome.tabs.remove(tabId); } catch (e) { /* 忽略关闭失败 */ }
            }
        }
    }

    chrome.runtime.sendMessage({
        action: 'highValueScanProgress',
        status: 'done',
        stopped: isHighValueScanStopped
    });
    isHighValueScanStopped = false;
}

// ========== 口袋版详情页数据提取 ==========
// 同样会被注入到页面执行，必须自包含
async function pocketExtractDetailData() {
    const delay = ms => new Promise(r => setTimeout(r, ms));

    try {
        // 等待详情页关键元素出现（最多 3 秒，避免刚打开页面时读取失败）
        for (let i = 0; i < 30; i++) {
            if (document.querySelector('.hair-tab') || document.querySelector('.price_OskaR')) break;
            await delay(100);
        }
        if (!document.querySelector('.hair-tab')) {
            return {__error: '当前标签页不是口袋版角色详情页，请先打开角色详情页'};
        }

        const data = {
            price: 0, qyd: 0, jyCur: 0, jyMax: 0, school: '',
            gjxl: 0, gjxlUpper: 0, fsxl: 0, fsxlUpper: 0,
            fyxl: 0, fyxlUpper: 0, kfxl: 0, kfxlUpper: 0,
            gjkzl: 0, fskzl: 0, fykzl: 0, kfkzl: 0,
            skill_0: 0, skill_1: 0, skill_2: 0, skill_3: 0,
            skill_4: 0, skill_5: 0, skill_6: 0,
            qs: 0, mx: 0, cWeapon: 0, cook: 0,
            zy: 0, ys: 0, js: 0, qj: 0, strong: 0, speed: 0
        };

        // 价格
        const priceEl = document.querySelector('.price_OskaR');
        if (priceEl) {
            data.price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, '')) || 0;
        }

        // 门派
        const roleInfo = document.querySelector('.roleInfo_u6xHT, .title_q5uZ9');
        if (roleInfo) {
            const schoolEl = roleInfo.querySelector('.txt');
            if (schoolEl) data.school = schoolEl.textContent.trim();
        }

        // 找到页签
        const tabItems = document.querySelectorAll('.hair-tab .tabs .item');
        let xiulianTab = null;
        let skillTab = null;
        tabItems.forEach(tab => {
            const text = tab.textContent.trim();
            if (text.includes('人物') || text.includes('修炼')) xiulianTab = tab;
            if (text === '技能') skillTab = tab;
        });

        // "人物/修炼"页签：修炼 + 乾元丹 + 机缘
        if (xiulianTab) {
            xiulianTab.click();
            for (let i = 0; i < 30; i++) {
                await delay(100);
                const currentText = document.body.innerText;
                if (currentText.includes('攻击修炼') || currentText.includes('防御修炼')) break;
            }
            await delay(500);

            const xiulianText = document.body.innerText;

            const qydMatch = xiulianText.match(/新版乾元丹数量[：:]\s*(\d+)/);
            if (qydMatch) data.qyd = parseInt(qydMatch[1]) || 0;

            const jyMatch = xiulianText.match(/月饼粽子机缘[：:]\s*(\d+)\s*\/\s*(\d+)/);
            if (jyMatch) {
                data.jyCur = parseInt(jyMatch[1]) || 0;
                data.jyMax = parseInt(jyMatch[2]) || 0;
            }

            const gjxlMatch = xiulianText.match(/攻击修炼[：:]\s*(\d+)(?:\/(\d+))?/);
            if (gjxlMatch) { data.gjxl = parseInt(gjxlMatch[1]) || 0; data.gjxlUpper = parseInt(gjxlMatch[2]) || 0; }
            const fyxlMatch = xiulianText.match(/防御修炼[：:]\s*(\d+)(?:\/(\d+))?/);
            if (fyxlMatch) { data.fyxl = parseInt(fyxlMatch[1]) || 0; data.fyxlUpper = parseInt(fyxlMatch[2]) || 0; }
            const fsxlMatch = xiulianText.match(/法术修炼[：:]\s*(\d+)(?:\/(\d+))?/);
            if (fsxlMatch) { data.fsxl = parseInt(fsxlMatch[1]) || 0; data.fsxlUpper = parseInt(fsxlMatch[2]) || 0; }
            const kfxlMatch = xiulianText.match(/抗法修炼[：:]\s*(\d+)(?:\/(\d+))?/);
            if (kfxlMatch) { data.kfxl = parseInt(kfxlMatch[1]) || 0; data.kfxlUpper = parseInt(kfxlMatch[2]) || 0; }

            const gjkzlMatch = xiulianText.match(/攻击控制力[：:]\s*(\d+)/);
            if (gjkzlMatch) data.gjkzl = parseInt(gjkzlMatch[1]) || 0;
            const fykzlMatch = xiulianText.match(/防御控制力[：:]\s*(\d+)/);
            if (fykzlMatch) data.fykzl = parseInt(fykzlMatch[1]) || 0;
            const fskzlMatch = xiulianText.match(/法术控制力[：:]\s*(\d+)/);
            if (fskzlMatch) data.fskzl = parseInt(fskzlMatch[1]) || 0;
            const kfkzlMatch = xiulianText.match(/抗法控制力[：:]\s*(\d+)/);
            if (kfkzlMatch) data.kfkzl = parseInt(kfkzlMatch[1]) || 0;
        }

        // "技能"页签：师门技能 + 生活技能
        if (skillTab) {
            skillTab.click();
            for (let i = 0; i < 30; i++) {
                await delay(100);
                const currentText = document.body.innerText;
                if (currentText.includes('师门技能') || currentText.includes('强身术') || currentText.includes('冥想')) break;
            }
            await delay(500);

            const skillText = document.body.innerText;

            const skillPattern = /师门技能[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)/;
            const skillMatch = skillText.match(skillPattern);
            if (skillMatch) {
                for (let i = 0; i < 7; i++) {
                    data['skill_' + i] = Math.min(parseInt(skillMatch[i + 1]) || 0, 180);
                }
            }

            const lifeSkillPatterns = {
                qs: /强身(?:术)?[：:\s]\s*(\d+)/,
                mx: /冥想[：:\s]\s*(\d+)/,
                cWeapon: /暗器(?:技巧)?[：:\s]\s*(\d+)/,
                cook: /烹饪(?:技巧)?[：:\s]\s*(\d+)/,
                zy: /中药(?:医理)?[：:\s]\s*(\d+)/,
                ys: /养生(?:之道)?[：:\s]\s*(\d+)/,
                js: /健身(?:术)?[：:\s]\s*(\d+)/,
                qj: /巧匠(?:之术)?[：:\s]\s*(\d+)/,
                strong: /强壮[：:\s]\s*(\d+)/,
                speed: /神速[：:\s]\s*(\d+)/
            };
            for (const [key, pattern] of Object.entries(lifeSkillPatterns)) {
                const match = skillText.match(pattern);
                if (match) data[key] = parseInt(match[1]) || 0;
            }
        }

        return data;
    } catch (e) {
        return {__error: '读取口袋版详情页失败: ' + (e && e.message ? e.message : String(e))};
    }
}

// 判断是否为角色详情页 URL（批量操作需要挑列表页标签）
function isDetailUrl(url, isPocket) {
    try {
        const u = new URL(url || '');
        if (isPocket) return u.pathname.indexOf('/cgi/mweb/equip/') !== -1;
        return u.pathname === '/equip' || u.pathname.indexOf('/equip') === 0;
    } catch (e) {
        return false;
    }
}

// 批量操作优先选择列表页标签：先看当前激活标签，再看最近访问的列表页标签
function pickBatchTab(tabs, isPocket) {
    if (!tabs || tabs.length === 0) return null;
    const active = tabs.find(t => t.active);
    if (active && !isDetailUrl(active.url, isPocket)) return active;
    const listTabs = tabs.filter(t => !isDetailUrl(t.url, isPocket));
    listTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    return listTabs[0] || active || tabs[0];
}

// 解析目标标签页：优先使用消息里指定的 tabId，否则取当前窗口激活标签页
function getTargetTab(request, callback) {
    if (request && request.tabId) {
        chrome.tabs.get(request.tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                callback(null, '目标标签页不存在或已关闭，请刷新标签页列表');
            } else {
                callback(tab);
            }
        });
        return;
    }
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs || tabs.length === 0) {
            callback(null, '未找到当前标签页');
        } else {
            callback(tabs[0]);
        }
    });
}

// 确保侧边栏可用
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setOptions({
        enabled: true
    });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "switchPage") {
        chrome.sidePanel.setOptions({ path: request.page });
        return;
    }

    // 暂停批量计算
    if (request.action === "pauseBatchCalc") {
        isBatchPaused = true;
        return;
    }

    // 继续批量计算
    if (request.action === "resumeBatchCalc") {
        isBatchPaused = false;
        return;
    }

    // 停止批量计算
    if (request.action === "stopBatchCalc") {
        isBatchPaused = false;
        isBatchStopped = true;
        return;
    }


    // ========== 单个计算：PC 角色详情页 ==========
    if (request.action === "fetchData") {
        getTargetTab(request, (tab, error) => {
            if (!tab) {
                sendResponse({ok: false, error: error || '未找到目标标签页'});
                return;
            }
            chrome.scripting.executeScript({
                target: {tabId: tab.id},
                function: pcExtractDetailData
            }, (results) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ok: false, error: '脚本注入失败: ' + chrome.runtime.lastError.message});
                    return;
                }
                const data = results && results[0] ? results[0].result : null;
                if (!data) {
                    sendResponse({ok: false, error: '页面未返回数据'});
                } else if (data.__error) {
                    sendResponse({ok: false, error: data.__error, url: tab.url});
                } else {
                    sendResponse({ok: true, data: data, url: tab.url});
                }
            });
        });
        return true;
    }

    // 跳转到首页：调用页面的 goto(1)
    if (request.action === "goToFirstPage") {
        chrome.tabs.query({url: "*://xyq.cbg.163.com/*"}, (tabs) => {
            if (!tabs || tabs.length === 0) {
                sendResponse({success: false, error: "未找到藏宝阁页面，请先打开藏宝阁"});
                return;
            }
            const tab = pickBatchTab(tabs, false);
            const tabId = tab.id;
            chrome.scripting.executeScript({
                target: {tabId},
                world: "MAIN",
                function: () => {
                    if (typeof window.goto === 'function') {
                        window.goto(1);
                        return {success: true, page: 1};
                    }
                    return {success: false, error: "页面无 goto 函数"};
                }
            }, (results) => {
                if (chrome.runtime.lastError) {
                    sendResponse({success: false, error: "脚本注入失败: " + chrome.runtime.lastError.message});
                    return;
                }
                if (!results || !results[0]) {
                    sendResponse({success: false, error: "脚本未返回结果"});
                    return;
                }
                sendResponse(results[0].result);
            });
        });
        return true;
    }

    // 跳转到下一页：模拟点击页面渲染后的"下一页"链接
    if (request.action === "goToNextPage") {
        chrome.tabs.query({url: "*://xyq.cbg.163.com/*"}, (tabs) => {
            if (!tabs || tabs.length === 0) {
                sendResponse({success: false, error: "未找到藏宝阁页面，请先打开藏宝阁"});
                return;
            }
            const tab = pickBatchTab(tabs, false);
            const tabId = tab.id;
            chrome.scripting.executeScript({
                target: {tabId},
                world: "MAIN",
                function: () => {
                    // 渲染后的分页在 #pager_bar .pages 中
                    const pagerBar = document.getElementById('pager_bar');
                    if (!pagerBar) return {success: false, error: "未找到分页栏"};
                    const links = pagerBar.querySelectorAll('.pages a');
                    for (const link of links) {
                        if (link.textContent.trim() === '下一页') {
                            link.click();
                            return {success: true, page: (typeof pager !== 'undefined' ? pager.cur_page : 0) + 1};
                        }
                    }
                    return {success: false, error: "未找到下一页链接"};
                }
            }, (results) => {
                if (chrome.runtime.lastError) {
                    sendResponse({success: false, error: "脚本注入失败: " + chrome.runtime.lastError.message});
                    return;
                }
                if (!results || !results[0]) {
                    sendResponse({success: false, error: "脚本未返回结果"});
                    return;
                }
                sendResponse(results[0].result);
            });
        });
        return true;
    }

    // 自动翻页批量计算
    if (request.action === "autoBatchFetch") {
        const totalPages = request.totalPages || 10;

        // 将 executeScript 包装为 Promise
        function execScript(tabId, opts) {
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript(Object.assign({target: {tabId}}, opts), (results) => {
                    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                    if (!results || !results[0]) return reject(new Error("脚本未返回结果"));
                    resolve(results[0].result);
                });
            });
        }

        function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

        function scrollToBottom() {
            window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
        }

        // 获取当前页码和总页数（等待 pager 对象加载）
        function getPageInfo() {
            // 尝试从 pager 对象获取
            if (typeof pager === 'object' && pager.cur_page) {
                return {curPage: pager.cur_page, totalPage: pager.num_end || 1};
            }
            // 尝试从页面 DOM 解析（"第X页, 共Y页"）
            const pagerBar = document.getElementById('pager_bar');
            if (pagerBar) {
                const text = pagerBar.textContent || '';
                const curMatch = text.match(/第(\d+)页/);
                const totalMatch = text.match(/共(\d+)页/);
                if (curMatch && totalMatch) {
                    return {curPage: parseInt(curMatch[1]), totalPage: parseInt(totalMatch[1])};
                }
            }
            return {curPage: 1, totalPage: 1};
        }

        // 跳转到下一页：模拟点击渲染后的"下一页"链接（#pager_bar .pages）
        // 返回点击前的页码，用于后续检测翻页是否完成
        function gotoNextPage() {
            const pagerBar = document.getElementById('pager_bar');
            if (!pagerBar) return {success: false, error: "未找到分页栏"};
            const links = pagerBar.querySelectorAll('.pages a');
            for (const link of links) {
                if (link.textContent.trim() === '下一页') {
                    const beforePage = (typeof pager !== 'undefined') ? pager.cur_page : 0;
                    link.click();
                    return {success: true, page: beforePage + 1, beforePage: beforePage};
                }
            }
            return {success: false, error: "未找到下一页链接"};
        }

        // 检查页码是否已变化（翻页完成的标志）
        function checkPageChanged(oldPage) {
            try {
                if (typeof pager !== 'object') return false;
                const curPage = pager.cur_page || 0;
                // 页码变了，且有数据
                return curPage > oldPage
                    && document.querySelectorAll('textarea[id^="other_info_"]').length > 0;
            } catch (e) {
                return false;
            }
        }

        // 检查页面数据是否已加载完成
        // 通过检测 textarea 元素和对应的角色链接是否都已渲染
        function checkDataLoaded() {
            try {
                const textareas = document.querySelectorAll('textarea[id^="other_info_"]');
                if (textareas.length === 0) return false;

                // 检查每个 textarea 是否都有对应的角色链接已渲染
                let loadedCount = 0;
                for (const textarea of textareas) {
                    const ordersn = textarea.id.replace('other_info_', '');
                    const link = document.querySelector('a[data_game_ordersn="' + ordersn + '"]');
                    if (link && link.closest('tr')) {
                        loadedCount++;
                    }
                }

                // 至少有一半的数据已渲染完成（考虑可能有部分数据加载失败）
                return loadedCount >= Math.ceil(textareas.length / 2);
            } catch (e) {
                return false;
            }
        }

        // 等待数据加载完成的通用函数
        // maxWait: 最大等待时间（ms），interval: 检查间隔（ms）
        async function waitForDataLoad(maxWait = 10000, interval = 300) {
            const startTime = Date.now();
            while (Date.now() - startTime < maxWait) {
                if (checkDataLoaded()) {
                    return true;
                }
                await delay(interval);
            }
            return false;
        }

        // 提取当前页面的角色数据（与 batchFetchData 共用同一逻辑）
        function extractPageData() {
            // 只有这 10 个生活技能在 data/data.json 里有价目表，映射来自官方配置
            // game_auto_config.js → life_skill（201 强身术、202 冥想、203 暗器技巧、
            // 206 中药医理、208 烹饪技巧、211 养生之道、212 健身术、216 巧匠之术、
            // 230 强壮、237 神速）。
            const LIFE_SKILL_IDS = new Set(["201","202","203","206","208","211","212","216","230","237"]);
            const LIFE_SKILL_MAP = {
                "201": "qs", "202": "mx", "203": "cWeapon", "206": "zy",
                "208": "cook", "211": "ys", "212": "js", "216": "qj",
                "230": "strong", "237": "speed"
            };
            // 师门技能 ID 同样来自官方配置 game_auto_config.js → school_skill（共 147 个）。
            // 详情页是按这份配置渲染的，必须按 ID 精确匹配，不能再用“等级最高的 7 个”去猜
            // （那样会把 ID < 200 的剧情技能算成师门技能，和单算窗口对不上）。
            const SCHOOL_SKILL_ID_RANGES = [[1, 2], [4, 20], [23, 25], [29, 146], [4001, 4007]];
            const SCHOOL_SKILL_IDS = new Set();
            SCHOOL_SKILL_ID_RANGES.forEach(function (range) {
                for (let i = range[0]; i <= range[1]; i++) SCHOOL_SKILL_IDS.add(String(i));
            });
            const SCHOOL_NAMES = {
                1:"大唐官府",2:"化生寺",3:"方寸山",4:"狮驼岭",5:"魔王寨",
                6:"女儿村",7:"普陀山",8:"盘丝洞",9:"地府",10:"龙宫",
                11:"天宫",12:"五庄观",13:"凌波城",14:"无底洞",15:"女魃墓",
                16:"花果山",17:"东海渊",18:"鬼市",19:"天机城",20:"神木林"
            };
            function upperLimit(val) {
                if (!val) return 0;
                let v = parseInt(val);
                return v > 180 ? 180 : v;
            }
            const results = [];
            const textareas = document.querySelectorAll('textarea[id^="other_info_"]');
            textareas.forEach(textarea => {
                try {
                    const ordersn = textarea.id.replace('other_info_', '');
                    const info = JSON.parse(textarea.value.trim());
                    const link = document.querySelector('a[data_game_ordersn="' + ordersn + '"]');
                    if (!link) return;
                    const row = link.closest('tr');
                    if (!row) return;
                    const priceSpan = row.querySelector('span.p1000, span.p10000, span.p100000, span.p1000000');
                    let price = 0;
                    if (priceSpan) {
                        const priceText = priceSpan.textContent.replace(/[^\d.]/g, '');
                        price = parseFloat(priceText) || 0;
                    }
                    const schoolSpan = row.querySelector('span.vertical-middle');
                    const schoolName = schoolSpan ? schoolSpan.textContent.trim() : (SCHOOL_NAMES[info.iSchool] || '未知');
                    const detailUrl = link.href || '';
                    const tds = row.querySelectorAll('td');
                    let serverName = '';
                    if (tds.length >= 2) {
                        const serverTd = tds[tds.length - 2];
                        const childNodes = serverTd.childNodes;
                        for (let i = 0; i < childNodes.length; i++) {
                            const node = childNodes[i];
                            if (node.nodeType === Node.TEXT_NODE) {
                                const text = node.textContent.trim();
                                if (text && !text.includes('限时服务器')) { serverName = text; break; }
                            } else if (node.tagName === 'BR') { break; }
                        }
                    }
                    // 字段顺序以官方 RoleInfoParser 为准（详情页也是用它渲染的）：
                    // iExptSki1/2/3/4 = 攻击/防御/法术/抗法修炼，
                    // iBeastSki1/2/3/4 = 攻击/防御/法术/抗法控制力。
                    // 之前把 2、3 写反了，防御和法术的价目表不同（攻修是防修的 1.5 倍），
                    // 只要这两项等级不相等，批量就会和详情页/单算窗口算出不同的总值。
                    const gjxl = info.iExptSki1 || 0;
                    const gjxlUpper = info.iMaxExpt1 || 0;
                    const fyxl = info.iExptSki2 || 0;
                    const fyxlUpper = info.iMaxExpt2 || 0;
                    const fsxl = info.iExptSki3 || 0;
                    const fsxlUpper = info.iMaxExpt3 || 0;
                    const kfxl = info.iExptSki4 || 0;
                    const kfxlUpper = info.iMaxExpt4 || 0;
                    // 列表页无法读取乾元丹信息，固定为0（点开详情页后再补）
                    const qyd = 0;
                    const gjkzl = info.iBeastSki1 || 0;
                    const fykzl = info.iBeastSki2 || 0;
                    const fskzl = info.iBeastSki3 || 0;
                    const kfkzl = info.iBeastSki4 || 0;
                    const allSkills = info.all_skills || {};
                    const lifeSkills = {};
                    const schoolSkillLevels = [];
                    for (const [id, level] of Object.entries(allSkills)) {
                        if (LIFE_SKILL_IDS.has(id)) {
                            lifeSkills[LIFE_SKILL_MAP[id]] = level;
                        } else if (SCHOOL_SKILL_IDS.has(id)) {
                            schoolSkillLevels.push(level);
                        }
                    }
                    // 详情页在师门技能超过 7 个时只显示“师门技能信息有误”、不渲染列表，
                    // 单算窗口此时读不到师门技能（按 0 计），这里保持一致。
                    const schoolSkills = schoolSkillLevels.length > 7
                        ? []
                        : schoolSkillLevels.map(upperLimit);
                    while (schoolSkills.length < 7) schoolSkills.push(0);
                    results.push({
                        ordersn, name: info.cName || '', level: info.iGrade || 0,
                        school: schoolName, schoolCode: info.iSchool || 0,
                        server: serverName,
                        price, detailUrl, qyd,
                        gjxl, gjxlUpper, fsxl, fsxlUpper, fyxl, fyxlUpper, kfxl, kfxlUpper,
                        gjkzl, fskzl, fykzl, kfkzl,
                        skill_0: schoolSkills[0], skill_1: schoolSkills[1],
                        skill_2: schoolSkills[2], skill_3: schoolSkills[3],
                        skill_4: schoolSkills[4], skill_5: schoolSkills[5],
                        skill_6: schoolSkills[6],
                        qs: lifeSkills.qs || 0, mx: lifeSkills.mx || 0,
                        cWeapon: lifeSkills.cWeapon || 0, cook: lifeSkills.cook || 0,
                        zy: lifeSkills.zy || 0, ys: lifeSkills.ys || 0,
                        js: lifeSkills.js || 0, qj: lifeSkills.qj || 0,
                        strong: lifeSkills.strong || 0, speed: lifeSkills.speed || 0
                    });
                } catch (e) {
                    console.warn('解析角色数据失败:', e);
                }
            });
            return results;
        }

        // 主流程：逐页提取 + 翻页
        chrome.tabs.query({url: "*://xyq.cbg.163.com/*"}, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "未找到藏宝阁页面，请先打开藏宝阁列表页"
                });
                return;
            }
            const tab = pickBatchTab(tabs, false);
            const tabId = tab.id;

            try {
                // 获取页面信息
                const pageInfo = await execScript(tabId, {world: "MAIN", function: getPageInfo});
                const curPage = pageInfo.curPage;
                const totalPage = pageInfo.totalPage;
                // 实际计算页数 = 用户设置的页数 和 剩余页数 取较小值
                const remainingPages = totalPage - curPage + 1;
                const actualTotal = (remainingPages > 0) ? Math.min(totalPages, remainingPages) : totalPages;

                // 通知前端实际计算页数
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    currentPage: 0,
                    totalPages: actualTotal,
                    status: "start"
                });

                // 重置状态
                isBatchPaused = false;
                isBatchStopped = false;

                for (let i = 0; i < actualTotal; i++) {
                    // 检查是否暂停或停止
                    const shouldContinue = await checkPauseState();
                    if (!shouldContinue) {
                        chrome.runtime.sendMessage({
                            action: "autoBatchProgress",
                            currentPage: i,
                            totalPages: actualTotal,
                            status: "end",
                            reason: "用户停止"
                        });
                        return;
                    }

                    // 通知前端当前进度
                    chrome.runtime.sendMessage({
                        action: "autoBatchProgress",
                        currentPage: i + 1,
                        totalPages: actualTotal,
                        status: "extracting"
                    });

                    // 滚动到底部触发懒加载，等待数据加载完成
                    await execScript(tabId, {world: "MAIN", function: scrollToBottom});
                    const dataLoaded = await execScript(tabId, {world: "MAIN", function: waitForDataLoad});
                    if (!dataLoaded) {
                        // 如果等待超时，再额外等待一小段时间作为兜底
                        await delay(1000);
                    }

                    // 提取当前页数据
                    const results = await execScript(tabId, {function: extractPageData});

                    // 发回当前页数据
                    chrome.runtime.sendMessage({
                        action: "autoBatchProgress",
                        currentPage: i + 1,
                        totalPages: actualTotal,
                        results: results || [],
                        status: "pageDone"
                    });

                    // 如果不是最后一页，翻到下一页
                    if (i < actualTotal - 1) {
                        // 记录当前页码
                        const beforePageInfo = await execScript(tabId, {world: "MAIN", function: getPageInfo});
                        const beforePage = beforePageInfo.curPage;

                        // 点击"下一页"
                        const navResult = await execScript(tabId, {world: "MAIN", function: gotoNextPage});
                        if (!navResult || !navResult.success) {
                            chrome.runtime.sendMessage({
                                action: "autoBatchProgress",
                                currentPage: i + 1,
                                totalPages: actualTotal,
                                status: "end",
                                reason: navResult ? navResult.error : "翻页失败"
                            });
                            break;
                        }

                        // 轮询等待页码变化（最多等 15 秒）
                        let pageChanged = false;
                        for (let retry = 0; retry < 30; retry++) {
                            await delay(500);
                            try {
                                const info = await execScript(tabId, {world: "MAIN", function: getPageInfo});
                                if (info.curPage > beforePage) {
                                    pageChanged = true;
                                    break;
                                }
                            } catch (e) {
                                // 页面正在加载，继续等待
                            }
                        }
                        if (!pageChanged) {
                            chrome.runtime.sendMessage({
                                action: "autoBatchProgress",
                                currentPage: i + 1,
                                totalPages: actualTotal,
                                status: "end",
                                reason: "翻页超时"
                            });
                            break;
                        }

                        // 翻页成功后，等待数据加载完成
                        const dataLoaded = await execScript(tabId, {world: "MAIN", function: waitForDataLoad});
                        if (!dataLoaded) {
                            // 如果等待超时，再额外等待一小段时间作为兜底
                            await delay(1000);
                        }
                    }
                }

                // 全部完成
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    currentPage: actualTotal,
                    totalPages: actualTotal,
                    status: "done"
                });
            } catch (e) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "自动计算失败: " + e.message
                });
            }
        });
    }

    // 批量计算：连续提取多页角色数据
    if (request.action === "batchFetchData") {
        // 将 executeScript 包装为 Promise
        function execScript(tabId, opts) {
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript(Object.assign({target: {tabId}}, opts), (results) => {
                    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                    if (!results || !results[0]) return reject(new Error("脚本未返回结果"));
                    resolve(results[0].result);
                });
            });
        }

        // 延迟函数
        function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

        // 滚动到页面底部，触发懒加载等页面行为
        function scrollToBottom() {
            window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
        }

        // 检查页面数据是否已加载完成
        // 通过检测 textarea 元素和对应的角色链接是否都已渲染
        function checkDataLoaded() {
            try {
                const textareas = document.querySelectorAll('textarea[id^="other_info_"]');
                if (textareas.length === 0) return false;

                // 检查每个 textarea 是否都有对应的角色链接已渲染
                let loadedCount = 0;
                for (const textarea of textareas) {
                    const ordersn = textarea.id.replace('other_info_', '');
                    const link = document.querySelector('a[data_game_ordersn="' + ordersn + '"]');
                    if (link && link.closest('tr')) {
                        loadedCount++;
                    }
                }

                // 至少有一半的数据已渲染完成（考虑可能有部分数据加载失败）
                return loadedCount >= Math.ceil(textareas.length / 2);
            } catch (e) {
                return false;
            }
        }

        // 等待数据加载完成的通用函数
        // maxWait: 最大等待时间（ms），interval: 检查间隔（ms）
        async function waitForDataLoad(maxWait = 10000, interval = 300) {
            const startTime = Date.now();
            while (Date.now() - startTime < maxWait) {
                if (checkDataLoaded()) {
                    return true;
                }
                await delay(interval);
            }
            return false;
        }

        // 提取当前页面的角色数据（ISOLATED world，仅读 DOM）
        function extractPageData() {
            // 只有这 10 个生活技能在 data/data.json 里有价目表，映射来自官方配置
            // game_auto_config.js → life_skill（201 强身术、202 冥想、203 暗器技巧、
            // 206 中药医理、208 烹饪技巧、211 养生之道、212 健身术、216 巧匠之术、
            // 230 强壮、237 神速）。
            const LIFE_SKILL_IDS = new Set(["201","202","203","206","208","211","212","216","230","237"]);
            const LIFE_SKILL_MAP = {
                "201": "qs", "202": "mx", "203": "cWeapon", "206": "zy",
                "208": "cook", "211": "ys", "212": "js", "216": "qj",
                "230": "strong", "237": "speed"
            };
            // 师门技能 ID 同样来自官方配置 game_auto_config.js → school_skill（共 147 个）。
            // 详情页是按这份配置渲染的，必须按 ID 精确匹配，不能再用“等级最高的 7 个”去猜
            // （那样会把 ID < 200 的剧情技能算成师门技能，和单算窗口对不上）。
            const SCHOOL_SKILL_ID_RANGES = [[1, 2], [4, 20], [23, 25], [29, 146], [4001, 4007]];
            const SCHOOL_SKILL_IDS = new Set();
            SCHOOL_SKILL_ID_RANGES.forEach(function (range) {
                for (let i = range[0]; i <= range[1]; i++) SCHOOL_SKILL_IDS.add(String(i));
            });
            const SCHOOL_NAMES = {
                1:"大唐官府",2:"化生寺",3:"方寸山",4:"狮驼岭",5:"魔王寨",
                6:"女儿村",7:"普陀山",8:"盘丝洞",9:"地府",10:"龙宫",
                11:"天宫",12:"五庄观",13:"凌波城",14:"无底洞",15:"女魃墓",
                16:"花果山",17:"东海渊",18:"鬼市",19:"天机城",20:"神木林"
            };
            function upperLimit(val) {
                if (!val) return 0;
                let v = parseInt(val);
                return v > 180 ? 180 : v;
            }
            const results = [];
            const textareas = document.querySelectorAll('textarea[id^="other_info_"]');
            textareas.forEach(textarea => {
                try {
                    const ordersn = textarea.id.replace('other_info_', '');
                    const info = JSON.parse(textarea.value.trim());
                    const link = document.querySelector('a[data_game_ordersn="' + ordersn + '"]');
                    if (!link) return;
                    const row = link.closest('tr');
                    if (!row) return;
                    const priceSpan = row.querySelector('span.p1000, span.p10000, span.p100000, span.p1000000');
                    let price = 0;
                    if (priceSpan) {
                        const priceText = priceSpan.textContent.replace(/[^\d.]/g, '');
                        price = parseFloat(priceText) || 0;
                    }
                    const schoolSpan = row.querySelector('span.vertical-middle');
                    const schoolName = schoolSpan ? schoolSpan.textContent.trim() : (SCHOOL_NAMES[info.iSchool] || '未知');
                    const detailUrl = link.href || '';
                    const tds = row.querySelectorAll('td');
                    let serverName = '';
                    if (tds.length >= 2) {
                        const serverTd = tds[tds.length - 2];
                        const childNodes = serverTd.childNodes;
                        for (let i = 0; i < childNodes.length; i++) {
                            const node = childNodes[i];
                            if (node.nodeType === Node.TEXT_NODE) {
                                const text = node.textContent.trim();
                                if (text && !text.includes('限时服务器')) { serverName = text; break; }
                            } else if (node.tagName === 'BR') { break; }
                        }
                    }
                    // 字段顺序以官方 RoleInfoParser 为准（详情页也是用它渲染的）：
                    // iExptSki1/2/3/4 = 攻击/防御/法术/抗法修炼，
                    // iBeastSki1/2/3/4 = 攻击/防御/法术/抗法控制力。
                    // 之前把 2、3 写反了，防御和法术的价目表不同（攻修是防修的 1.5 倍），
                    // 只要这两项等级不相等，批量就会和详情页/单算窗口算出不同的总值。
                    const gjxl = info.iExptSki1 || 0;
                    const gjxlUpper = info.iMaxExpt1 || 0;
                    const fyxl = info.iExptSki2 || 0;
                    const fyxlUpper = info.iMaxExpt2 || 0;
                    const fsxl = info.iExptSki3 || 0;
                    const fsxlUpper = info.iMaxExpt3 || 0;
                    const kfxl = info.iExptSki4 || 0;
                    const kfxlUpper = info.iMaxExpt4 || 0;
                    // 列表页无法读取乾元丹信息，固定为0（点开详情页后再补）
                    const qyd = 0;
                    const gjkzl = info.iBeastSki1 || 0;
                    const fykzl = info.iBeastSki2 || 0;
                    const fskzl = info.iBeastSki3 || 0;
                    const kfkzl = info.iBeastSki4 || 0;
                    const allSkills = info.all_skills || {};
                    const lifeSkills = {};
                    const schoolSkillLevels = [];
                    for (const [id, level] of Object.entries(allSkills)) {
                        if (LIFE_SKILL_IDS.has(id)) {
                            lifeSkills[LIFE_SKILL_MAP[id]] = level;
                        } else if (SCHOOL_SKILL_IDS.has(id)) {
                            schoolSkillLevels.push(level);
                        }
                    }
                    // 详情页在师门技能超过 7 个时只显示“师门技能信息有误”、不渲染列表，
                    // 单算窗口此时读不到师门技能（按 0 计），这里保持一致。
                    const schoolSkills = schoolSkillLevels.length > 7
                        ? []
                        : schoolSkillLevels.map(upperLimit);
                    while (schoolSkills.length < 7) schoolSkills.push(0);
                    results.push({
                        ordersn, name: info.cName || '', level: info.iGrade || 0,
                        school: schoolName, schoolCode: info.iSchool || 0,
                        server: serverName,
                        price, detailUrl, qyd,
                        gjxl, gjxlUpper, fsxl, fsxlUpper, fyxl, fyxlUpper, kfxl, kfxlUpper,
                        gjkzl, fskzl, fykzl, kfkzl,
                        skill_0: schoolSkills[0], skill_1: schoolSkills[1],
                        skill_2: schoolSkills[2], skill_3: schoolSkills[3],
                        skill_4: schoolSkills[4], skill_5: schoolSkills[5],
                        skill_6: schoolSkills[6],
                        qs: lifeSkills.qs || 0, mx: lifeSkills.mx || 0,
                        cWeapon: lifeSkills.cWeapon || 0, cook: lifeSkills.cook || 0,
                        zy: lifeSkills.zy || 0, ys: lifeSkills.ys || 0,
                        js: lifeSkills.js || 0, qj: lifeSkills.qj || 0,
                        strong: lifeSkills.strong || 0, speed: lifeSkills.speed || 0
                    });
                } catch (e) {
                    console.warn('解析角色数据失败:', e);
                }
            });
            return results;
        }

        // 主流程：查找 tab → 提取当前页数据
        chrome.tabs.query({url: "*://xyq.cbg.163.com/*"}, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                chrome.runtime.sendMessage({
                    action: "batchUpdateData",
                    error: "未找到藏宝阁页面，请先打开藏宝阁列表页"
                });
                return;
            }
            const tab = pickBatchTab(tabs, false);
            const tabId = tab.id;

            try {
                // 滚动到底部触发懒加载，等待数据加载完成
                await execScript(tabId, {world: "MAIN", function: scrollToBottom});
                const dataLoaded = await execScript(tabId, {world: "MAIN", function: waitForDataLoad});
                if (!dataLoaded) {
                    // 如果等待超时，再额外等待一小段时间作为兜底
                    await delay(1000);
                }

                const results = await execScript(tabId, {function: extractPageData});

                if (!results || results.length === 0) {
                    chrome.runtime.sendMessage({
                        action: "batchUpdateData",
                        error: "未找到角色数据"
                    });
                } else {
                    chrome.runtime.sendMessage({
                        action: "batchUpdateData",
                        results: results
                    });
                }
            } catch (e) {
                chrome.runtime.sendMessage({
                    action: "batchUpdateData",
                    error: "提取失败: " + e.message
                });
            }
        });
    }

    // 批量计算：从已打开的角色详情页读取乾元丹，并检测高价值道具/召唤兽
    if (request.action === "fetchQydFromDetail" && request.detailUrl) {
        const detailUrl = request.detailUrl;
        const ordersn = request.ordersn || '';

        // 读完详情页后继续检测高价值道具/召唤兽
        function finishWithHighValue(tabId) {
            injectHighValueDetect(tabId).then((hv) => {
                chrome.runtime.sendMessage(Object.assign({
                    action: "highValueFetched",
                    ordersn: ordersn,
                    detailUrl: detailUrl
                }, hv));
            });
        }

        // 列表页能拿到的数据（修炼、师门、生活技能）已经和详情页一致，
        // 这里只补列表页没有的乾元丹/机缘。刚打开的新标签页可能还没渲染完，失败时重试。
        function readFullDetail(tabId, attempt) {
            chrome.scripting.executeScript({
                target: {tabId: tabId},
                function: pcExtractDetailData
            }, (results) => {
                const data = (!chrome.runtime.lastError && results && results[0])
                    ? results[0].result : null;
                if (data && !data.__error) {
                    chrome.runtime.sendMessage({
                        action: "qydFetched",
                        detailUrl: detailUrl,
                        ordersn: ordersn,
                        qyd: data.qyd !== undefined ? data.qyd : null,
                        jyCur: data.jyCur !== undefined ? data.jyCur : null,
                        jyMax: data.jyMax !== undefined ? data.jyMax : null
                    });
                    finishWithHighValue(tabId);
                } else if (attempt < 2) {
                    setTimeout(() => readFullDetail(tabId, attempt + 1), 1500);
                } else {
                    finishWithHighValue(tabId);
                }
            });
        }

        // 等待详情页加载完成
        setTimeout(() => {
            chrome.tabs.query({url: detailUrl}, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    chrome.runtime.sendMessage({
                        action: "highValueFetched",
                        ordersn: ordersn,
                        detailUrl: detailUrl,
                        hvDone: false,
                        hvHigh: false,
                        hvError: '未找到角色详情标签页'
                    });
                    return;
                }
                readFullDetail(tabs[0].id, 0);
            });
        }, 3000);
    }

    // 批量检测高价值道具/召唤兽（逐条打开详情页，在后台标签页中进行）
    if (request.action === "batchHighValueScan" && Array.isArray(request.items) && request.items.length > 0) {
        runHighValueScan(request.items);
    }

    // 停止高价值检测
    if (request.action === "stopHighValueScan") {
        isHighValueScanStopped = true;
    }

    // ========== 单个计算：口袋版角色详情页 ==========
    if (request.action === "fetchPocketData") {
        getTargetTab(request, (tab, error) => {
            if (!tab) {
                sendResponse({ok: false, error: error || '未找到目标标签页'});
                return;
            }
            chrome.scripting.executeScript({
                target: {tabId: tab.id},
                function: pocketExtractDetailData
            }, (results) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ok: false, error: '脚本注入失败: ' + chrome.runtime.lastError.message});
                    return;
                }
                const data = results && results[0] ? results[0].result : null;
                if (!data) {
                    sendResponse({ok: false, error: '页面未返回数据'});
                } else if (data.__error) {
                    sendResponse({ok: false, error: data.__error, url: tab.url});
                } else {
                    sendResponse({ok: true, data: data, url: tab.url});
                }
            });
        });
        return true;
    }

    // ========== 口袋版：批量计算数据抓取（当前页） ==========
    if (request.action === "batchFetchPocketData") {
        function execScript(tabId, opts) {
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript(Object.assign({target: {tabId}}, opts), (results) => {
                    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                    if (!results || !results[0]) return reject(new Error("脚本未返回结果"));
                    resolve(results[0].result);
                });
            });
        }

        function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

        // 口袋版批量数据抓取：点击每个列表项进入详情页提取数据
        async function extractPocketBatchWithDetail(tabId) {
            // 1. 先获取列表中所有角色的基本信息（排除推荐角色）
            const listItems = await execScript(tabId, {function: () => {
                const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                const result = [];
                items.forEach((item, domIndex) => {
                    // 排除推荐区域（root_j7DZQ）中的角色
                    if (item.closest('.root_j7DZQ')) return;
                    const name = item.querySelector('.name')?.textContent?.trim() || '';
                    const levelText = item.querySelector('.level')?.textContent?.trim() || '';
                    const priceText = item.querySelector('.price')?.textContent?.trim() || '';
                    const server = item.querySelector('.server')?.textContent?.trim() || '';
                    const attr = item.querySelector('.attr')?.textContent?.trim() || '';
                    result.push({ domIndex, name, levelText, priceText, server, attr });
                });
                return result;
            }});

            if (!listItems || listItems.length === 0) {
                return [];
            }

            const results = [];

            // 2. 逐个点击进入详情页提取数据
            for (let i = 0; i < listItems.length; i++) {
                const item = listItems[i];

                // 发送进度更新
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    currentPage: i + 1,
                    totalPages: listItems.length,
                    status: "extracting"
                });

                // 点击列表项进入详情页（使用domIndex定位到原始DOM位置）
                const clickResult = await execScript(tabId, {function: (idx) => {
                    const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                    if (!items || items.length === 0) return false;
                    const item = items[idx];
                    if (!item) return false;
                    item.click();
                    return true;
                }, args: [item.domIndex]});

                if (!clickResult) continue;

                // 等待详情页加载
                await delay(2000);

                // 检测详情页是否加载完成
                const detailLoaded = await execScript(tabId, {function: () => {
                    // 检测详情页特征元素
                    return document.querySelector('.page-role-detail') !== null
                        || document.querySelector('.product-content') !== null
                        || document.body.innerText.includes('攻击修炼');
                }});

                if (!detailLoaded) {
                    // 再等一会儿
                    await delay(1500);
                }

                // 从详情页提取数据和URL
                const detailData = await execScript(tabId, {function: async () => {
                    const data = {
                        price: 0,
                        qyd: 0, jyCur: 0, jyMax: 0,
                        gjxl: 0, gjxlUpper: 0, fsxl: 0, fsxlUpper: 0,
                        fyxl: 0, fyxlUpper: 0, kfxl: 0, kfxlUpper: 0,
                        gjkzl: 0, fskzl: 0, fykzl: 0, kfkzl: 0,
                        skill_0: 0, skill_1: 0, skill_2: 0, skill_3: 0,
                        skill_4: 0, skill_5: 0, skill_6: 0,
                        qs: 0, mx: 0, cWeapon: 0, cook: 0,
                        zy: 0, ys: 0, js: 0, qj: 0, strong: 0, speed: 0,
                        detailUrl: window.location.href
                    };

                    const delay = ms => new Promise(r => setTimeout(r, ms));

                    // 从详情页提取价格
                    const priceEl = document.querySelector('.price');
                    if (priceEl) {
                        data.price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, '')) || 0;
                    }

                    // 从当前页面提取基础数据
                    const bodyText = document.body.innerText;

                    // 找到所有tab
                    const tabItems = document.querySelectorAll('.hair-tab .tabs .item');
                    let xiulianTab = null;
                    let skillTab = null;
                    tabItems.forEach(tab => {
                        const text = tab.textContent.trim();
                        if (text.includes('人物') || text.includes('修炼')) xiulianTab = tab;
                        if (text === '技能') skillTab = tab;
                    });

                    // 点击"人物/修炼"tab并读取修炼数据和乾元丹、机缘
                    if (xiulianTab) {
                        xiulianTab.click();
                        // 等待tab切换和内容加载（最多等待3秒）
                        for (let i = 0; i < 30; i++) {
                            await delay(100);
                            const currentText = document.body.innerText;
                            if (currentText.includes('攻击修炼') || currentText.includes('防御修炼')) {
                                break;
                            }
                        }
                        await delay(500);

                        const xiulianText = document.body.innerText;

                        // 乾元丹数量（在"人物/修炼"tab中）
                        const qydMatch = xiulianText.match(/新版乾元丹数量[：:]\s*(\d+)/);
                        if (qydMatch) data.qyd = parseInt(qydMatch[1]) || 0;

                        // 月饼粽子机缘（在"人物/修炼"tab中）
                        const jyMatch = xiulianText.match(/月饼粽子机缘[：:]\s*(\d+)\s*\/\s*(\d+)/);
                        if (jyMatch) {
                            data.jyCur = parseInt(jyMatch[1]) || 0;
                            data.jyMax = parseInt(jyMatch[2]) || 0;
                        }

                        // 人物修炼
                        const gjxlMatch = xiulianText.match(/攻击修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (gjxlMatch) { data.gjxl = parseInt(gjxlMatch[1]) || 0; data.gjxlUpper = parseInt(gjxlMatch[2]) || 0; }
                        const fyxlMatch = xiulianText.match(/防御修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (fyxlMatch) { data.fyxl = parseInt(fyxlMatch[1]) || 0; data.fyxlUpper = parseInt(fyxlMatch[2]) || 0; }
                        const fsxlMatch = xiulianText.match(/法术修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (fsxlMatch) { data.fsxl = parseInt(fsxlMatch[1]) || 0; data.fsxlUpper = parseInt(fsxlMatch[2]) || 0; }
                        const kfxlMatch = xiulianText.match(/抗法修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (kfxlMatch) { data.kfxl = parseInt(kfxlMatch[1]) || 0; data.kfxlUpper = parseInt(kfxlMatch[2]) || 0; }
                        // 宠物修炼
                        const gjkzlMatch = xiulianText.match(/攻击控制力[：:]\s*(\d+)/);
                        if (gjkzlMatch) data.gjkzl = parseInt(gjkzlMatch[1]) || 0;
                        const fykzlMatch = xiulianText.match(/防御控制力[：:]\s*(\d+)/);
                        if (fykzlMatch) data.fykzl = parseInt(fykzlMatch[1]) || 0;
                        const fskzlMatch = xiulianText.match(/法术控制力[：:]\s*(\d+)/);
                        if (fskzlMatch) data.fskzl = parseInt(fskzlMatch[1]) || 0;
                        const kfkzlMatch = xiulianText.match(/抗法控制力[：:]\s*(\d+)/);
                        if (kfkzlMatch) data.kfkzl = parseInt(kfkzlMatch[1]) || 0;
                    }

                    // 点击"技能"tab并读取师门技能和生活技能
                    if (skillTab) {
                        skillTab.click();
                        // 等待tab切换和内容加载（最多等待3秒）
                        for (let i = 0; i < 30; i++) {
                            await delay(100);
                            const currentText = document.body.innerText;
                            if (currentText.includes('师门技能') || currentText.includes('强身术') || currentText.includes('冥想')) {
                                break;
                            }
                        }
                        await delay(500);

                        const skillText = document.body.innerText;
                        // 师门技能
                        const skillPattern = /师门技能[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)/;
                        const skillMatch = skillText.match(skillPattern);
                        if (skillMatch) {
                            for (let j = 0; j < 7; j++) data['skill_' + j] = Math.min(parseInt(skillMatch[j + 1]) || 0, 180);
                        }
                        // 生活技能（支持多种分隔符格式）
                        const lifeSkillMap = {
                            qs: /强身(?:术)?[：:\s]\s*(\d+)/, mx: /冥想[：:\s]\s*(\d+)/,
                            cWeapon: /暗器(?:技巧)?[：:\s]\s*(\d+)/, cook: /烹饪(?:技巧)?[：:\s]\s*(\d+)/,
                            zy: /中药(?:医理)?[：:\s]\s*(\d+)/, ys: /养生(?:之道)?[：:\s]\s*(\d+)/,
                            js: /健身(?:术)?[：:\s]\s*(\d+)/, qj: /巧匠(?:之术)?[：:\s]\s*(\d+)/,
                            strong: /强壮[：:\s]\s*(\d+)/, speed: /神速[：:\s]\s*(\d+)/
                        };
                        for (const [key, pattern] of Object.entries(lifeSkillMap)) {
                            const match = skillText.match(pattern);
                            if (match) data[key] = parseInt(match[1]) || 0;
                        }
                    }

                    return data;
                }});

                // 返回列表页
                await execScript(tabId, {function: () => {
                    // 尝试点击返回按钮
                    const backBtn = document.querySelector('.iff-icon-back, .back, [class*="back"]');
                    if (backBtn) {
                        backBtn.click();
                    } else {
                        history.back();
                    }
                }});

                // 等待列表页加载
                await delay(2000);

                // 检测列表页是否加载完成
                const listLoaded = await execScript(tabId, {function: () => {
                    return document.querySelectorAll('.list-item-link.product-item.js_product_item').length > 0;
                }});

                if (!listLoaded) {
                    await delay(1500);
                }

                // 返回列表页后，滚动到当前处理的角色位置
                await execScript(tabId, {function: (idx) => {
                    const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                    if (!items || items.length === 0) return;
                    const item = items[idx];
                    if (!item) return;
                    item.scrollIntoView({block: 'center', behavior: 'smooth'});
                }, args: [item.domIndex]});

                // 组合数据
                const levelMatch = item.levelText.match(/(\d+)/);
                const level = levelMatch ? parseInt(levelMatch[1]) : 0;
                const listPrice = parseFloat(item.priceText.replace(/[^\d.]/g, '')) || 0;

                // 门派从 .name 元素读取（如"神木林"）
                const school = item.name || '';

                // 优先使用详情页价格，如果为0则使用列表页价格
                const price = (detailData && detailData.price > 0) ? detailData.price : listPrice;

                const charData = {
                    ordersn: `pocket_${i}_${Date.now()}`,
                    name: item.name,
                    level,
                    school,
                    schoolCode: 0,
                    server: item.server,
                    price,
                    detailUrl: (detailData && detailData.detailUrl) || '',
                    ...(detailData || {})
                };

                results.push(charData);

                // 每处理完一个角色就发送结果，实现实时显示
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    currentPage: i + 1,
                    totalPages: listItems.length,
                    results: [charData],
                    status: "pageDone"
                });
            }

            // 全部完成
            chrome.runtime.sendMessage({
                action: "autoBatchProgress",
                currentPage: listItems.length,
                totalPages: listItems.length,
                status: "done"
            });
        }

        chrome.tabs.query({url: "*://xyq-m.cbg.163.com/*", currentWindow: true}, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "未找到口袋版页面"
                });
                return;
            }
            const tab = pickBatchTab(tabs, true);
            const tabId = tab.id;

            try {
                await extractPocketBatchWithDetail(tabId);
            } catch (e) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "提取失败: " + e.message
                });
            }
        });
    }

    // ========== 口袋版：自动翻页批量计算 ==========
    if (request.action === "autoBatchPocketFetch") {
        const totalItems = request.totalItems || request.totalPages || 20; // 口袋版用数量而非页数

        function execScript(tabId, opts) {
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript(Object.assign({target: {tabId}}, opts), (results) => {
                    if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                    if (!results || !results[0]) return reject(new Error("脚本未返回结果"));
                    resolve(results[0].result);
                });
            });
        }

        function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

        // 从详情页提取数据的通用函数
        async function extractDetailDataFromPage() {
            const data = {
                price: 0,
                qyd: 0, jyCur: 0, jyMax: 0,
                gjxl: 0, gjxlUpper: 0, fsxl: 0, fsxlUpper: 0,
                fyxl: 0, fyxlUpper: 0, kfxl: 0, kfxlUpper: 0,
                gjkzl: 0, fskzl: 0, fykzl: 0, kfkzl: 0,
                skill_0: 0, skill_1: 0, skill_2: 0, skill_3: 0,
                skill_4: 0, skill_5: 0, skill_6: 0,
                qs: 0, mx: 0, cWeapon: 0, cook: 0,
                zy: 0, ys: 0, js: 0, qj: 0, strong: 0, speed: 0,
                detailUrl: window.location.href
            };

            const delay = ms => new Promise(r => setTimeout(r, ms));

            // 从详情页提取价格
            const priceEl = document.querySelector('.price_OskaR');
            if (priceEl) {
                data.price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, '')) || 0;
            }

            // 找到所有tab
            const tabItems = document.querySelectorAll('.hair-tab .tabs .item');
            let xiulianTab = null;
            let skillTab = null;
            tabItems.forEach(tab => {
                const text = tab.textContent.trim();
                if (text.includes('人物') || text.includes('修炼')) xiulianTab = tab;
                if (text === '技能') skillTab = tab;
            });

            // 点击"人物/修炼"tab并读取修炼数据和乾元丹、机缘
            if (xiulianTab) {
                xiulianTab.click();
                // 等待tab切换和内容加载（最多等待3秒）
                for (let i = 0; i < 30; i++) {
                    await delay(100);
                    const currentText = document.body.innerText;
                    if (currentText.includes('攻击修炼') || currentText.includes('防御修炼')) {
                        break;
                    }
                }
                await delay(500);

                const xiulianText = document.body.innerText;

                // 乾元丹数量（在"人物/修炼"tab中）
                const qydMatch = xiulianText.match(/新版乾元丹数量[：:]\s*(\d+)/);
                if (qydMatch) data.qyd = parseInt(qydMatch[1]) || 0;

                // 月饼粽子机缘（在"人物/修炼"tab中）
                const jyMatch = xiulianText.match(/月饼粽子机缘[：:]\s*(\d+)\s*\/\s*(\d+)/);
                if (jyMatch) {
                    data.jyCur = parseInt(jyMatch[1]) || 0;
                    data.jyMax = parseInt(jyMatch[2]) || 0;
                }
                // 人物修炼
                const gjxlMatch = xiulianText.match(/攻击修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                if (gjxlMatch) { data.gjxl = parseInt(gjxlMatch[1]) || 0; data.gjxlUpper = parseInt(gjxlMatch[2]) || 0; }
                const fyxlMatch = xiulianText.match(/防御修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                if (fyxlMatch) { data.fyxl = parseInt(fyxlMatch[1]) || 0; data.fyxlUpper = parseInt(fyxlMatch[2]) || 0; }
                const fsxlMatch = xiulianText.match(/法术修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                if (fsxlMatch) { data.fsxl = parseInt(fsxlMatch[1]) || 0; data.fsxlUpper = parseInt(fsxlMatch[2]) || 0; }
                const kfxlMatch = xiulianText.match(/抗法修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                if (kfxlMatch) { data.kfxl = parseInt(kfxlMatch[1]) || 0; data.kfxlUpper = parseInt(kfxlMatch[2]) || 0; }
                // 宠物修炼
                const gjkzlMatch = xiulianText.match(/攻击控制力[：:]\s*(\d+)/);
                if (gjkzlMatch) data.gjkzl = parseInt(gjkzlMatch[1]) || 0;
                const fykzlMatch = xiulianText.match(/防御控制力[：:]\s*(\d+)/);
                if (fykzlMatch) data.fykzl = parseInt(fykzlMatch[1]) || 0;
                const fskzlMatch = xiulianText.match(/法术控制力[：:]\s*(\d+)/);
                if (fskzlMatch) data.fskzl = parseInt(fskzlMatch[1]) || 0;
                const kfkzlMatch = xiulianText.match(/抗法控制力[：:]\s*(\d+)/);
                if (kfkzlMatch) data.kfkzl = parseInt(kfkzlMatch[1]) || 0;
            }

            // 点击"技能"tab并读取师门技能和生活技能
            if (skillTab) {
                skillTab.click();
                // 等待tab切换和内容加载（最多等待3秒）
                for (let i = 0; i < 30; i++) {
                    await delay(100);
                    const currentText = document.body.innerText;
                    if (currentText.includes('师门技能') || currentText.includes('强身术') || currentText.includes('冥想')) {
                        break;
                    }
                }
                await delay(500);

                const skillText = document.body.innerText;
                // 师门技能
                const skillPattern = /师门技能[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)/;
                const skillMatch = skillText.match(skillPattern);
                if (skillMatch) {
                    for (let j = 0; j < 7; j++) data['skill_' + j] = Math.min(parseInt(skillMatch[j + 1]) || 0, 180);
                }
                // 生活技能（支持多种分隔符格式）
                const lifeSkillMap = {
                    qs: /强身(?:术)?[：:\s]\s*(\d+)/, mx: /冥想[：:\s]\s*(\d+)/,
                    cWeapon: /暗器(?:技巧)?[：:\s]\s*(\d+)/, cook: /烹饪(?:技巧)?[：:\s]\s*(\d+)/,
                    zy: /中药(?:医理)?[：:\s]\s*(\d+)/, ys: /养生(?:之道)?[：:\s]\s*(\d+)/,
                    js: /健身(?:术)?[：:\s]\s*(\d+)/, qj: /巧匠(?:之术)?[：:\s]\s*(\d+)/,
                    strong: /强壮[：:\s]\s*(\d+)/, speed: /神速[：:\s]\s*(\d+)/
                };
                for (const [key, pattern] of Object.entries(lifeSkillMap)) {
                    const match = skillText.match(pattern);
                    if (match) data[key] = parseInt(match[1]) || 0;
                }
            }

            return data;
        }

        chrome.tabs.query({url: "*://xyq-m.cbg.163.com/*", currentWindow: true}, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "未找到口袋版页面"
                });
                return;
            }
            const tab = pickBatchTab(tabs, true);
            const tabId = tab.id;

            try {
                // 口袋版使用无限滚动，需要滚动加载更多
                // 先获取当前可见列表项数量
                let processedCount = 0;
                let allResults = [];
                let consecutiveFailures = 0;
                const MAX_FAILURES = 3;

                // 重置状态
                isBatchPaused = false;
                isBatchStopped = false;

                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    currentPage: 0,
                    totalPages: totalItems,
                    status: "start"
                });

                while (processedCount < totalItems && consecutiveFailures < MAX_FAILURES) {
                    // 检查是否暂停或停止
                    const shouldContinue = await checkPauseState();
                    if (!shouldContinue) {
                        chrome.runtime.sendMessage({
                            action: "autoBatchProgress",
                            currentPage: processedCount,
                            totalPages: totalItems,
                            status: "end",
                            reason: "用户停止"
                        });
                        return;
                    }
                    // 获取当前列表项（排除推荐角色）
                    const listItems = await execScript(tabId, {function: () => {
                        const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                        const result = [];
                        items.forEach((item, domIndex) => {
                            if (item.closest('.root_j7DZQ')) return;
                            const name = item.querySelector('.name')?.textContent?.trim() || '';
                            const levelText = item.querySelector('.level')?.textContent?.trim() || '';
                            const priceText = item.querySelector('.price')?.textContent?.trim() || '';
                            const server = item.querySelector('.server')?.textContent?.trim() || '';
                            const attr = item.querySelector('.attr')?.textContent?.trim() || '';
                            result.push({ domIndex, name, levelText, priceText, server, attr });
                        });
                        return result;
                    }});

                    if (!listItems || listItems.length === 0) {
                        consecutiveFailures++;
                        // 滚动加载更多
                        await execScript(tabId, {function: () => {
                            window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
                        }});
                        await delay(2000);
                        continue;
                    }

                    // 找到还未处理的项
                    const startIndex = allResults.length;
                    if (startIndex >= listItems.length) {
                        // 需要滚动加载更多
                        await execScript(tabId, {function: () => {
                            window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
                        }});
                        await delay(2000);

                        // 检查是否有新数据加载（排除推荐角色）
                        const newCount = await execScript(tabId, {function: () => {
                            const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                            return Array.from(items).filter(item => !item.closest('.root_j7DZQ')).length;
                        }});
                        if (newCount <= listItems.length) {
                            consecutiveFailures++;
                        }
                        continue;
                    }

                    consecutiveFailures = 0;

                    // 处理当前批次（最多处理剩余需要的数量）
                    const batchSize = Math.min(listItems.length - startIndex, totalItems - processedCount);

                    for (let i = 0; i < batchSize; i++) {
                        // 检查是否暂停或停止
                        const shouldContinue = await checkPauseState();
                        if (!shouldContinue) {
                            chrome.runtime.sendMessage({
                                action: "autoBatchProgress",
                                currentPage: processedCount,
                                totalPages: totalItems,
                                status: "end",
                                reason: "用户停止"
                            });
                            return;
                        }

                        const itemIdx = startIndex + i;
                        const item = listItems[itemIdx];

                        chrome.runtime.sendMessage({
                            action: "autoBatchProgress",
                            currentPage: processedCount + 1,
                            totalPages: totalItems,
                            status: "extracting"
                        });

                        // 点击列表项进入详情页（使用domIndex定位到原始DOM位置）
                        const clickResult = await execScript(tabId, {function: (idx) => {
                            const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                            if (!items || items.length === 0) return false;
                            const item = items[idx];
                            if (!item) return false;
                            item.click();
                            return true;
                        }, args: [item.domIndex]});

                        if (!clickResult) {
                            processedCount++;
                            continue;
                        }

                        // 等待详情页加载
                        await delay(2000);

                        // 提取详情数据
                        const detailData = await execScript(tabId, {function: extractDetailDataFromPage});

                        // 组合数据
                        const levelMatch = item.levelText.match(/(\d+)/);
                        const level = levelMatch ? parseInt(levelMatch[1]) : 0;
                        const listPrice = parseFloat(item.priceText.replace(/[^\d.]/g, '')) || 0;

                        // 门派从 .name 元素读取（如"神木林"）
                        const school = item.name || '';

                        // 优先使用详情页价格，如果为0则使用列表页价格
                        const price = (detailData && detailData.price > 0) ? detailData.price : listPrice;

                        allResults.push({
                            ordersn: `pocket_${itemIdx}_${Date.now()}`,
                            name: item.name,
                            level,
                            school,
                            schoolCode: 0,
                            server: item.server,
                            price,
                            detailUrl: (detailData && detailData.detailUrl) || '',
                            ...(detailData || {})
                        });

                        processedCount++;

                        // 先发送计算结果到批量结果表格显示
                        chrome.runtime.sendMessage({
                            action: "autoBatchProgress",
                            currentPage: processedCount,
                            totalPages: totalItems,
                            results: [allResults[allResults.length - 1]],
                            status: "pageDone"
                        });

                        // 返回列表页
                        await execScript(tabId, {function: () => {
                            const backBtn = document.querySelector('.iff-icon-back, .back, [class*="back"]');
                            if (backBtn) {
                                backBtn.click();
                            } else {
                                history.back();
                            }
                        }});

                        await delay(2000);

                        // 返回列表页后，滚动到当前处理的角色位置
                        await execScript(tabId, {function: (idx) => {
                            const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                            if (!items || items.length === 0) return;
                            const item = items[idx];
                            if (!item) return;
                            item.scrollIntoView({block: 'center', behavior: 'smooth'});
                        }, args: [item.domIndex]});
                    }
                }

                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    currentPage: processedCount,
                    totalPages: totalItems,
                    status: "done"
                });
            } catch (e) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "口袋版自动计算失败: " + e.message
                });
            }
        });
    }
});



