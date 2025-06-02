chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent(w => {
        if (w) {
            chrome.sidePanel.open({windowId: w.id});
            loadJSON();
        } else {
            console.error("无法获取当前窗口");
        }
    });
});

// 确保侧边栏可用
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setOptions({
        enabled: true
    });
});

let globalCostData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getCostData") {
        sendResponse(globalCostData);
    }
});

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchData") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {

            // 依赖加载后再执行主逻辑
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: (injectedData) => {

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
                    const infoBox = document.getElementById('info_panel');
                    if (!infoBox) {
                        console.warn('未找到info_panel元素');
                        //    尝试使用其他方式获取
                        Array.from(document.querySelectorAll('.price .p10000')).forEach(span => {
                            if (span.textContent.includes('（元）')) {
                                data.price = span.textContent.replace(/\s/g, '').split('￥')[1].split("（元）")[0].trim();
                            }
                        })
                    } else {
                        Array.from(infoBox.querySelectorAll('li')).forEach(li => {
                            if (li.textContent.includes('价格')) {
                                data.price = li.textContent.replace(/\s/g, '').split('价格：￥')[1].split("（元）")[0].trim();
                            } else if (li.textContent.includes('类型：')) {
                                data.school = li.textContent.replace(/\s/g, '').split('：')[1].trim();
                            }
                        })
                    }

                    const roleBox = document.getElementById('role_info_box');
                    if (!roleBox) {
                        throw new Error('未找到role_info_box元素,' + document.textContent);
                    }
                    Array.from(roleBox.querySelectorAll('td')).forEach(td => {
                        if (td.textContent.includes('新版乾元丹数量')) {
                            data.qyd = td.textContent.split('：')[1].trim();
                            data.qydCost = injectedData["qianyuandan"][data.qyd]["totalcost"]
                        }
                    });

                    // 防御修炼数据提取（兼容方案）
                    Array.from(roleBox.querySelectorAll('th')).forEach(th => {
                        if (th.textContent.includes('攻击修炼')) {
                            const valueCell = th.nextElementSibling;
                            const gjxlAndupper = valueCell.textContent.trim();
                            data.gjxl = gjxlAndupper.split("/")[0]
                            const gjxlUpper = gjxlAndupper.split("/")[1]
                            data.gjxlCost = injectedData["gongxiu"][data.gjxl]["totalcost"]
                        }
                        if (th.textContent.includes('防御修炼')) {
                            const valueCell = th.nextElementSibling;
                            const fyxlAndupper = valueCell.textContent.trim();
                            data.fyxl = fyxlAndupper.split("/")[0]
                            const gjxlUpper = fyxlAndupper.split("/")[1]
                            data.fyxlCost = injectedData["fangxiu"][data.fyxl]["totalcost"]
                        }
                        if (th.textContent.includes('法术修炼')) {
                            const valueCell = th.nextElementSibling
                            const fsxlAndupper = valueCell.textContent.trim();
                            data.fsxl = fsxlAndupper.split("/")[0]
                            const fsxlUpper = fsxlAndupper.split("/")[1]
                            data.fsxlCost = injectedData["gongxiu"][data.fsxl]["totalcost"]
                        }
                        if (th.textContent.includes('抗法修炼')) {
                            const valueCell = th.nextElementSibling;
                            const kfxlAndupper = valueCell.textContent.trim();
                            data.kfxl = kfxlAndupper.split("/")[0]
                            const kfxlUpper = kfxlAndupper.split("/")[1]
                            data.kfxlCost = injectedData["fangxiu"][data.kfxl]["totalcost"]
                        }
                        if (th.textContent.includes('攻击控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.gjkzl = valueCell.textContent.trim();
                            data.guoziSize1 = injectedData["bbxiu"][data.gjkzl]["guozi_size"]
                        }
                        if (th.textContent.includes('防御控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.fykzl = valueCell.textContent.trim();
                            data.guoziSize2 = injectedData["bbxiu"][data.fykzl]["guozi_size"]
                        }
                        if (th.textContent.includes('法术控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.fskzl = valueCell.textContent.trim();
                            data.guoziSize3 = injectedData["bbxiu"][data.fskzl]["guozi_size"]
                        }
                        if (th.textContent.includes('抗法控制力')) {
                            const valueCell = th.nextElementSibling;
                            data.kfkzl = valueCell.textContent.trim();
                            data.guoziSize4 = injectedData["bbxiu"][data.kfkzl]["guozi_size"]
                        }

                    });

                    const button2 = document.getElementById('role_skill');
                    if (button2) button2.click();

                    const skill_level = Array.from(document.getElementById('role_info_box').querySelector('#school_skill_lists').getElementsByTagName('p'))
                        .map(p => p.textContent);
                    if (skill_level.length === 7) {
                        data.skill_1 = upper_limit_school_skill(skill_level[0].trim());
                        data.skill_2 = upper_limit_school_skill(skill_level[1].trim());
                        data.skill_3 = upper_limit_school_skill(skill_level[2].trim());
                        data.skill_4 = upper_limit_school_skill(skill_level[3].trim());
                        data.skill_5 = upper_limit_school_skill(skill_level[4].trim());
                        data.skill_6 = upper_limit_school_skill(skill_level[5].trim());
                        data.skill_7 = upper_limit_school_skill(skill_level[6].trim());

                        data.skill_1_cost = injectedData["school_skill"][data.skill_1]["totalcost"]
                        data.skill_2_cost = injectedData["school_skill"][data.skill_2]["totalcost"]
                        data.skill_3_cost = injectedData["school_skill"][data.skill_3]["totalcost"]
                        data.skill_4_cost = injectedData["school_skill"][data.skill_4]["totalcost"]
                        data.skill_5_cost = injectedData["school_skill"][data.skill_5]["totalcost"]
                        data.skill_6_cost = injectedData["school_skill"][data.skill_6]["totalcost"]
                        data.skill_7_cost = injectedData["school_skill"][data.skill_7]["totalcost"]
                    }

                    const h5Elements = document.getElementById('role_info_box').querySelector('#life_skill_lists').querySelectorAll('h5');
                    h5Elements.forEach(h5 => {
                        // 获取前面的p元素内容
                        const pValue = h5.previousElementSibling.textContent;
                        const h5Value = h5.textContent;

                        if (h5Value.trim() === "强壮") {
                            data.strong = pValue.trim();
                            data.strongCost = injectedData["qiangzhuang"][data.strong]["totalcost"];
                        } else if (h5Value.trim() === "神速") {
                            data.speed = pValue.trim();
                            data.speedCost = injectedData["qiangzhuang"][data.speed]["totalcost"];
                        } else if (h5Value.trim() === "强身术") {
                            data.qs = pValue.trim();
                            data.qsCost = injectedData["life_skill"][data.qs]["totalcost"];
                        }else if (h5Value.trim() === "冥想") {
                            data.mx = pValue.trim();
                            data.mxCost = injectedData["life_skill"][data.mx]["totalcost"];
                        }
                    });

                    if (button) button.click();
                    return data;
                },
                args: [globalCostData] // 将数据作为参数传入
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
});



