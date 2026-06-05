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

    // 批量计算：从列表页提取所有角色数据
    if (request.action === "batchFetchData") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: () => {
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

                            // 找到对应的表格行
                            const link = document.querySelector('a[data_game_ordersn="' + ordersn + '"]');
                            if (!link) return;
                            const row = link.closest('tr');
                            if (!row) return;

                            // 价格
                            const priceSpan = row.querySelector('span.p1000, span.p10000, span.p100000, span.p1000000');
                            let price = 0;
                            if (priceSpan) {
                                const priceText = priceSpan.textContent.replace(/[^\d.]/g, '');
                                price = parseFloat(priceText) || 0;
                            }

                            // 门派名
                            const schoolSpan = row.querySelector('span.vertical-middle');
                            const schoolName = schoolSpan ? schoolSpan.textContent.trim() : (SCHOOL_NAMES[info.iSchool] || '未知');

                            // 详情页链接
                            const detailUrl = link.href || '';

                            // 修炼数据
                            const gjxl = info.iExptSki1 || 0;
                            const gjxlUpper = info.iMaxExpt1 || 0;
                            const fsxl = info.iExptSki2 || 0;
                            const fsxlUpper = info.iMaxExpt2 || 0;
                            const fyxl = info.iExptSki3 || 0;
                            const fyxlUpper = info.iMaxExpt3 || 0;
                            const kfxl = info.iExptSki4 || 0;
                            const kfxlUpper = info.iMaxExpt4 || 0;
                            const qyd = info.iExptSki5 || 0;

                            // 宠修
                            const gjkzl = info.iBeastSki1 || 0;
                            const fskzl = info.iBeastSki2 || 0;
                            const fykzl = info.iBeastSki3 || 0;
                            const kfkzl = info.iBeastSki4 || 0;

                            // 从 all_skills 中提取技能
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

                            // 取等级最高的7个作为师门技能
                            schoolSkillCandidates.sort((a, b) => b.level - a.level);
                            const schoolSkills = [];
                            for (let i = 0; i < 7 && i < schoolSkillCandidates.length; i++) {
                                schoolSkills.push(upperLimit(schoolSkillCandidates[i].level));
                            }
                            while (schoolSkills.length < 7) schoolSkills.push(0);

                            results.push({
                                ordersn: ordersn,
                                name: info.cName || '',
                                level: info.iGrade || 0,
                                school: schoolName,
                                schoolCode: info.iSchool || 0,
                                price: price,
                                detailUrl: detailUrl,
                                qyd: qyd,
                                gjxl: gjxl, gjxlUpper: gjxlUpper,
                                fsxl: fsxl, fsxlUpper: fsxlUpper,
                                fyxl: fyxl, fyxlUpper: fyxlUpper,
                                kfxl: kfxl, kfxlUpper: kfxlUpper,
                                gjkzl: gjkzl, fskzl: fskzl, fykzl: fykzl, kfkzl: kfkzl,
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
                            console.warn('批量解析角色数据失败:', e);
                        }
                    });

                    return results;
                }
            }, (injectionResults) => {
                if (chrome.runtime.lastError || !injectionResults || !injectionResults[0]) {
                    chrome.runtime.sendMessage({
                        action: "batchUpdateData",
                        error: "页面数据提取失败，请确保当前页面是角色列表页"
                    });
                    return;
                }
                const results = injectionResults[0].result;
                if (!results || results.length === 0) {
                    chrome.runtime.sendMessage({
                        action: "batchUpdateData",
                        error: "当前页面未找到角色数据"
                    });
                    return;
                }
                chrome.runtime.sendMessage({
                    action: "batchUpdateData",
                    results: results
                });
            });
        });
        return true;
    }
});



