let globalCostData = null;

// 解析比例值：空值默认1，允许0
function parseRatio(val) {
    let n = parseFloat(val);
    return isNaN(n) ? 1 : n;
}

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

    // 机缘加成：若 (最大-当前) <= 3，加500RMB
    let jyCur = charData.jyCur || 0;
    let jyMax = charData.jyMax || 0;
    if (jyMax > 0 && jyMax - jyCur <= 3) {
        rmbOrigin = (parseFloat(rmbOrigin) + 500).toFixed(0);
        rmbDiscount = (parseFloat(rmbDiscount) + 500).toFixed(0);
    }

    let discount = charData.price > 0 ? (charData.price / rmbDiscount * 10).toFixed(2) : '—';

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
        let v = (val === '' || val === undefined || val === null) ? '' : (val || 0);
        return '<input data-key="' + key + '" value="' + v + '"' + (extra || '') + '>';
    }

    return '<div class="detail-panel">'
        + '<div class="dp-header"><strong>' + char.school + ' Lv.' + char.level + ' — ￥' + char.price + '</strong>'
        + '<button class="dp-close" title="关闭">&times;</button></div>'

        + '<div class="dp-section"><div class="dp-section-title">修炼</div><div class="dp-fields">'
        + field('乾元丹', 'qyd', inp('qyd', char.qyd))
        + '<div class="dp-field"><label>机缘</label><div class="dp-input-row">'
            + '<input type="checkbox" checked data-check="jyCur">'
            + inp('jyCur', char.jyCur || 0) + '/' + inp('jyMax', char.jyMax || 0, ' style="width:30px;background:#f0f0f0" readonly')
            + '</div></div>'
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
            xiulian: parseRatio(document.getElementById('xiulian_ratio').value),
            bbxiu: parseRatio(document.getElementById('bbxiu_ratio').value),
            school_skill: parseRatio(document.getElementById('school_skill_ratio').value),
            life_skill: parseRatio(document.getElementById('life_skill_data_ratio').value)
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
        panel.querySelector('.dp-rmb').textContent = '￥' + calc.rmbDiscount;
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
    const firstPageBtn = document.getElementById('first_page_btn');
    const autoBatchBtn = document.getElementById('auto_batch_btn');
    const pageCountInput = document.getElementById('page_count');
    const addToCompareCheckbox = document.getElementById('addToCompare');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const cacheStatusEl = document.getElementById('cacheStatus');

    // 自动计算状态标记
    let isAutoBatching = false;

    // 缓存原始数据和计算结果（按 ordersn 去重）
    let cachedRawData = [];
    let cachedCalcResults = [];
    // 存储每行的完整角色数据（供点击展开详情面板使用）
    let charDataMap = {};

    function updateCacheStatus() {
        if (cachedRawData.length > 0) {
            cacheStatusEl.textContent = '已缓存 ' + cachedRawData.length + ' 个角色';
            clearCacheBtn.style.display = 'inline-block';
        } else {
            cacheStatusEl.textContent = '';
            clearCacheBtn.style.display = 'none';
        }
    }

    // 用当前比例重新计算所有缓存数据
    function recalculateAll(rawData, yxbPrice, guoziPrice, ratios, ignoreHuanian) {
        let calcResults = [];
        let errorCount = 0;
        let huanianCount = 0;
        rawData.forEach(charData => {
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
        calcResults.sort((a, b) => {
            let da = parseFloat(a.discount) || 999;
            let db = parseFloat(b.discount) || 999;
            return da - db;
        });
        return {calcResults, errorCount, huanianCount};
    }

    // 更新已有缓存行的显示值（比例变化时）
    function updateCachedRows(tbodyEl, calcResults) {
        const calcMap = {};
        calcResults.forEach(r => { calcMap[r.ordersn] = r; });
        const rows = tbodyEl.querySelectorAll('tr:not(.detail-row)');
        rows.forEach(row => {
            const ordersn = row.dataset.ordersn;
            if (!ordersn || !calcMap[ordersn]) return;
            const r = calcMap[ordersn];
            // 更新 charDataMap
            charDataMap[ordersn] = r;
            // 更新单元格显示值
            const cells = row.querySelectorAll('td');
            if (cells[3]) cells[3].querySelector('a').textContent = '￥' + r.rmbDiscount;
            let discountText = r.discount === '—' ? '—' : r.discount + '折';
            if (cells[4]) cells[4].querySelector('a').textContent = discountText;
            // 更新行颜色
            let d = parseFloat(r.discount) || 0;
            row.classList.remove('discount-good', 'discount-mid', 'discount-bad');
            if (d > 0 && d <= 5) row.classList.add('discount-good');
            else if (d > 5 && d <= 6.5) row.classList.add('discount-mid');
            else row.classList.add('discount-bad');
        });
    }

    // 返回按钮
    backBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: "switchPage", page: "index.html"});
    });

    // 首页按钮
    firstPageBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: "goToFirstPage"}, function (response) {
            if (chrome.runtime.lastError) {
                alert("跳转失败: " + chrome.runtime.lastError.message);
                return;
            }
            if (response && response.success) {
                firstPageBtn.textContent = "已回到首页";
                setTimeout(() => {
                    firstPageBtn.innerHTML = '<i class="fas fa-home"></i> 首页';
                }, 1500);
            } else {
                alert(response ? response.error : "跳转失败，请确保当前页面是藏宝阁列表页");
            }
        });
    });

    // 清空缓存按钮
    clearCacheBtn.addEventListener('click', function () {
        cachedRawData = [];
        cachedCalcResults = [];
        charDataMap = {};
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

    // 自动翻页批量计算按钮
    autoBatchBtn.addEventListener('click', function () {
        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);

        if (!yxbPrice || !guoziPrice) {
            alert("先输入游戏币价格和修炼果价格");
            return;
        }

        let totalPages = parseInt(pageCountInput.value) || 10;
        if (totalPages < 1) totalPages = 1;

        isAutoBatching = true;
        autoBatchBtn.disabled = true;
        autoBatchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 计算中...';
        autoBatchBtn.classList.remove('pulse');

        document.getElementById('batch_results').style.display = 'block';
        document.getElementById('batch_progress').style.display = 'block';
        document.getElementById('batch_progress').textContent = '正在准备自动翻页计算...';

        // 未勾选比对时清空表格
        if (!addToCompareCheckbox.checked) {
            document.getElementById('batch_tbody').innerHTML = '';
            document.getElementById('batch_summary').innerHTML = '';
            cachedRawData = [];
            cachedCalcResults = [];
            charDataMap = {};
            updateCacheStatus();
        }

        chrome.runtime.sendMessage({action: "autoBatchFetch", totalPages: totalPages});
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

            progressEl.style.display = 'none';

            let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
            let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);

            const ratios = {
                xiulian: parseRatio(document.getElementById('xiulian_ratio').value),
                bbxiu: parseRatio(document.getElementById('bbxiu_ratio').value),
                school_skill: parseRatio(document.getElementById('school_skill_ratio').value),
                life_skill: parseRatio(document.getElementById('life_skill_data_ratio').value)
            };

            // 检查是否忽略花样年华
            const ignoreHuanian = document.getElementById('ignore_huanian').checked;

            // 根据 checkbox 决定是否合并缓存
            let rawDataToCalc;
            let trulyNewRaw = [];
            if (addToCompareCheckbox.checked) {
                // 找出本次新增的角色（不在缓存中的）
                const cachedIds = new Set(cachedRawData.map(r => r.ordersn));
                trulyNewRaw = newResults.filter(r => !cachedIds.has(r.ordersn));
                // 合并原始数据到缓存
                const mergedMap = {};
                cachedRawData.forEach(r => { mergedMap[r.ordersn] = r; });
                newResults.forEach(r => { mergedMap[r.ordersn] = r; });
                cachedRawData = Object.values(mergedMap);
                updateCacheStatus();
                rawDataToCalc = cachedRawData;
            } else {
                cachedRawData = [];
                cachedCalcResults = [];
                updateCacheStatus();
                rawDataToCalc = newResults;
            }

            // 用当前比例重新计算所有数据
            let {calcResults, errorCount, huanianCount} = recalculateAll(rawDataToCalc, yxbPrice, guoziPrice, ratios, ignoreHuanian);

            // 渲染结果（追加或替换）
            let goodCount = 0, midCount = 0, badCount = 0;

            if (addToCompareCheckbox.checked) {
                // 更新已有缓存行的显示值（比例可能变化）
                updateCachedRows(tbodyEl, calcResults);
                cachedCalcResults = calcResults;
                // 只渲染新增部分
                calcResults = calcResults.filter(r => {
                    return trulyNewRaw.some(n => n.ordersn === r.ordersn);
                });
            }
            let tbodyHtml = '';
            calcResults.forEach(r => {
                let d = parseFloat(r.discount) || 0;
                let rowClass = '';
                if (d > 0 && d <= 5) { rowClass = 'discount-good'; goodCount++; }
                else if (d > 5 && d <= 6.5) { rowClass = 'discount-mid'; midCount++; }
                else { rowClass = 'discount-bad'; badCount++; }

                let discountText = r.discount === '—' ? '—' : r.discount + '折';
                charDataMap[r.ordersn] = r;
                tbodyHtml += '<tr class="' + rowClass + '" data-ordersn="' + r.ordersn + '">'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">' + r.school + '</a></td>'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">' + r.level + '</a></td>'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">￥' + r.price + '</a></td>'
                    + '<td><a href="' + r.detailUrl + '" target="_blank">￥' + r.rmbDiscount + '</a></td>'
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
            // 使用事件委托，避免重复绑定监听器
            if (!tbodyEl._delegated) {
                tbodyEl._delegated = true;
                tbodyEl.addEventListener('click', function (e) {
                    const link = e.target.closest('a');
                    if (link) e.preventDefault(); // 阻止 <a> 标签的默认跳转

                    const row = e.target.closest('tr');
                    if (!row || row.classList.contains('detail-row') || row.parentElement !== tbodyEl) return;

                    const detailUrl = row.dataset.detailUrl || '';

                    // 切换详情面板
                    const existing = tbodyEl.querySelector('.detail-row');
                    if (existing && existing.previousElementSibling === row) {
                        // 当前行已展开 → 折叠：关闭对应标签页
                        if (detailUrl) {
                            chrome.tabs.query({url: detailUrl}, function (tabs) {
                                tabs.forEach(t => chrome.tabs.remove(t.id));
                            });
                        }
                        existing.remove();
                        return;
                    }

                    // 展开：新标签页打开角色详情，并从详情页读取乾元丹
                    if (detailUrl) {
                        window.open(detailUrl, '_blank');
                        chrome.runtime.sendMessage({action: "fetchQydFromDetail", detailUrl: detailUrl});
                    }
                    if (existing) existing.remove();

                    // 从 charDataMap 读取完整角色数据构建详情面板
                    const ordersn = row.dataset.ordersn;
                    let charData = ordersn ? charDataMap[ordersn] : null;
                    if (!charData) {
                        const cells = row.querySelectorAll('td');
                        charData = {
                            school: cells[0] ? cells[0].textContent.trim() : '',
                            level: cells[1] ? cells[1].textContent.trim() : '',
                            price: cells[2] ? cells[2].textContent.replace('￥', '').trim() : '',
                            rmbOrigin: cells[3] ? cells[3].textContent.replace('￥', '').trim() : '',
                            discount: cells[4] ? cells[4].textContent.replace('折', '').trim() : '—',
                            detailUrl: detailUrl
                        };
                    }
                    const detailTr = document.createElement('tr');
                    detailTr.className = 'detail-row';
                    const td = document.createElement('td');
                    td.colSpan = 5;
                    td.innerHTML = buildDetailPanelHTML(charData);
                    detailTr.appendChild(td);
                    row.after(detailTr);
                    bindDetailPanelEvents(detailTr, charData);
                });
            }

            // 为每行存储 detailUrl 到 data 属性，供事件委托使用
            const sortedRows = tbodyEl.querySelectorAll('tr:not(.detail-row)');
            sortedRows.forEach(row => {
                row.style.cursor = 'pointer';
                const link = row.querySelector('a');
                if (link) row.dataset.detailUrl = link.href;
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

    // 监听自动翻页批量计算进度
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "autoBatchProgress") {
            const progressEl = document.getElementById('batch_progress');

            // 错误处理
            if (request.error) {
                progressEl.textContent = request.error;
                isAutoBatching = false;
                autoBatchBtn.disabled = false;
                autoBatchBtn.innerHTML = '<i class="fas fa-forward"></i> 自动计算';
                autoBatchBtn.classList.add('pulse');
                return;
            }

            // 提取中：更新进度文字
            if (request.status === "extracting") {
                progressEl.textContent = '正在计算第 ' + request.currentPage + '/' + request.totalPages + ' 页...';
                return;
            }

            // 单页完成：将数据交给 batchUpdateData 的逻辑处理
            if (request.status === "pageDone" && request.results && request.results.length > 0) {
                progressEl.textContent = '第 ' + request.currentPage + '/' + request.totalPages + ' 页完成，'
                    + '已获取 ' + request.results.length + ' 个角色';

                // 复用 batchUpdateData 的处理逻辑
                let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
                let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);
                const tbodyEl = document.getElementById('batch_tbody');
                const summaryEl = document.getElementById('batch_summary');

                const ratios = {
                    xiulian: parseRatio(document.getElementById('xiulian_ratio').value),
                    bbxiu: parseRatio(document.getElementById('bbxiu_ratio').value),
                    school_skill: parseRatio(document.getElementById('school_skill_ratio').value),
                    life_skill: parseRatio(document.getElementById('life_skill_data_ratio').value)
                };
                const ignoreHuanian = document.getElementById('ignore_huanian').checked;

                let newResults = request.results;
                let rawDataToCalc;
                let trulyNewRaw = [];

                // 自动模式始终合并缓存
                const cachedIds = new Set(cachedRawData.map(r => r.ordersn));
                trulyNewRaw = newResults.filter(r => !cachedIds.has(r.ordersn));
                const mergedMap = {};
                cachedRawData.forEach(r => { mergedMap[r.ordersn] = r; });
                newResults.forEach(r => { mergedMap[r.ordersn] = r; });
                cachedRawData = Object.values(mergedMap);
                updateCacheStatus();
                rawDataToCalc = cachedRawData;

                let {calcResults, errorCount, huanianCount} = recalculateAll(rawDataToCalc, yxbPrice, guoziPrice, ratios, ignoreHuanian);

                let goodCount = 0, midCount = 0, badCount = 0;

                // 更新已有行的显示值
                updateCachedRows(tbodyEl, calcResults);
                cachedCalcResults = calcResults;

                // 只渲染新增部分
                let newCalcResults = calcResults.filter(r => {
                    return trulyNewRaw.some(n => n.ordersn === r.ordersn);
                });

                let tbodyHtml = '';
                newCalcResults.forEach(r => {
                    let d = parseFloat(r.discount) || 0;
                    let rowClass = '';
                    if (d > 0 && d <= 5) { rowClass = 'discount-good'; goodCount++; }
                    else if (d > 5 && d <= 6.5) { rowClass = 'discount-mid'; midCount++; }
                    else { rowClass = 'discount-bad'; badCount++; }

                    let discountText = r.discount === '—' ? '—' : r.discount + '折';
                    charDataMap[r.ordersn] = r;
                    tbodyHtml += '<tr class="' + rowClass + '" data-ordersn="' + r.ordersn + '">'
                        + '<td><a href="' + r.detailUrl + '" target="_blank">' + r.school + '</a></td>'
                        + '<td><a href="' + r.detailUrl + '" target="_blank">' + r.level + '</a></td>'
                        + '<td><a href="' + r.detailUrl + '" target="_blank">￥' + r.price + '</a></td>'
                        + '<td><a href="' + r.detailUrl + '" target="_blank">￥' + r.rmbDiscount + '</a></td>'
                        + '<td><a href="' + r.detailUrl + '" target="_blank">' + discountText + '</a></td>'
                        + '</tr>';
                });
                tbodyEl.insertAdjacentHTML('beforeend', tbodyHtml);

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
                const detailRows = tbodyEl.querySelectorAll('.detail-row');
                detailRows.forEach(r => r.remove());
                allDataRows.forEach(row => tbodyEl.appendChild(row));

                // 为每行存储 detailUrl
                const sortedRows = tbodyEl.querySelectorAll('tr:not(.detail-row)');
                sortedRows.forEach(row => {
                    row.style.cursor = 'pointer';
                    const link = row.querySelector('a');
                    if (link) row.dataset.detailUrl = link.href;
                });

                // 汇总（追加模式）
                const existingSummary = summaryEl.innerHTML;
                if (existingSummary) {
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

                    summaryEl.innerHTML = '共 ' + (prevTotal + newCalcResults.length) + ' 个角色'
                        + ((prevHuanian + huanianCount) > 0 ? '（忽略花样年华: ' + (prevHuanian + huanianCount) + '个）' : '')
                        + ((prevError + errorCount) > 0 ? '（' + (prevError + errorCount) + '个解析失败）' : '')
                        + ' | <span style="color:#d4edda">捡漏: ' + (prevGood + goodCount) + '</span>'
                        + ' <span style="color:#fff3cd">适中: ' + (prevMid + midCount) + '</span>'
                        + ' <span style="color:#f8d7da">偏贵: ' + (prevBad + badCount) + '</span>';
                } else {
                    summaryEl.innerHTML = '共 ' + newCalcResults.length + ' 个角色'
                        + (huanianCount > 0 ? '（忽略花样年华: ' + huanianCount + '个）' : '')
                        + (errorCount > 0 ? '（' + errorCount + '个解析失败）' : '')
                        + ' | <span style="color:#d4edda">捡漏: ' + goodCount + '</span>'
                        + ' <span style="color:#fff3cd">适中: ' + midCount + '</span>'
                        + ' <span style="color:#f8d7da">偏贵: ' + badCount + '</span>';
                }
                return;
            }

            // 全部完成或结束
            if (request.status === "done" || request.status === "end") {
                let msg = '自动计算完成！共 ' + request.currentPage + ' 页';
                if (request.reason) msg += '（' + request.reason + '）';
                progressEl.textContent = msg;
                isAutoBatching = false;
                autoBatchBtn.disabled = false;
                autoBatchBtn.innerHTML = '<i class="fas fa-forward"></i> 自动计算';
                autoBatchBtn.classList.add('pulse');
                return;
            }
        }
    });

    // 监听从详情页读取的乾元丹和机缘数据，更新详情面板并自动重新计算
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "qydFetched" && request.detailUrl) {
            const qydInput = document.querySelector('.detail-panel input[data-key="qyd"]');
            if (qydInput) {
                qydInput.value = request.qyd;
                // 更新机缘
                const jyCurInput = document.querySelector('.detail-panel input[data-key="jyCur"]');
                const jyMaxInput = document.querySelector('.detail-panel input[data-key="jyMax"]');
                if (jyCurInput) jyCurInput.value = request.jyCur || 0;
                if (jyMaxInput) jyMaxInput.value = request.jyMax || 0;
                // 同时更新 charDataMap 中的缓存数据
                const detailRow = qydInput.closest('.detail-row');
                if (detailRow && detailRow.previousElementSibling) {
                    const ordersn = detailRow.previousElementSibling.dataset.ordersn;
                    if (ordersn && charDataMap[ordersn]) {
                        charDataMap[ordersn].qyd = request.qyd;
                        charDataMap[ordersn].jyCur = request.jyCur || 0;
                        charDataMap[ordersn].jyMax = request.jyMax || 0;
                    }
                }
                // 自动点击"重新计算"按钮
                const panel = qydInput.closest('.detail-panel');
                if (panel) {
                    const calcBtn = panel.querySelector('.dp-calc-btn');
                    if (calcBtn) calcBtn.click();
                }
            }
        }
    });
});
