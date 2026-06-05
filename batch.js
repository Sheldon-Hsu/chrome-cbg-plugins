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

document.addEventListener('DOMContentLoaded', async function () {
    await loadJSON();

    const batchBtn = document.getElementById('batch_data');
    const backBtn = document.getElementById('back_btn');

    // 返回按钮
    backBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: "switchPage", page: "index.html"});
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
        document.getElementById('batch_tbody').innerHTML = '';
        document.getElementById('batch_summary').innerHTML = '';

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

            const results = request.results;
            progressEl.style.display = 'none';

            let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
            let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);

            const ratios = {
                xiulian: parseFloat(document.getElementById('xiulian_ratio').value) || 1,
                bbxiu: parseFloat(document.getElementById('bbxiu_ratio').value) || 1,
                school_skill: parseFloat(document.getElementById('school_skill_ratio').value) || 1,
                life_skill: parseFloat(document.getElementById('life_skill_data_ratio').value) || 1
            };

            // 计算每个角色
            let calcResults = [];
            let errorCount = 0;
            results.forEach(charData => {
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

            // 渲染结果
            let goodCount = 0, midCount = 0, badCount = 0;
            let tbodyHtml = '';
            calcResults.forEach(r => {
                let d = parseFloat(r.discount) || 0;
                let rowClass = '';
                if (d > 0 && d <= 7) { rowClass = 'discount-good'; goodCount++; }
                else if (d > 7 && d <= 9) { rowClass = 'discount-mid'; midCount++; }
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
            tbodyEl.innerHTML = tbodyHtml;

            // 汇总
            summaryEl.innerHTML = '共 ' + results.length + ' 个角色'
                + (errorCount > 0 ? '（' + errorCount + '个解析失败）' : '')
                + ' | <span style="color:#d4edda">捡漏: ' + goodCount + '</span>'
                + ' <span style="color:#fff3cd">适中: ' + midCount + '</span>'
                + ' <span style="color:#f8d7da">偏贵: ' + badCount + '</span>';
        }
    });
});
