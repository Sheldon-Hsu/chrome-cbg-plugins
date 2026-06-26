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
        return true;
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
        return true; // 保持消息通道开放:ml-citation{ref="5" data="citationList"}
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

    // 跳转到下一页：模拟点击页面上的"下一页"链接
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
                    // 查找分页区域中的"下一页"链接
                    const pagerEl = document.getElementById('pager_templ');
                    if (!pagerEl) return {success: false, error: "未找到分页组件"};
                    const links = pagerEl.querySelectorAll('a');
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

        // 获取当前页码和总页数
        function getPageInfo() {
            if (typeof pager === 'object') {
                return {curPage: pager.cur_page || 1, totalPage: pager.num_end || 1};
            }
            return {curPage: 1, totalPage: 1};
        }

        // 跳转到下一页：模拟点击页面上的"下一页"链接
        function gotoNextPage() {
            const pagerEl = document.getElementById('pager_templ');
            if (!pagerEl) return {success: false, error: "未找到分页组件"};
            const links = pagerEl.querySelectorAll('a');
            for (const link of links) {
                if (link.textContent.trim() === '下一页') {
                    link.click();
                    return {success: true, page: (typeof pager !== 'undefined' ? pager.cur_page : 0) + 1};
                }
            }
            return {success: false, error: "未找到下一页链接"};
        }

        // 等待页面翻页完成（goto 可能导致页面重新加载）
        // 使用 chrome.webNavigation 检测页面加载完成
        function waitForNavComplete(tabId, timeout) {
            return new Promise((resolve) => {
                let resolved = false;
                function onDone() {
                    if (resolved) return;
                    resolved = true;
                    chrome.webNavigation.onCompleted.removeListener(onDone);
                    resolve(true);
                }
                chrome.webNavigation.onCompleted.addListener(onDone, {tabId: tabId});
                // 超时兜底
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        chrome.webNavigation.onCompleted.removeListener(onDone);
                        resolve(false);
                    }
                }, timeout);
            });
        }

        // 注入脚本检查当前页码是否为目标页码
        function checkPageReady(targetPage) {
            try {
                return typeof pager === 'object'
                    && pager.cur_page === targetPage
                    && document.querySelectorAll('textarea[id^="other_info_"]').length > 0;
            } catch (e) {
                return false;
            }
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
                const actualTotal = Math.min(totalPages, pageInfo.totalPage - pageInfo.curPage + 1);

                for (let i = 0; i < actualTotal; i++) {
                    // 通知前端当前进度
                    chrome.runtime.sendMessage({
                        action: "autoBatchProgress",
                        currentPage: i + 1,
                        totalPages: actualTotal,
                        status: "extracting"
                    });

                    // 滚动到底部触发懒加载，等待加载完成
                    await execScript(tabId, {world: "MAIN", function: scrollToBottom});
                    await delay(1500);

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
                        // 获取当前页码
                        const curPageInfo = await execScript(tabId, {world: "MAIN", function: getPageInfo});
                        const targetPage = curPageInfo.curPage + 1;

                        // 先注册页面加载监听，再触发翻页
                        const navDonePromise = waitForNavComplete(tabId, 15000);

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

                        // 等待页面加载完成
                        const navDone = await navDonePromise;
                        if (!navDone) {
                            // 超时兜底，额外等待
                            await delay(3000);
                        }

                        // 确认页面已加载到目标页码（最多重试 5 次）
                        let ready = false;
                        for (let retry = 0; retry < 5; retry++) {
                            await delay(500);
                            try {
                                ready = await execScript(tabId, {world: "MAIN", function: checkPageReady, args: [targetPage]});
                            } catch (e) {
                                // 页面还在加载
                            }
                            if (ready) break;
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
        return true;
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
                // 滚动到底部触发懒加载，等待加载完成后提取数据
                await execScript(tabId, {world: "MAIN", function: scrollToBottom});
                await delay(1500);

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
        return true;
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
        return true;
    }
});



