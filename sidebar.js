let globalCostData = null;
let currentMode = 'pc'; // 'pc' | 'pocket'，由 index.js 通过 chrome.storage.local 设置
// 独立窗口模式：batch.html 通过 chrome.windows.create 打开 sidebar.html?standalone=1
const isStandalone = new URLSearchParams(location.search).get('standalone') === '1';

async function loadJSON() {
    try {
        const url = chrome.runtime.getURL('data/data.json');
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        globalCostData = await response.json();
        console.log("读取文件数据：", globalCostData)
    } catch (error) {
        console.error('Failed to load JSON:', error);
    }
}


document.addEventListener('DOMContentLoaded', async function () {

    await loadJSON();

    const find_data = document.getElementById('find_data');
    const xiulian_data = document.getElementById('xiulian_data');
    const bbxiu_data = document.getElementById('bbxiu_data');
    const school_skill_data = document.getElementById('school_skill_data');
    const life_skill_data = document.getElementById('life_skill_data');
    const calculate = document.getElementById('calculate');
    const calculate_data = document.getElementById('calculate_data');
    const back_btn = document.getElementById('back_btn');
    const targetTabRow = document.getElementById('target_tab_row');
    const targetTabSelect = document.getElementById('target_tab');
    const refreshTargetBtn = document.getElementById('refresh_target_btn');

    // 独立窗口由批量页打开时，沿用批量页的金价/修炼果价/比例，避免两边结果不可比
    if (isStandalone) {
        const params = new URLSearchParams(location.search);
        ['yxbPrice_value', 'guoziPrice_value', 'xiulian_ratio', 'bbxiu_ratio',
            'school_skill_ratio', 'life_skill_data_ratio'].forEach(function (id) {
            const v = params.get(id);
            const el = document.getElementById(id);
            if (v !== null && el) el.value = v;
        });
    }

    let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);
    // 当前角色的等级（由详情页读取，决定修炼有效上限）
    let characterLevel = 0;

    // 详情页 URL 判断（与 background.js 的 isDetailUrl 保持一致）
    function isDetailUrl(url, isPocket) {
        try {
            const u = new URL(url || '');
            if (isPocket) return u.pathname.indexOf('/cgi/mweb/equip/') !== -1;
            return u.pathname === '/equip' || u.pathname.indexOf('/equip') === 0;
        } catch (e) {
            return false;
        }
    }

    // 从 URL 里取出可辨识的短标识（eid / 订单号末 8 位），用于读不到页面内容时兜底
    function shortTabId(url) {
        try {
            const u = new URL(url || '');
            const raw = u.searchParams.get('eid') || u.pathname.split('/').filter(Boolean).pop() || '';
            const tail = raw.slice(-8);
            return tail ? '#' + tail : '';
        } catch (e) {
            return '';
        }
    }

    // 读取标签页的“身份信息”：详情页读服务器/门派/等级/价格，列表页读页码
    // 注入的函数必须自包含，只能通过 args 拿参数
    function readTabInfo(tab, isPocket) {
        return new Promise(function (resolve) {
            // 休眠（已丢弃）的标签页不去唤醒它，直接用 URL 兜底
            if (tab.discarded) {
                resolve(null);
                return;
            }
            chrome.scripting.executeScript({
                target: {tabId: tab.id},
                func: function (pocket) {
                    function clean(v) {
                        return (v || '').replace(/\s+/g, ' ').trim();
                    }

                    const info = {};
                    try {
                        if (pocket) {
                            const pi = document.querySelector('.pi-info');
                            if (pi) {
                                const serverEl = pi.querySelector('.server');
                                info.server = clean(serverEl && serverEl.textContent);
                                const priceEl = pi.querySelector('.price');
                                const pm = clean(priceEl && priceEl.textContent).match(/([\d.]+)/);
                                if (pm) info.price = pm[1];
                                const lvEl = pi.querySelector('.level');
                                const lm = clean(lvEl && lvEl.textContent).match(/(\d+)/);
                                if (lm) info.level = lm[1];
                            }
                            if (!info.server) {
                                const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                                if (items.length) info.count = items.length;
                            }
                        } else {
                            const names = document.querySelector('.infoList li.names');
                            if (names) {
                                const t = clean(names.textContent);
                                const ms = t.match(/服务器[：:]\s*(\S+)/);
                                const mi = t.match(/\bID[：:]\s*(\d+)/);
                                const ml = t.match(/等级[：:]\s*(\d+)/);
                                if (ms) info.server = ms[1];
                                if (mi) info.roleId = mi[1];
                                if (ml) info.level = ml[1];
                            }
                            const box = document.getElementById('role_info_box');
                            if (box && box.dataset && box.dataset.school) info.school = box.dataset.school;
                            const priceEl = document.querySelector('.infoList .price');
                            if (priceEl) {
                                const pm = clean(priceEl.textContent).match(/[￥¥]\s*([\d,]+(?:\.\d+)?)/);
                                if (pm) info.price = pm[1].replace(/,/g, '');
                            }
                            if (!info.server) {
                                const pagerEl = document.querySelector('.pager_bar') || document.getElementById('pager_bar');
                                const pt = clean(pagerEl && pagerEl.textContent);
                                const mp = pt.match(/第\s*(\d+)\s*页/);
                                if (mp) info.page = mp[1];
                                const mt = pt.match(/共\s*(\d+)\s*页/);
                                if (mt) info.totalPages = mt[1];
                            }
                        }
                    } catch (e) {
                        info.error = String(e && e.message ? e.message : e);
                    }
                    return info;
                },
                args: [isPocket]
            }, function (results) {
                if (chrome.runtime.lastError || !results || !results[0]) {
                    resolve(null);
                } else {
                    resolve(results[0].result || null);
                }
            });
        });
    }

    // 组合下拉框里显示的文字，例如「【详情】广东4区--流溪河 · 龙宫 · 175级 · ¥22000」
    function composeTabLabel(tab, isPocket, info) {
        const detail = isDetailUrl(tab.url, isPocket) || !!(info && info.server);
        const parts = [];
        if (detail) {
            if (info && info.server) parts.push(info.server);
            if (info && info.school) parts.push(info.school);
            if (info && info.level) parts.push(info.level + '级');
            if (info && info.price) parts.push('¥' + info.price);
        } else {
            if (info && info.page) parts.push('第' + info.page + '页' + (info.totalPages ? '/共' + info.totalPages + '页' : ''));
            else if (info && info.count) parts.push(info.count + '个角色');
        }
        if (!parts.length) {
            const sid = shortTabId(tab.url);
            if (sid) parts.push(sid);
        }
        const prefix = detail ? '【详情】' : '【列表】';
        return prefix + (parts.length ? parts.join(' · ') : (detail ? '详情页' : '列表页'));
    }

    // 独立窗口：加载可选的藏宝阁标签页（详情页优先、最近访问优先）
    // preserveSelection=true 时尽量保留当前选中的标签页，否则默认选中最近访问的详情页
    // 直接在扩展页面内查询 tabs，不经过 service worker（避免 SW 未更新时收不到响应）
    let targetTabsSeq = 0;

    function loadTargetTabs(preserveSelection) {
        if (!targetTabSelect) return;
        const seq = ++targetTabsSeq;
        const isPocket = currentMode === 'pocket';
        const urls = isPocket ? ["*://xyq-m.cbg.163.com/*"] : ["*://xyq.cbg.163.com/*"];
        const showError = function (msg) {
            targetTabSelect.innerHTML = '';
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = msg;
            targetTabSelect.appendChild(opt);
        };

        chrome.tabs.query({url: urls}, function (tabs) {
            if (chrome.runtime.lastError) {
                showError('读取标签页失败: ' + chrome.runtime.lastError.message);
                return;
            }
            const list = (tabs || []).map(function (tab) {
                return {
                    id: tab.id,
                    url: tab.url || '',
                    lastAccessed: tab.lastAccessed || 0,
                    isDetail: isDetailUrl(tab.url, isPocket)
                };
            });
            // 详情页优先，同组内按最近访问时间倒序
            list.sort(function (a, b) {
                if (a.isDetail !== b.isDetail) return a.isDetail ? -1 : 1;
                return b.lastAccessed - a.lastAccessed;
            });

            const prev = preserveSelection ? parseInt(targetTabSelect.value) : NaN;
            if (list.length === 0) {
                showError(isPocket ? '未找到口袋版标签页' : '未找到电脑版标签页');
                return;
            }

            // 先渲染一次基本标签，再异步补齐页面内容（服务器/门派/价格/页码）
            const render = function (labels) {
                if (seq !== targetTabsSeq) return; // 已有更新的一次刷新，丢弃旧结果
                targetTabSelect.innerHTML = '';
                list.forEach(function (t, i) {
                    const opt = document.createElement('option');
                    opt.value = String(t.id);
                    let text = labels[i];
                    if (text.length > 60) text = text.slice(0, 60) + '…';
                    opt.textContent = text;
                    opt.title = t.url;
                    targetTabSelect.appendChild(opt);
                });
                // 保留时若该标签页已关闭，回退到第一个（最近访问的详情页）
                const keep = list.find(function (t) { return t.id === prev; });
                targetTabSelect.value = String((keep || list[0]).id);
            };

            Promise.all(list.map(function (t) {
                return readTabInfo(t, isPocket).catch(function () { return null; });
            })).then(function (infos) {
                render(list.map(function (t, i) {
                    return composeTabLabel(t, isPocket, infos[i]);
                }));
            }).catch(function () {
                render(list.map(function (t) {
                    return composeTabLabel(t, isPocket, null);
                }));
            });
        });
    }

    if (isStandalone) {
        if (targetTabRow) targetTabRow.style.display = '';
        back_btn.innerHTML = '<i class="fas fa-times"></i> 关闭窗口';
        find_data.innerHTML = '<i class="fas fa-search"></i> 读取并计算';
        if (refreshTargetBtn) refreshTargetBtn.addEventListener('click', function () {
            loadTargetTabs(true);
        });
        // 切到其他游戏标签页再切回来时，自动刷新并选中最近访问的详情页
        window.addEventListener('focus', function () {
            loadTargetTabs(false);
        });
    }

    // 从存储中读取模式
    chrome.storage.local.get('calcMode', function (result) {
        currentMode = result.calcMode || 'pc';
        const modeTag = document.getElementById('mode_tag');
        if (modeTag) {
            modeTag.textContent = currentMode === 'pocket' ? '口袋版' : '电脑版';
        }
        if (isStandalone) loadTargetTabs();
    });


    // 解析比例值：空值默认1，允许0（与 batch.js 的 parseRatio 保持一致）
    function parseRatio(val) {
        let n = parseFloat(val);
        return isNaN(n) ? 1 : n;
    }

    // 人物修炼的有效上限只有两档：145 级以下 21，145 级及以上 25。
    // 与 batch.js 的 effectiveXiuUpper 保持一致。
    function effectiveXiuUpper(charLevel) {
        const lv = parseInt(charLevel);
        if (!lv || lv <= 0) return 25; // 等级未知时不额外限制
        return lv >= 145 ? 25 : 21;
    }

    function setCost(element, item_id, type, level, ratio = 1, upper = 0) {

        if (!level) level = 0;
        // 上限超过该等级的有效值时，超出部分不计价
        upper = Math.min(parseInt(upper) || 0, effectiveXiuUpper(characterLevel));
        if (type === "bbxiu") {
            try {
                let size = globalCostData[type][level.toString()]["guozi_size"]
                const cost = parseFloat(size) * guoziPrice;
                let costId = item_id + "_cost"
                let ratioCostId = item_id + "_ratio_cost"
                element.querySelector(`#${costId}`).value = cost || 0;
                // 保留精确值，最后再统一取整，避免逐项取整与批量计算结果不一致
                element.querySelector(`#${ratioCostId}`).value = cost * ratio;
            } catch (err) {
                alert("等级[" + level + "]超过限制，请修正");
            }
        } else {
            try {
                let cost = globalCostData[type][level.toString()]["totalcost"]
                if (upper !== 0 && upper>20) {

                    let xiu_upper_times = globalCostData["xiulianshangxian"][upper.toString()]["times"]
                    if (type === "fangxiu") {
                        cost += xiu_upper_times * 2
                    } else {
                        cost += xiu_upper_times * 3
                    }
                }
                let costId = item_id + "_cost"
                let ratioCostId = item_id + "_ratio_cost"
                element.querySelector(`#${costId}`).value = cost || 0;
                // 保留精确值，最后再统一取整，避免逐项取整与批量计算结果不一致
                element.querySelector(`#${ratioCostId}`).value = cost * ratio;
            } catch (err) {
                alert("等级[" + level + "]超过限制，请修正");
            }
        }

    }


    function addItem(element, item_id, total_cost) {
        const checkbox = element.querySelector(`#${item_id}`).querySelector('.data-item .item-select')
        if (checkbox.checked) {
            let costId = item_id + "_cost"
            let ratioCostId = item_id + "_ratio_cost"
            total_cost.origin += parseFloat(element.querySelector(`#${costId}`).value)
            total_cost.discount += parseFloat(element.querySelector(`#${ratioCostId}`).value)
        }

    }


    function calculator() {
        let priceOnWeb = calculate_data.querySelector('#price_value').value
        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);
        if (!yxbPrice || !guoziPrice) {
            alert("先输入游戏币价格和修炼果价格");
        } else {
            let total_cost = {origin: 0, discount: 0};
            let level = 0;
            let item_id = "";
            let type = "qianyuandan";
            let ratio = 1;
            let upper = 0;

            ratio = parseRatio(document.getElementById('xiulian_ratio').value)

            item_id = "qyd";
            level = xiulian_data.querySelector(`#${item_id}` + '_value').value;
            setCost(xiulian_data, item_id, type, level, ratio);
            addItem(xiulian_data, item_id, total_cost);

            type = "gongxiu";
            item_id = "gjxl";
            level = xiulian_data.querySelector('#gjxl_value').value;
            upper = xiulian_data.querySelector('#gjxl_upper').value;
            setCost(xiulian_data, item_id, type, level, ratio, upper);
            addItem(xiulian_data, item_id, total_cost);


            item_id = "fsxl";
            level = xiulian_data.querySelector('#fsxl_value').value;
            upper = xiulian_data.querySelector('#fsxl_upper').value;
            setCost(xiulian_data, item_id, type, level, ratio, upper);
            addItem(xiulian_data, item_id, total_cost);


            type = "fangxiu";
            item_id = "fyxl";
            level = xiulian_data.querySelector('#fyxl_value').value;
            upper = xiulian_data.querySelector('#fyxl_upper').value;
            setCost(xiulian_data, item_id, type, level, ratio, upper);
            addItem(xiulian_data, item_id, total_cost);

            item_id = "kfxl";
            level = xiulian_data.querySelector('#kfxl_value').value;
            upper = xiulian_data.querySelector('#kfxl_upper').value;
            setCost(xiulian_data, item_id, type, level, ratio, upper);
            addItem(xiulian_data, item_id, total_cost);

            ratio = parseRatio(document.getElementById('bbxiu_ratio').value)
            type = "bbxiu";
            item_id = "gjkzl";
            level = bbxiu_data.querySelector('#gjkzl_value').value;
            setCost(bbxiu_data, item_id, type, level, ratio);
            addItem(bbxiu_data, item_id, total_cost);

            item_id = "fskzl";
            level = bbxiu_data.querySelector('#fskzl_value').value;
            setCost(bbxiu_data, item_id, type, level, ratio);
            addItem(bbxiu_data, item_id, total_cost);

            item_id = "fykzl";
            level = bbxiu_data.querySelector('#fykzl_value').value;
            setCost(bbxiu_data, item_id, type, level, ratio);
            addItem(bbxiu_data, item_id, total_cost);

            item_id = "kfkzl";
            level = bbxiu_data.querySelector('#kfkzl_value').value;
            setCost(bbxiu_data, item_id, type, level, ratio);
            addItem(bbxiu_data, item_id, total_cost);

            ratio = parseRatio(document.getElementById('school_skill_ratio').value)
            type = "school_skill";
            item_id = "skill_0";
            level = school_skill_data.querySelector('#skill_0_value').value;
            setCost(school_skill_data, item_id, type, level, ratio);
            addItem(school_skill_data, item_id, total_cost);

            item_id = "skill_1";
            level = school_skill_data.querySelector('#skill_1_value').value;
            setCost(school_skill_data, item_id, type, level, ratio);
            addItem(school_skill_data, item_id, total_cost);

            item_id = "skill_2";
            level = school_skill_data.querySelector('#skill_2_value').value;
            setCost(school_skill_data, item_id, type, level, ratio);
            addItem(school_skill_data, item_id, total_cost);

            item_id = "skill_3";
            level = school_skill_data.querySelector('#skill_3_value').value;
            setCost(school_skill_data, item_id, type, level, ratio);
            addItem(school_skill_data, item_id, total_cost);

            item_id = "skill_4";
            level = school_skill_data.querySelector('#skill_4_value').value;
            setCost(school_skill_data, item_id, type, level, ratio);
            addItem(school_skill_data, item_id, total_cost);

            item_id = "skill_5";
            level = school_skill_data.querySelector('#skill_5_value').value;
            setCost(school_skill_data, item_id, type, level, ratio);
            addItem(school_skill_data, item_id, total_cost);

            item_id = "skill_6";
            level = school_skill_data.querySelector('#skill_6_value').value;
            setCost(school_skill_data, item_id, type, level, ratio);
            addItem(school_skill_data, item_id, total_cost);


            ratio = parseRatio(document.getElementById('life_skill_data_ratio').value)
            type = "qiangzhuang";
            item_id = "speed";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            item_id = "strong";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            type = "life_skill";
            item_id = "qs";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            item_id = "mx";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            item_id = "cWeapon";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            item_id = "cook";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            item_id = "ys";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            item_id = "js";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);

            item_id = "qj";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);


            item_id = "zy";
            level = life_skill_data.querySelector(`#${item_id}` + '_value').value;
            setCost(life_skill_data, item_id, type, level, ratio);
            addItem(life_skill_data, item_id, total_cost);


            let priceByCal = (parseFloat(total_cost.origin) * yxbPrice).toFixed(0) || '0'
            let discountPriceByCal = (parseFloat(total_cost.discount) * yxbPrice).toFixed(0) || '0'

            // 机缘加成：若 (最大-当前) <= 3，加500RMB
            let jyCur = parseInt(xiulian_data.querySelector('#jyCur_value').value) || 0;
            let jyMax = parseInt(xiulian_data.querySelector('#jyMax_value').value) || 0;
            let jyCheckbox = xiulian_data.querySelector('#jy .item-select');
            if (jyCheckbox && jyCheckbox.checked && jyMax > 0 && jyMax - jyCur <= 3) {
                priceByCal = (parseFloat(priceByCal) + 500).toFixed(0);
                discountPriceByCal = (parseFloat(discountPriceByCal) + 500).toFixed(0);
            }

            calculate_data.querySelector('#totalCost_value').textContent = total_cost.origin || '0'
            calculate_data.querySelector('#totalCost_ratio_value').textContent = total_cost.discount ? total_cost.discount.toFixed(0) : '0'
            calculate_data.querySelector('#totalCost_rmb').textContent = priceByCal
            calculate_data.querySelector('#totalCost_ratio_rmb').textContent = discountPriceByCal

            if (parseFloat(priceOnWeb) > 0) {
                calculate_data.querySelector('#discount_value').textContent = (parseFloat(priceOnWeb) / priceByCal * 10).toFixed(2);
            } else {
                calculate_data.querySelector('#discount_value').textContent = "未知"
            }
        }
    }

    // 返回按钮（独立窗口中为关闭窗口）
    back_btn.addEventListener('click', function () {
        if (isStandalone) {
            window.close();
            return;
        }
        chrome.runtime.sendMessage({action: "switchPage", page: "index.html"});
    });

    // 把读取到的角色数据填入表单并计算
    function applyData(request) {
        //乾元丹
        console.log("接收到的数据：", request.data)
        // 角色等级决定修炼有效上限
        characterLevel = parseInt(request.data.level) || 0;
        let level = request.data.qyd || 0;
        let upper = 0;
        xiulian_data.querySelector('#qyd_value').value = level;

        //机缘
        xiulian_data.querySelector('#jyCur_value').value = request.data.jyCur || 0;
        xiulian_data.querySelector('#jyMax_value').value = request.data.jyMax || 0;

        //攻修
        level = request.data.gjxl || 0;
        xiulian_data.querySelector('#gjxl_value').value = level;
        upper = request.data.gjxlUpper || 0;
        xiulian_data.querySelector('#gjxl_upper').value = upper;

        //防修
        level = request.data.fyxl || 0;
        xiulian_data.querySelector('#fyxl_value').value = level;
        upper = request.data.fyxlUpper || 0;
        xiulian_data.querySelector('#fyxl_upper').value = upper;

        //法修
        level = request.data.fsxl || 0;
        xiulian_data.querySelector('#fsxl_value').value = level;
        upper = request.data.fsxlUpper || 0;
        xiulian_data.querySelector('#fsxl_upper').value = upper;

        //法抗
        level = request.data.kfxl || 0;
        xiulian_data.querySelector('#kfxl_value').value = level;
        upper = request.data.kfxlUpper || 0;
        xiulian_data.querySelector('#kfxl_upper').value = upper;

        //BB攻修
        level = request.data.gjkzl || 0;
        bbxiu_data.querySelector('#gjkzl_value').value = level;

        //BB防修
        level = request.data.fykzl || 0;
        bbxiu_data.querySelector('#fykzl_value').value = level;

        //BB法修
        level = request.data.fskzl || 0;
        bbxiu_data.querySelector('#fskzl_value').value = level;

        //BB法抗
        level = request.data.kfkzl || 0;
        bbxiu_data.querySelector('#kfkzl_value').value = level;


        console.log("获取技能数据：" + request.data)
        //school skill
        level = request.data.skill_0 || 0;
        school_skill_data.querySelector('#skill_0_value').value = level;


        level = request.data.skill_1 || 0;
        school_skill_data.querySelector('#skill_1_value').value = level;


        level = request.data.skill_2 || 0;
        school_skill_data.querySelector('#skill_2_value').value = level;


        level = request.data.skill_3 || 0;
        school_skill_data.querySelector('#skill_3_value').value = level;


        level = request.data.skill_4 || 0;
        school_skill_data.querySelector('#skill_4_value').value = level;


        level = request.data.skill_5 || 0;
        school_skill_data.querySelector('#skill_5_value').value = level;


        level = request.data.skill_6 || 0;
        school_skill_data.querySelector('#skill_6_value').value = level;


        //life skill
        level = request.data.qs || 0;
        life_skill_data.querySelector('#qs_value').value = level || 0


        level = request.data.mx || 0;
        life_skill_data.querySelector('#mx_value').value = level || 0


        level = request.data.cWeapon || 0;
        life_skill_data.querySelector('#cWeapon_value').value = level || 0


        level = request.data.cook || 0;
        life_skill_data.querySelector('#cook_value').value = level || 0


        level = request.data.zy || 0;
        life_skill_data.querySelector('#zy_value').value = level || 0


        level = request.data.ys || 0;
        life_skill_data.querySelector('#ys_value').value = level || 0


        level = request.data.js || 0;
        life_skill_data.querySelector('#js_value').value = level || 0


        level = request.data.qj || 0;
        life_skill_data.querySelector('#qj_value').value = level || 0


        level = request.data.speed || 0;
        life_skill_data.querySelector('#speed_value').value = level || 0


        level = request.data.strong || 0;
        life_skill_data.querySelector('#strong_value').value = level || 0

        let price = parseFloat(request.data.price);
        calculate_data.querySelector('#price_value').value = isNaN(price) ? '' : price;

        calculator();
    }

    find_data.addEventListener('click', function () {
        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        let guoziPriceInput = parseFloat(document.getElementById('guoziPrice_value').value);

        if (!yxbPrice || !guoziPriceInput) {
            alert("先输入游戏币价格和修炼果价格");
            return;
        }

        const message = {action: currentMode === 'pocket' ? "fetchPocketData" : "fetchData"};

        // 独立窗口：把选中的标签页 id 一起发给后台
        if (isStandalone) {
            const tabId = parseInt(targetTabSelect.value);
            if (!tabId) {
                alert("请先选择一个藏宝阁标签页");
                return;
            }
            message.tabId = tabId;
        }

        find_data.disabled = true;
        chrome.runtime.sendMessage(message, (response) => {
            find_data.disabled = false;
            if (chrome.runtime.lastError) {
                const msg = chrome.runtime.lastError.message || '';
                alert("读取失败: " + msg +
                    (/receiving end|message port closed/i.test(msg)
                        ? "\n后台脚本可能还是旧版本，请到 chrome://extensions 重新加载插件后再试"
                        : ""));
                return;
            }
            if (!response || !response.ok) {
                alert(response && response.error ? response.error : "读取失败，请确认目标标签页是角色详情页");
                return;
            }
            applyData({data: response.data});
        });
    });


    calculate.addEventListener('click', function () {
        calculator();
    });

});



