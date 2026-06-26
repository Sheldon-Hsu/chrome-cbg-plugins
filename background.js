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

    if (request.action === "fetchData") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {

            // 依赖加载后再执行主逻辑
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: () => {

                    function upper_limit_school_skill(skill_level) {
                        if (!skill_level) {
                            return 0;
                        }
                        let origin_level = parseInt(skill_level)
                        if (origin_level > 180) {
                            return 180;
                        } else {
                            return origin_level;
                        }

                    }

                    //
                    const data = {}
                    const button = document.getElementById('role_basic');
                    if (button) button.click();

                    // 提取目标表格数据
                    const priceBox = document.querySelector('.infoList').querySelector('.price');

                    let array = Array.from(priceBox.querySelectorAll('span'));
                    for (let i = 0; i < array.length; i++) {
                        let li = array[i]
                        // console.log(li.textContent)
                        if (li.textContent.includes('元')) {
                            // console.log(li.textContent)
                            data.price = li.textContent.replace(/\s/g, '').split('￥')[1].split("（元）")[0].trim();
                            break;
                        }
                    }

                    const roleBox = document.getElementById('role_info_box');
                    data.school = roleBox.querySelector('#kindName').textContent
                    if (!roleBox) {
                        throw new Error('未找到role_info_box元素,' + document.textContent);
                    }
                    Array.from(roleBox.querySelectorAll('td')).forEach(td => {
                        if (td.textContent.includes('新版乾元丹数量')) {
                            data.qyd = td.textContent.split('：')[1].trim();
                        }
                        if (td.textContent.includes('月饼粽子机缘')) {
                            let jyStr = td.textContent.split('：')[1].trim();
                            if (jyStr && jyStr.includes('/')) {
                                let parts = jyStr.split('/');
                                data.jyCur = parseInt(parts[0]) || 0;
                                data.jyMax = parseInt(parts[1]) || 0;
                            }
                        }
                    });

                    // 防御修炼数据提取（兼容方案）
                    Array.from(roleBox.querySelectorAll('th')).forEach(th => {
                        if (th.textContent.includes('攻击修炼')) {
                            const valueCell = th.nextElementSibling;
                            const gjxlAndupper = valueCell.textContent.trim();
                            data.gjxl = gjxlAndupper.split("/")[0]
                            data.gjxlUpper = gjxlAndupper.split("/")[1]
                        }
                        if (th.textContent.includes('防御修炼')) {
                            const valueCell = th.nextElementSibling;
                            const fyxlAndupper = valueCell.textContent.trim();
                            data.fyxl = fyxlAndupper.split("/")[0]
                            data.fyxlUpper = fyxlAndupper.split("/")[1]
                        }
                        if (th.textContent.includes('法术修炼')) {
                            const valueCell = th.nextElementSibling
                            const fsxlAndupper = valueCell.textContent.trim();
                            data.fsxl = fsxlAndupper.split("/")[0]
                            data.fsxlUpper = fsxlAndupper.split("/")[1]
                        }
                        if (th.textContent.includes('抗法修炼')) {
                            const valueCell = th.nextElementSibling;
                            const kfxlAndupper = valueCell.textContent.trim();
                            data.kfxl = kfxlAndupper.split("/")[0]
                            data.kfxlUpper = kfxlAndupper.split("/")[1]
                        }
                        if (th.textContent.includes('攻击控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.gjkzl = valueCell.textContent.trim();

                        }
                        if (th.textContent.includes('防御控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.fykzl = valueCell.textContent.trim();
                        }
                        if (th.textContent.includes('法术控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.fskzl = valueCell.textContent.trim();
                        }
                        if (th.textContent.includes('抗法控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.kfkzl = valueCell.textContent.trim();
                        }

                    });

                    const button2 = document.getElementById('role_skill');
                    if (button2) button2.click();
                    const role_info_box = document.getElementById('role_info_box').querySelector('#school_skill_lists');
                    if (role_info_box) {
                        const skill_level = Array.from(role_info_box.getElementsByTagName('p'))
                            .map(p => p.textContent);
                        if (skill_level.length === 7) {
                            data.skill_0 = upper_limit_school_skill(skill_level[0].trim());
                            data.skill_1 = upper_limit_school_skill(skill_level[1].trim());
                            data.skill_2 = upper_limit_school_skill(skill_level[2].trim());
                            data.skill_3 = upper_limit_school_skill(skill_level[3].trim());
                            data.skill_4 = upper_limit_school_skill(skill_level[4].trim());
                            data.skill_5 = upper_limit_school_skill(skill_level[5].trim());
                            data.skill_6 = upper_limit_school_skill(skill_level[6].trim());


                        }

                        const h5Elements = document.getElementById('role_info_box').querySelector('#life_skill_lists').querySelectorAll('h5');
                        h5Elements.forEach(h5 => {
                            // 获取前面的p元素内容
                            const pValue = h5.previousElementSibling.textContent;
                            const h5Value = h5.textContent;

                            if (h5Value.trim() === "强壮") {
                                data.strong = pValue.trim();
                            } else if (h5Value.trim() === "神速") {
                                data.speed = pValue.trim();
                            } else if (h5Value.trim() === "强身术") {
                                data.qs = pValue.trim();
                            } else if (h5Value.trim() === "冥想") {
                                data.mx = pValue.trim();
                            } else if (h5Value.trim() === "暗器技巧") {
                                data.cWeapon = pValue.trim();
                            } else if (h5Value.trim() === "烹饪技巧") {
                                data.cook = pValue.trim();
                            } else if (h5Value.trim() === "中药医理") {
                                data.zy = pValue.trim();
                            } else if (h5Value.trim() === "养生之道") {
                                data.ys = pValue.trim();
                            } else if (h5Value.trim() === "健身术") {
                                data.js = pValue.trim();
                            } else if (h5Value.trim() === "巧匠之术") {
                                data.qj = pValue.trim();
                            } else if (h5Value.trim() === "烹饪技巧") {
                                data.cook = pValue.trim();
                            }
                        });
                    }

                    if (button) button.click();
                    return data;
                }
            }, (results) => {
                // 将数据传回侧边栏
                chrome.runtime.sendMessage({
                    action: "updateData",
                    data: results[0].result
                });
            });
        });
    }

    // 跳转到首页：调用页面的 goto(1)
    if (request.action === "goToFirstPage") {
        chrome.tabs.query({url: "*://xyq.cbg.163.com/*"}, (tabs) => {
            if (!tabs || tabs.length === 0) {
                sendResponse({success: false, error: "未找到藏宝阁页面，请先打开藏宝阁"});
                return;
            }
            const tab = tabs.find(t => t.active) || tabs[0];
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
            const tab = tabs.find(t => t.active) || tabs[0];
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
            const LIFE_SKILL_IDS = new Set(["201","202","203","206","208","211","212","216","230","237"]);
            const LIFE_SKILL_MAP = {
                "201": "qs", "202": "mx", "203": "cWeapon", "206": "zy",
                "208": "cook", "211": "ys", "212": "js", "216": "qj",
                "230": "strong", "237": "speed"
            };
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
                    const gjxl = info.iExptSki1 || 0;
                    const gjxlUpper = info.iMaxExpt1 || 0;
                    const fsxl = info.iExptSki2 || 0;
                    const fsxlUpper = info.iMaxExpt2 || 0;
                    const fyxl = info.iExptSki3 || 0;
                    const fyxlUpper = info.iMaxExpt3 || 0;
                    const kfxl = info.iExptSki4 || 0;
                    const kfxlUpper = info.iMaxExpt4 || 0;
                    const qyd = 0;
                    const gjkzl = info.iBeastSki1 || 0;
                    const fskzl = info.iBeastSki2 || 0;
                    const fykzl = info.iBeastSki3 || 0;
                    const kfkzl = info.iBeastSki4 || 0;
                    const allSkills = info.all_skills || {};
                    const lifeSkills = {};
                    const schoolSkillCandidates = [];
                    for (const [id, level] of Object.entries(allSkills)) {
                        if (LIFE_SKILL_IDS.has(id)) {
                            lifeSkills[LIFE_SKILL_MAP[id]] = level;
                        } else if (level > 100 && parseInt(id) < 200) {
                            schoolSkillCandidates.push({id: parseInt(id), level: level});
                        }
                    }
                    schoolSkillCandidates.sort((a, b) => b.level - a.level);
                    const schoolSkills = [];
                    for (let i = 0; i < 7 && i < schoolSkillCandidates.length; i++) {
                        schoolSkills.push(upperLimit(schoolSkillCandidates[i].level));
                    }
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
            const tab = tabs.find(t => t.active) || tabs[0];
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

                for (let i = 0; i < actualTotal; i++) {
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
            const LIFE_SKILL_IDS = new Set(["201","202","203","206","208","211","212","216","230","237"]);
            const LIFE_SKILL_MAP = {
                "201": "qs", "202": "mx", "203": "cWeapon", "206": "zy",
                "208": "cook", "211": "ys", "212": "js", "216": "qj",
                "230": "strong", "237": "speed"
            };
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
                    const gjxl = info.iExptSki1 || 0;
                    const gjxlUpper = info.iMaxExpt1 || 0;
                    const fsxl = info.iExptSki2 || 0;
                    const fsxlUpper = info.iMaxExpt2 || 0;
                    const fyxl = info.iExptSki3 || 0;
                    const fyxlUpper = info.iMaxExpt3 || 0;
                    const kfxl = info.iExptSki4 || 0;
                    const kfxlUpper = info.iMaxExpt4 || 0;
                    // 列表页无法读取乾元丹信息，固定为0
                    const qyd = 0;
                    const gjkzl = info.iBeastSki1 || 0;
                    const fskzl = info.iBeastSki2 || 0;
                    const fykzl = info.iBeastSki3 || 0;
                    const kfkzl = info.iBeastSki4 || 0;
                    const allSkills = info.all_skills || {};
                    const lifeSkills = {};
                    const schoolSkillCandidates = [];
                    for (const [id, level] of Object.entries(allSkills)) {
                        if (LIFE_SKILL_IDS.has(id)) {
                            lifeSkills[LIFE_SKILL_MAP[id]] = level;
                        } else if (level > 100 && parseInt(id) < 200) {
                            schoolSkillCandidates.push({id: parseInt(id), level: level});
                        }
                    }
                    schoolSkillCandidates.sort((a, b) => b.level - a.level);
                    const schoolSkills = [];
                    for (let i = 0; i < 7 && i < schoolSkillCandidates.length; i++) {
                        schoolSkills.push(upperLimit(schoolSkillCandidates[i].level));
                    }
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
            const tab = tabs.find(t => t.active) || tabs[0];
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

    // 批量计算：从已打开的角色详情页读取乾元丹
    if (request.action === "fetchQydFromDetail" && request.detailUrl) {
        const detailUrl = request.detailUrl;
        // 等待详情页加载完成后注入脚本读取乾元丹
        setTimeout(() => {
            chrome.tabs.query({url: detailUrl}, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    chrome.runtime.sendMessage({
                        action: "qydFetched",
                        detailUrl: detailUrl,
                        qyd: 0
                    });
                    return;
                }
                const tabId = tabs[0].id;
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    function: () => {
                        const roleBox = document.getElementById('role_info_box');
                        if (!roleBox) return {qyd: 0, jyCur: 0, jyMax: 0};
                        let qyd = 0;
                        let jyCur = 0;
                        let jyMax = 0;
                        Array.from(roleBox.querySelectorAll('td')).forEach(td => {
                            if (td.textContent.includes('新版乾元丹数量')) {
                                qyd = td.textContent.split('：')[1].trim();
                            }
                            if (td.textContent.includes('月饼粽子机缘')) {
                                let jyStr = td.textContent.split('：')[1].trim();
                                if (jyStr && jyStr.includes('/')) {
                                    let parts = jyStr.split('/');
                                    jyCur = parseInt(parts[0]) || 0;
                                    jyMax = parseInt(parts[1]) || 0;
                                }
                            }
                        });
                        return {qyd, jyCur, jyMax};
                    }
                }, (results) => {
                    let qyd = 0;
                    let jyCur = 0;
                    let jyMax = 0;
                    if (!chrome.runtime.lastError && results && results[0]) {
                        qyd = results[0].result ? results[0].result.qyd : 0;
                        jyCur = results[0].result ? results[0].result.jyCur : 0;
                        jyMax = results[0].result ? results[0].result.jyMax : 0;
                    }
                    chrome.runtime.sendMessage({
                        action: "qydFetched",
                        detailUrl: detailUrl,
                        qyd: qyd,
                        jyCur: jyCur,
                        jyMax: jyMax
                    });
                });
            });
        }, 3000);
    }

    // ========== 口袋版：单个计算数据抓取 ==========
    if (request.action === "fetchPocketData") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: async () => {
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

                    // 延迟函数
                    const delay = ms => new Promise(r => setTimeout(r, ms));

                    // 提取价格
                    const priceEl = document.querySelector('.price_OskaR, .price');
                    if (priceEl) {
                        data.price = parseFloat(priceEl.textContent.replace(/[^\d.]/g, '')) || 0;
                    }

                    // 提取门派（从角色信息区域）
                    const roleInfo = document.querySelector('.roleInfo_u6xHT, .title_q5uZ9');
                    if (roleInfo) {
                        const schoolEl = roleInfo.querySelector('.txt');
                        if (schoolEl) {
                            data.school = schoolEl.textContent.trim();
                        }
                    }

                    // 从当前页面提取基础数据（乾元丹、机缘在所有tab都可见）
                    const bodyText = document.body.innerText;

                    // 乾元丹数量
                    const qydMatch = bodyText.match(/新版乾元丹数量[：:]\s*(\d+)/);
                    if (qydMatch) data.qyd = parseInt(qydMatch[1]) || 0;

                    // 月饼粽子机缘
                    const jyMatch = bodyText.match(/月饼粽子机缘[：:]\s*(\d+)\s*\/\s*(\d+)/);
                    if (jyMatch) {
                        data.jyCur = parseInt(jyMatch[1]) || 0;
                        data.jyMax = parseInt(jyMatch[2]) || 0;
                    }

                    // 找到所有tab
                    const tabItems = document.querySelectorAll('.hair-tab .tabs .item');
                    let xiulianTab = null;
                    let skillTab = null;
                    tabItems.forEach(tab => {
                        const text = tab.textContent.trim();
                        if (text.includes('人物') || text.includes('修炼')) {
                            xiulianTab = tab;
                        }
                        if (text === '技能') {
                            skillTab = tab;
                        }
                    });

                    // 点击"人物/修炼"tab并读取修炼数据
                    if (xiulianTab) {
                        // 记录点击前的内容，用于检测变化
                        const beforeText = document.body.innerText;
                        xiulianTab.click();
                        // 等待tab切换和内容加载（最多等待2秒）
                        for (let i = 0; i < 20; i++) {
                            await delay(100);
                            const currentText = document.body.innerText;
                            // 检测内容是否包含修炼数据
                            if (currentText.includes('攻击修炼') || currentText.includes('防御修炼')) {
                                break;
                            }
                        }
                        // 额外等待确保数据完全加载
                        await delay(200);

                        // 读取修炼数据
                        const xiulianText = document.body.innerText;

                        // 人物修炼（前一列）
                        const gjxlMatch = xiulianText.match(/攻击修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (gjxlMatch) {
                            data.gjxl = parseInt(gjxlMatch[1]) || 0;
                            data.gjxlUpper = parseInt(gjxlMatch[2]) || 0;
                        }
                        const fyxlMatch = xiulianText.match(/防御修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (fyxlMatch) {
                            data.fyxl = parseInt(fyxlMatch[1]) || 0;
                            data.fyxlUpper = parseInt(fyxlMatch[2]) || 0;
                        }
                        const fsxlMatch = xiulianText.match(/法术修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (fsxlMatch) {
                            data.fsxl = parseInt(fsxlMatch[1]) || 0;
                            data.fsxlUpper = parseInt(fsxlMatch[2]) || 0;
                        }
                        const kfxlMatch = xiulianText.match(/抗法修炼[：:]\s*(\d+)(?:\/(\d+))?/);
                        if (kfxlMatch) {
                            data.kfxl = parseInt(kfxlMatch[1]) || 0;
                            data.kfxlUpper = parseInt(kfxlMatch[2]) || 0;
                        }

                        // 宠物修炼（后一列）
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
                        // 等待tab切换和内容加载（最多等待2秒）
                        for (let i = 0; i < 20; i++) {
                            await delay(100);
                            const currentText = document.body.innerText;
                            // 检测内容是否包含技能数据
                            if (currentText.includes('师门技能') || currentText.includes('强身术') || currentText.includes('冥想')) {
                                break;
                            }
                        }
                        // 额外等待确保数据完全加载
                        await delay(200);

                        // 读取技能数据
                        const skillText = document.body.innerText;

                        // 师门技能提取（查找7个技能等级）
                        const skillPattern = /师门技能[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)[^\d]*(\d+)/;
                        const skillMatch = skillText.match(skillPattern);
                        if (skillMatch) {
                            for (let i = 0; i < 7; i++) {
                                data['skill_' + i] = Math.min(parseInt(skillMatch[i + 1]) || 0, 180);
                            }
                        }

                        // 生活技能提取（支持多种分隔符格式）
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
                            if (match) {
                                data[key] = parseInt(match[1]) || 0;
                            }
                        }
                    }

                    return data;
                }
            }, (results) => {
                chrome.runtime.sendMessage({
                    action: "updateData",
                    data: results[0].result
                });
            });
        });
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
            // 1. 先获取列表中所有角色的基本信息
            const listItems = await execScript(tabId, {function: () => {
                const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                return Array.from(items).map((item, index) => {
                    const name = item.querySelector('.name')?.textContent?.trim() || '';
                    const levelText = item.querySelector('.level')?.textContent?.trim() || '';
                    const priceText = item.querySelector('.price')?.textContent?.trim() || '';
                    const server = item.querySelector('.server')?.textContent?.trim() || '';
                    const attr = item.querySelector('.attr')?.textContent?.trim() || '';
                    return { index, name, levelText, priceText, server, attr };
                });
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

                // 点击列表项进入详情页
                const clickResult = await execScript(tabId, {function: (idx) => {
                    const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                    if (!items || items.length === 0) return false;
                    const item = items[idx];
                    if (!item) return false;
                    // 点击列表项
                    item.click();
                    return true;
                }, args: [i]});

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

                // 从详情页提取数据
                const detailData = await execScript(tabId, {function: async () => {
                    const data = {
                        qyd: 0, jyCur: 0, jyMax: 0,
                        gjxl: 0, gjxlUpper: 0, fsxl: 0, fsxlUpper: 0,
                        fyxl: 0, fyxlUpper: 0, kfxl: 0, kfxlUpper: 0,
                        gjkzl: 0, fskzl: 0, fykzl: 0, kfkzl: 0,
                        skill_0: 0, skill_1: 0, skill_2: 0, skill_3: 0,
                        skill_4: 0, skill_5: 0, skill_6: 0,
                        qs: 0, mx: 0, cWeapon: 0, cook: 0,
                        zy: 0, ys: 0, js: 0, qj: 0, strong: 0, speed: 0
                    };

                    const delay = ms => new Promise(r => setTimeout(r, ms));

                    // 从当前页面提取基础数据
                    const bodyText = document.body.innerText;
                    const qydMatch = bodyText.match(/新版乾元丹数量[：:]\s*(\d+)/);
                    if (qydMatch) data.qyd = parseInt(qydMatch[1]) || 0;
                    const jyMatch = bodyText.match(/月饼粽子机缘[：:]\s*(\d+)\s*\/\s*(\d+)/);
                    if (jyMatch) {
                        data.jyCur = parseInt(jyMatch[1]) || 0;
                        data.jyMax = parseInt(jyMatch[2]) || 0;
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

                    // 点击"人物/修炼"tab并读取修炼数据
                    if (xiulianTab) {
                        xiulianTab.click();
                        // 等待tab切换和内容加载（最多等待2秒）
                        for (let i = 0; i < 20; i++) {
                            await delay(100);
                            const currentText = document.body.innerText;
                            if (currentText.includes('攻击修炼') || currentText.includes('防御修炼')) {
                                break;
                            }
                        }
                        await delay(200);

                        const xiulianText = document.body.innerText;
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
                        // 等待tab切换和内容加载（最多等待2秒）
                        for (let i = 0; i < 20; i++) {
                            await delay(100);
                            const currentText = document.body.innerText;
                            if (currentText.includes('师门技能') || currentText.includes('强身术') || currentText.includes('冥想')) {
                                break;
                            }
                        }
                        await delay(200);

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
                    // 将当前处理的角色滚动到视口中间
                    item.scrollIntoView({block: 'center', behavior: 'smooth'});
                }, args: [i]});

                // 组合数据
                const levelMatch = item.levelText.match(/(\d+)/);
                const level = levelMatch ? parseInt(levelMatch[1]) : 0;
                const price = parseFloat(item.priceText.replace(/[^\d.]/g, '')) || 0;

                // 解析门派（从attr中提取，如"化圣九 成就:3575 总修:76 总宠修:93"）
                const attrParts = item.attr.split(/\s+/);
                const school = attrParts[0] || '';

                const charData = {
                    ordersn: `pocket_${i}_${Date.now()}`,
                    name: item.name,
                    level,
                    school,
                    schoolCode: 0,
                    server: item.server,
                    price,
                    detailUrl: '',
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

        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "未找到口袋版页面"
                });
                return;
            }
            const tab = tabs.find(t => t.active) || tabs[0];
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
                qyd: 0, jyCur: 0, jyMax: 0,
                gjxl: 0, gjxlUpper: 0, fsxl: 0, fsxlUpper: 0,
                fyxl: 0, fyxlUpper: 0, kfxl: 0, kfxlUpper: 0,
                gjkzl: 0, fskzl: 0, fykzl: 0, kfkzl: 0,
                skill_0: 0, skill_1: 0, skill_2: 0, skill_3: 0,
                skill_4: 0, skill_5: 0, skill_6: 0,
                qs: 0, mx: 0, cWeapon: 0, cook: 0,
                zy: 0, ys: 0, js: 0, qj: 0, strong: 0, speed: 0
            };

            const delay = ms => new Promise(r => setTimeout(r, ms));

            // 从当前页面提取基础数据
            const bodyText = document.body.innerText;
            const qydMatch = bodyText.match(/新版乾元丹数量[：:]\s*(\d+)/);
            if (qydMatch) data.qyd = parseInt(qydMatch[1]) || 0;
            const jyMatch = bodyText.match(/月饼粽子机缘[：:]\s*(\d+)\s*\/\s*(\d+)/);
            if (jyMatch) {
                data.jyCur = parseInt(jyMatch[1]) || 0;
                data.jyMax = parseInt(jyMatch[2]) || 0;
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

            // 点击"人物/修炼"tab并读取修炼数据
            if (xiulianTab) {
                xiulianTab.click();
                // 等待tab切换和内容加载（最多等待2秒）
                for (let i = 0; i < 20; i++) {
                    await delay(100);
                    const currentText = document.body.innerText;
                    if (currentText.includes('攻击修炼') || currentText.includes('防御修炼')) {
                        break;
                    }
                }
                await delay(200);

                const xiulianText = document.body.innerText;
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
                // 等待tab切换和内容加载（最多等待2秒）
                for (let i = 0; i < 20; i++) {
                    await delay(100);
                    const currentText = document.body.innerText;
                    if (currentText.includes('师门技能') || currentText.includes('强身术') || currentText.includes('冥想')) {
                        break;
                    }
                }
                await delay(200);

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

        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    error: "未找到口袋版页面"
                });
                return;
            }
            const tab = tabs.find(t => t.active) || tabs[0];
            const tabId = tab.id;

            try {
                // 口袋版使用无限滚动，需要滚动加载更多
                // 先获取当前可见列表项数量
                let processedCount = 0;
                let allResults = [];
                let consecutiveFailures = 0;
                const MAX_FAILURES = 3;

                chrome.runtime.sendMessage({
                    action: "autoBatchProgress",
                    currentPage: 0,
                    totalPages: totalItems,
                    status: "start"
                });

                while (processedCount < totalItems && consecutiveFailures < MAX_FAILURES) {
                    // 获取当前列表项
                    const listItems = await execScript(tabId, {function: () => {
                        const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                        return Array.from(items).map((item, index) => {
                            const name = item.querySelector('.name')?.textContent?.trim() || '';
                            const levelText = item.querySelector('.level')?.textContent?.trim() || '';
                            const priceText = item.querySelector('.price')?.textContent?.trim() || '';
                            const server = item.querySelector('.server')?.textContent?.trim() || '';
                            const attr = item.querySelector('.attr')?.textContent?.trim() || '';
                            return { index, name, levelText, priceText, server, attr };
                        });
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

                        // 检查是否有新数据加载
                        const newCount = await execScript(tabId, {function: () => {
                            return document.querySelectorAll('.list-item-link.product-item.js_product_item').length;
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
                        const itemIdx = startIndex + i;
                        const item = listItems[itemIdx];

                        chrome.runtime.sendMessage({
                            action: "autoBatchProgress",
                            currentPage: processedCount + 1,
                            totalPages: totalItems,
                            status: "extracting"
                        });

                        // 点击列表项进入详情页
                        const clickResult = await execScript(tabId, {function: (idx) => {
                            const items = document.querySelectorAll('.list-item-link.product-item.js_product_item');
                            if (!items || items.length === 0) return false;
                            const item = items[idx];
                            if (!item) return false;
                            // 点击列表项
                            item.click();
                            return true;
                        }, args: [itemIdx]});

                        if (!clickResult) {
                            processedCount++;
                            continue;
                        }

                        // 等待详情页加载
                        await delay(2000);

                        // 提取详情数据
                        const detailData = await execScript(tabId, {function: extractDetailDataFromPage});

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
                            // 将当前处理的角色滚动到视口中间
                            item.scrollIntoView({block: 'center', behavior: 'smooth'});
                        }, args: [itemIdx]});

                        // 组合数据
                        const levelMatch = item.levelText.match(/(\d+)/);
                        const level = levelMatch ? parseInt(levelMatch[1]) : 0;
                        const price = parseFloat(item.priceText.replace(/[^\d.]/g, '')) || 0;
                        const attrParts = item.attr.split(/\s+/);
                        const school = attrParts[0] || '';

                        allResults.push({
                            ordersn: `pocket_${itemIdx}_${Date.now()}`,
                            name: item.name,
                            level,
                            school,
                            schoolCode: 0,
                            server: item.server,
                            price,
                            detailUrl: '',
                            ...(detailData || {})
                        });

                        processedCount++;

                        // 发送进度
                        chrome.runtime.sendMessage({
                            action: "autoBatchProgress",
                            currentPage: processedCount,
                            totalPages: totalItems,
                            results: [allResults[allResults.length - 1]],
                            status: "pageDone"
                        });
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



