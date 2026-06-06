let globalCostData = null;

async function loadJSON() {
    try {
        const url = chrome.runtime.getURL('data/data.json');
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        globalCostData = await response.json();
    } catch (error) {
        console.error('Failed to load JSON:', error);
    }
}

// 纯计算函数：从数据对象计算消耗，不操作 DOM
function calculateFromData(charData, costData, yxbPrice, guoziPriceVal, ratios) {
    function lookupCost(type, level, upper) {
        if (!level) level = 0;
        let cost = 0;
        if (type === "bbxiu") {
            let entry = costData[type][level.toString()];
            if (!entry) return null;
            cost = parseFloat(entry["guozi_size"]) * guoziPriceVal;
        } else {
            let entry = costData[type][level.toString()];
            if (!entry) return null;
            cost = entry["totalcost"];
            if (upper !== 0 && upper > 20) {
                let xiu_upper_times = costData["xiulianshangxian"][upper.toString()];
                if (xiu_upper_times) {
                    cost += xiu_upper_times["times"] * (type === "fangxiu" ? 2 : 3);
                }
            }
        }
        return cost;
    }

    let total_origin = 0;
    let total_discount = 0;

    // 修炼
    let r = ratios.xiulian;
    let items = [
        {type: "qianyuandan", level: charData.qyd, upper: 0},
        {type: "gongxiu", level: charData.gjxl, upper: charData.gjxlUpper},
        {type: "gongxiu", level: charData.fsxl, upper: charData.fsxlUpper},
        {type: "fangxiu", level: charData.fyxl, upper: charData.fyxlUpper},
        {type: "fangxiu", level: charData.kfxl, upper: charData.kfxlUpper}
    ];
    items.forEach(item => {
        let c = lookupCost(item.type, item.level, item.upper);
        if (c !== null) { total_origin += c; total_discount += c * r; }
    });

    // 宠修
    r = ratios.bbxiu;
    let bbItems = [charData.gjkzl, charData.fskzl, charData.fykzl, charData.kfkzl];
    bbItems.forEach(level => {
        let c = lookupCost("bbxiu", level, 0);
        if (c !== null) { total_origin += c; total_discount += c * r; }
    });

    // 师门技能
    r = ratios.school_skill;
    let skillItems = [charData.skill_0, charData.skill_1, charData.skill_2,
                      charData.skill_3, charData.skill_4, charData.skill_5, charData.skill_6];
    skillItems.forEach(level => {
        let c = lookupCost("school_skill", level, 0);
        if (c !== null) { total_origin += c; total_discount += c * r; }
    });

    // 生活技能
    r = ratios.life_skill;
    let lifeItems = [
        {type: "qiangzhuang", level: charData.speed},
        {type: "qiangzhuang", level: charData.strong},
        {type: "life_skill", level: charData.qs},
        {type: "life_skill", level: charData.mx},
        {type: "life_skill", level: charData.cWeapon},
        {type: "life_skill", level: charData.cook},
        {type: "life_skill", level: charData.zy},
        {type: "life_skill", level: charData.ys},
        {type: "life_skill", level: charData.js},
        {type: "life_skill", level: charData.qj}
    ];
    lifeItems.forEach(item => {
        let c = lookupCost(item.type, item.level, 0);
        if (c !== null) { total_origin += c; total_discount += c * r; }
    });

    let rmbOrigin = (total_origin * yxbPrice).toFixed(0);
    let rmbDiscount = (total_discount * yxbPrice).toFixed(0);
    let discount = charData.price > 0 ? (charData.price / rmbOrigin * 10).toFixed(2) : '—';

    return {
        total_origin: total_origin,
        total_discount: total_discount,
        rmbOrigin: rmbOrigin,
        rmbDiscount: rmbDiscount,
        discount: discount
    };
}

function buildDetailPanelHTML(char) {
    function fv(val) { return val || 0; }
    // 带复选框的字段
    function field(label, checkId, inputs) {
        return '<div class="dp-field"><label>' + label + '</label><div class="dp-input-row">'
            + '<input type="checkbox" checked data-check="' + checkId + '">'
            + inputs + '</div></div>';
    }
    // 无复选框的字段
    function fieldNoChk(label, inputs) {
        return '<div class="dp-field"><label>' + label + '</label><div class="dp-input-row">'
            + inputs + '</div></div>';
    }
    function inp(key, val, extra) {
        return '<input data-key="' + key + '" value="' + fv(val) + '"' + (extra || '') + '>';
    }

    return '<div class="detail-panel">'
        + '<div class="dp-header"><strong>' + char.school + ' Lv.' + char.level + ' — ￥' + char.price + '</strong>'
        + '<button class="dp-close" title="关闭">&times;</button></div>'

        + '<div class="dp-section"><div class="dp-section-title">修炼</div><div class="dp-fields">'
        + field('乾元丹', 'qyd', inp('qyd', char.qyd))
        + field('攻修', 'gjxl', inp('gjxl', char.gjxl) + inp('gjxlUpper', char.gjxlUpper, ' placeholder="上限"'))
        + field('法修', 'fsxl', inp('fsxl', char.fsxl) + inp('fsxlUpper', char.fsxlUpper, ' placeholder="上限"'))
        + field('防修', 'fyxl', inp('fyxl', char.fyxl) + inp('fyxlUpper', char.fyxlUpper, ' placeholder="上限"'))
        + field('法抗', 'kfxl', inp('kfxl', char.kfxl) + inp('kfxlUpper', char.kfxlUpper, ' placeholder="上限"'))
        + '</div></div>'

        + '<div class="dp-section"><div class="dp-section-title">宠修</div><div class="dp-fields">'
        + field('BB攻修', 'gjkzl', inp('gjkzl', char.gjkzl))
        + field('BB法修', 'fskzl', inp('fskzl', char.fskzl))
        + field('BB防修', 'fykzl', inp('fykzl', char.fykzl))
        + field('BB法抗', 'kfkzl', inp('kfkzl', char.kfkzl))
        + '</div></div>'

        + '<div class="dp-section"><div class="dp-section-title">师门技能</div><div class="dp-fields">'
        + field('技能1', 'skill_0', inp('skill_0', char.skill_0))
        + field('技能2', 'skill_1', inp('skill_1', char.skill_1))
        + field('技能3', 'skill_2', inp('skill_2', char.skill_2))
        + field('技能4', 'skill_3', inp('skill_3', char.skill_3))
        + field('技能5', 'skill_4', inp('skill_4', char.skill_4))
        + field('技能6', 'skill_5', inp('skill_5', char.skill_5))
        + field('技能7', 'skill_6', inp('skill_6', char.skill_6))
        + '</div></div>'

        + '<div class="dp-section"><div class="dp-section-title">生活技能</div><div class="dp-fields">'
        + field('强身', 'qs', inp('qs', char.qs))
        + field('冥想', 'mx', inp('mx', char.mx))
        + field('暗器', 'cWeapon', inp('cWeapon', char.cWeapon))
        + field('烹饪', 'cook', inp('cook', char.cook))
        + field('中药', 'zy', inp('zy', char.zy))
        + field('养生', 'ys', inp('ys', char.ys))
        + field('健身', 'js', inp('js', char.js))
        + field('巧匠', 'qj', inp('qj', char.qj))
        + field('神速', 'speed', inp('speed', char.speed))
        + field('强壮', 'strong', inp('strong', char.strong))
        + '</div></div>'

        + '<div class="dp-section"><div class="dp-section-title">页面售价</div><div class="dp-fields">'
        + fieldNoChk('价格（元）', inp('price', char.price))
        + '</div></div>'

        + '<div class="dp-actions">'
        + '<button class="btn btn-primary dp-calc-btn"><i class="fas fa-calculator"></i> 重新计算</button>'
        + '<div class="dp-result"><span>计算值: ￥<span class="dp-rmb">—</span></span>'
        + '<span>折扣: <span class="dp-discount">—</span></span></div>'
        + '</div>'

        + '</div>';
}

function bindDetailPanelEvents(panel, char) {
    panel.querySelector('.dp-close').addEventListener('click', function () {
        panel.closest('.detail-row').remove();
    });

    panel.querySelector('.dp-calc-btn').addEventListener('click', function () {
        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);
        if (!yxbPrice || !guoziPrice) {
            alert("先输入游戏币价格和修炼果价格");
            return;
        }

        const ratios = {
            xiulian: parseFloat(document.getElementById('xiulian_ratio').value) || 1,
            bbxiu: parseFloat(document.getElementById('bbxiu_ratio').value) || 1,
            school_skill: parseFloat(document.getElementById('school_skill_ratio').value) || 1,
            life_skill: parseFloat(document.getElementById('life_skill_data_ratio').value) || 1
        };

        // 构建 checkbox 映射：key -> 是否勾选
        const checked = {};
        panel.querySelectorAll('input[data-check]').forEach(cb => {
            checked[cb.dataset.check] = cb.checked;
        });

        // 读取字段值，未勾选的项置 0
        const edited = {};
        panel.querySelectorAll('input[data-key]').forEach(input => {
            const key = input.dataset.key;
            // 查找对应 checkbox：精确匹配或去掉 Upper 后缀匹配
            const cbKey = checked[key] !== undefined ? key : key.replace(/Upper$/, '');
            const isEnabled = checked[cbKey] !== undefined ? checked[cbKey] : true;
            edited[key] = isEnabled ? (parseFloat(input.value) || 0) : 0;
        });

        const calc = calculateFromData(edited, globalCostData, yxbPrice, guoziPrice, ratios);
        panel.querySelector('.dp-rmb').textContent = '￥' + calc.rmbOrigin;
        const d = parseFloat(calc.discount);
        const discountEl = panel.querySelector('.dp-discount');
        discountEl.textContent = calc.discount === '—' ? '—' : calc.discount + '折';
        discountEl.style.color = (d > 0 && d <= 5) ? '#28a745' : (d > 5 && d <= 6.5) ? '#e67e22' : '#e74c3c';
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    await loadJSON();

    const batchBtn = document.getElementById('batch_data');
    const backBtn = document.getElementById('back_btn');
    // const firstPageBtn = document.getElementById('first_page_btn');
    const addToCompareCheckbox = document.getElementById('addToCompare');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const cacheStatusEl = document.getElementById('cacheStatus');

    // 缓存结果（按 ordersn 去重）
    let cachedResults = [];

    function updateCacheStatus() {
        if (cachedResults.length > 0) {
            cacheStatusEl.textContent = '已缓存 ' + cachedResults.length + ' 个角色';
            clearCacheBtn.style.display = 'inline-block';
        } else {
            cacheStatusEl.textContent = '';
            clearCacheBtn.style.display = 'none';
        }
    }

    function mergeResults(newResults) {
        const map = {};
        cachedResults.forEach(r => { map[r.ordersn] = r; });
        newResults.forEach(r => { map[r.ordersn] = r; });
        return Object.values(map);
    }

    // 返回按钮
    backBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: "switchPage", page: "index.html"});
    });

    // // 首页按钮
    // firstPageBtn.addEventListener('click', function () {
    //     chrome.runtime.sendMessage({action: "goToFirstPage"}, function (response) {
    //         if (chrome.runtime.lastError) {
    //             alert("跳转失败: " + chrome.runtime.lastError.message);
    //             return;
    //         }
    //         if (response && response.success) {
    //             firstPageBtn.textContent = "已回到首页";
    //             setTimeout(() => {
    //                 firstPageBtn.innerHTML = '<i class="fas fa-home"></i> 首页';
    //             }, 1500);
    //         } else {
    //             alert(response ? response.error : "跳转失败，请确保当前页面是藏宝阁列表页");
    //         }
    //     });
    // });

    // 清空缓存按钮
    clearCacheBtn.addEventListener('click', function () {
        cachedResults = [];
        updateCacheStatus();
        document.getElementById('batch_tbody').innerHTML = '';
        document.getElementById('batch_summary').innerHTML = '';
    });

    // 批量计算按钮
    batchBtn.addEventListener('click', function () {
        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);

        if (!yxbPrice || !guoziPrice) {
            alert("先输入游戏币价格和修炼果价格");
            return;
        }

        document.getElementById('batch_results').style.display = 'block';
        document.getElementById('batch_progress').style.display = 'block';
        document.getElementById('batch_progress').textContent = '正在提取数据...';
        // 未勾选比对时清空表格，勾选时保留已有结果
        if (!addToCompareCheckbox.checked) {
            document.getElementById('batch_tbody').innerHTML = '';
            document.getElementById('batch_summary').innerHTML = '';
        }

        chrome.runtime.sendMessage({action: "batchFetchData"});
    });

    // 监听批量数据返回
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "batchUpdateData") {
            const progressEl = document.getElementById('batch_progress');
            const tbodyEl = document.getElementById('batch_tbody');
            const summaryEl = document.getElementById('batch_summary');

            if (request.error) {
                progressEl.textContent = request.error;
                return;
            }

            let newResults = request.results;

            // 根据 checkbox 决定是否合并缓存
            let resultsToRender;
            if (addToCompareCheckbox.checked) {
                // 找出本次新增的角色（不在缓存中的）
                const cachedIds = new Set(cachedResults.map(r => r.ordersn));
                const trulyNew = newResults.filter(r => !cachedIds.has(r.ordersn));
                // 合并到缓存
                resultsToRender = mergeResults(newResults);
                cachedResults = resultsToRender;
                updateCacheStatus();
                // 只渲染新增部分
                resultsToRender = trulyNew;
            } else {
                cachedResults = [];
                updateCacheStatus();
                resultsToRender = newResults;
            }

            progressEl.style.display = 'none';

            let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
            let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);

            const ratios = {
                xiulian: parseFloat(document.getElementById('xiulian_ratio').value) || 1,
                bbxiu: parseFloat(document.getElementById('bbxiu_ratio').value) || 1,
                school_skill: parseFloat(document.getElementById('school_skill_ratio').value) || 1,
                life_skill: parseFloat(document.getElementById('life_skill_data_ratio').value) || 1
            };

            // 检查是否忽略花样年华
            const ignoreHuanian = document.getElementById('ignore_huanian').checked;

            // 计算每个角色
            let calcResults = [];
            let errorCount = 0;
            let huanianCount = 0;
            resultsToRender.forEach(charData => {
                // 如果勾选了忽略花样年华，且服务器是"时光-花样年华"则跳过
                if (ignoreHuanian && charData.server && charData.server.indexOf('花样年华') !== -1) {
                    huanianCount++;
                    return;
                }
                try {
                    let calc = calculateFromData(charData, globalCostData, yxbPrice, guoziPrice, ratios);
                    calcResults.push({...charData, ...calc});
                } catch (e) {
                    console.warn('计算失败:', charData.name, e);
                    errorCount++;
                }
            });

            // 按折扣排序（折扣低的排前面，即更划算）
            calcResults.sort((a, b) => {
                let da = parseFloat(a.discount) || 999;
                let db = parseFloat(b.discount) || 999;
                return da - db;
            });

            // 渲染结果（追加或替换）
            let goodCount = 0, midCount = 0, badCount = 0;
            let tbodyHtml = '';
            calcResults.forEach(r => {
                let d = parseFloat(r.discount) || 0;
                let rowClass = '';
                if (d > 0 && d <= 5) { rowClass = 'discount-good'; goodCount++; }
                else if (d > 5 && d <= 6.5) { rowClass = 'discount-mid'; midCount++; }
                else { rowClass = 'discount-bad'; badCount++; }

                let discountText = r.discount === '—' ? '—' : r.discount + '折';
                tbodyHtml += '<tr class="' + rowClass + '">'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">' + r.school + '</a></td>'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">' + r.level + '</a></td>'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">￥' + r.price + '</a></td>'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">￥' + r.rmbOrigin + '</a></td>'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">' + discountText + '</a></td>'
                    + '</tr>';
            });

            if (addToCompareCheckbox.checked) {
                // 追加到现有表格
                tbodyEl.insertAdjacentHTML('beforeend', tbodyHtml);
            } else {
                // 替换整个表格
                tbodyEl.innerHTML = tbodyHtml;
            }

            // 按折扣重新排序所有行
            const allDataRows = Array.from(tbodyEl.querySelectorAll('tr:not(.detail-row)'));
            allDataRows.sort((a, b) => {
                const getDiscount = (row) => {
                    const text = row.lastElementChild ? row.lastElementChild.textContent : '';
                    const match = text.match(/([\d.]+)折/);
                    return match ? parseFloat(match[1]) : 999;
                };
                return getDiscount(a) - getDiscount(b);
            });
            // 移除所有行（包括详情面板），按排序后顺序重新插入
            const detailRows = tbodyEl.querySelectorAll('.detail-row');
            detailRows.forEach(r => r.remove());
            allDataRows.forEach(row => tbodyEl.appendChild(row));

            // 点击行：新标签页打开角色页面 + 展开详情面板
            const sortedRows = tbodyEl.querySelectorAll('tr');
            sortedRows.forEach((row, idx) => {
                row.style.cursor = 'pointer';
                row.addEventListener('click', function (e) {
                    e.preventDefault();
                    // 切换详情面板
                    const existing = tbodyEl.querySelector('.detail-row');
                    if (existing && existing.dataset.index == idx) {
                        // 检查当前活动标签页是否是该角色的售卖页，如果是则关闭
                        const link = row.querySelector('a');
                        const detailUrl = link ? link.href : '';
                        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                            if (tabs[0] && detailUrl && tabs[0].url === detailUrl) {
                                chrome.tabs.remove(tabs[0].id);
                            }
                        });
                        existing.remove();
                        return;
                    }
                    // 新标签页打开角色详情（仅展开时跳转，折叠时不跳转）
                    const link = row.querySelector('a');
                    if (link && link.href) window.open(link.href, '_blank');
                    if (existing) existing.remove();
                    // 从行中提取数据构建详情面板
                    const cells = row.querySelectorAll('td');
                    const charData = {
                        school: cells[0] ? cells[0].textContent.trim() : '',
                        level: cells[1] ? cells[1].textContent.trim() : '',
                        price: cells[2] ? cells[2].textContent.replace('￥', '').trim() : '',
                        rmbOrigin: cells[3] ? cells[3].textContent.replace('￥', '').trim() : '',
                        discount: cells[4] ? cells[4].textContent.replace('折', '').trim() : '—',
                        detailUrl: link ? link.href : ''
                    };
                    const detailTr = document.createElement('tr');
                    detailTr.className = 'detail-row';
                    detailTr.dataset.index = idx;
                    const td = document.createElement('td');
                    td.colSpan = 5;
                    td.innerHTML = buildDetailPanelHTML(charData);
                    detailTr.appendChild(td);
                    row.after(detailTr);
                    bindDetailPanelEvents(detailTr, charData);
                });
            });

            // 汇总
            if (addToCompareCheckbox.checked) {
                // 追加模式：更新现有汇总
                const existingSummary = summaryEl.innerHTML;
                if (existingSummary) {
                    // 解析现有汇总中的数字并累加
                    const totalMatch = existingSummary.match(/共 (\d+) 个角色/);
                    const goodMatch = existingSummary.match(/捡漏: (\d+)/);
                    const midMatch = existingSummary.match(/适中: (\d+)/);
                    const badMatch = existingSummary.match(/偏贵: (\d+)/);
                    const errorMatch = existingSummary.match(/(\d+)个解析失败/);
                    const huanianMatch = existingSummary.match(/忽略花样年华: (\d+)个/);

                    const prevTotal = totalMatch ? parseInt(totalMatch[1]) : 0;
                    const prevGood = goodMatch ? parseInt(goodMatch[1]) : 0;
                    const prevMid = midMatch ? parseInt(midMatch[1]) : 0;
                    const prevBad = badMatch ? parseInt(badMatch[1]) : 0;
                    const prevError = errorMatch ? parseInt(errorMatch[1]) : 0;
                    const prevHuanian = huanianMatch ? parseInt(huanianMatch[1]) : 0;

                    summaryEl.innerHTML = '共 ' + (prevTotal + calcResults.length) + ' 个角色'
                        + ((prevHuanian + huanianCount) > 0 ? '（忽略花样年华: ' + (prevHuanian + huanianCount) + '个）' : '')
                        + ((prevError + errorCount) > 0 ? '（' + (prevError + errorCount) + '个解析失败）' : '')
                        + ' | <span style="color:#d4edda">捡漏: ' + (prevGood + goodCount) + '</span>'
                        + ' <span style="color:#fff3cd">适中: ' + (prevMid + midCount) + '</span>'
                        + ' <span style="color:#f8d7da">偏贵: ' + (prevBad + badCount) + '</span>';
                } else {
                    summaryEl.innerHTML = '共 ' + calcResults.length + ' 个角色'
                        + (huanianCount > 0 ? '（忽略花样年华: ' + huanianCount + '个）' : '')
                        + (errorCount > 0 ? '（' + errorCount + '个解析失败）' : '')
                        + ' | <span style="color:#d4edda">捡漏: ' + goodCount + '</span>'
                        + ' <span style="color:#fff3cd">适中: ' + midCount + '</span>'
                        + ' <span style="color:#f8d7da">偏贵: ' + badCount + '</span>';
                }
            } else {
                summaryEl.innerHTML = '共 ' + calcResults.length + ' 个角色'
                    + (huanianCount > 0 ? '（忽略花样年华: ' + huanianCount + '个）' : '')
                    + (errorCount > 0 ? '（' + errorCount + '个解析失败）' : '')
                    + ' | <span style="color:#d4edda">捡漏: ' + goodCount + '</span>'
                    + ' <span style="color:#fff3cd">适中: ' + midCount + '</span>'
                    + ' <span style="color:#f8d7da">偏贵: ' + badCount + '</span>';
            }
        }
    });
});
