let globalCostData = null;

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

document.addEventListener('DOMContentLoaded', function () {

    globalCostData = loadJSON();

    const find_data = document.getElementById('find_data');
    const xiulian_data = document.getElementById('xiulian_data');
    const school_skill_data = document.getElementById('school_skill_data');
    const life_skill_data = document.getElementById('life_skill_data');
    const calculate = document.getElementById('calculate');
    const calculate_data = document.getElementById('calculate_data');
    const guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);


    function setCost(element, item_id, type, level) {
        console.log(item_id, " type ", type, " level ", level)
        if (type === "bbxiu") {
            let size = globalCostData["bbxiu"][level.toString()]["guozi_size"]
            const cost = parseFloat(size) * guoziPrice
            let costId = item_id + "_cost"
            element.querySelector(`#${costId}`).value = cost || 0;
        } else {
            let cost = globalCostData[type][level.toString()]["totalcost"]
            let costId = item_id + "_cost"
            element.querySelector(`#${costId}`).value = cost || 0;
        }

    }


    function addItem(element, item_id, total_cost) {
        const checkbox = element.querySelector(`#${item_id}`).querySelector('.data-item .item-select')
        if (checkbox.checked) {
            let costId = item_id + "_cost"
            return total_cost + parseFloat(element.querySelector(`#${costId}`).value)
        } else {
            return total_cost;
        }

    }


    function calculator(priceOnWeb) {
        console.log(priceOnWeb)
        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        if (!yxbPrice) {
            alert("先输入游戏币价格比例，如0.086")
        } else {
            let total_cost = 0;
            let level = 0;
            let item_id = "";
            let type = "qianyuandan";

            item_id = "qyd";
            level = xiulian_data.querySelector(`#${item_id}`+'_value').value;
            setCost(xiulian_data, item_id, type, level)
            total_cost = addItem(xiulian_data, item_id, total_cost);

            type = "gongxiu";
            item_id = "gjxl";
            level = xiulian_data.querySelector('#gjxl_value').value;
            setCost(xiulian_data, item_id, type, level)
            total_cost = addItem(xiulian_data, item_id, total_cost);

            item_id = "fsxl";
            level = xiulian_data.querySelector('#fsxl_value').value;
            total_cost = addItem(xiulian_data, item_id, total_cost);
            setCost(xiulian_data, item_id, type, level)

            type = "fangxiu";
            item_id = "fyxl";
            level = xiulian_data.querySelector('#fyxl_value').value;
            total_cost = addItem(xiulian_data, item_id, total_cost);
            setCost(xiulian_data, item_id, type, level)

            item_id = "kfxl";
            level = xiulian_data.querySelector('#kfxl_value').value;
            total_cost = addItem(xiulian_data, item_id, total_cost);
            setCost(xiulian_data, item_id, type, level)

            type = "bbxiu";
            item_id = "gjkzl";
            level = xiulian_data.querySelector('#gjkzl_value').value;
            total_cost = addItem(xiulian_data, item_id, total_cost);
            setCost(xiulian_data, item_id, type, level)

            item_id = "fskzl";
            level = xiulian_data.querySelector('#fskzl_value').value;
            total_cost = addItem(xiulian_data, item_id, total_cost);
            setCost(xiulian_data, item_id, type, level)

            item_id = "fykzl";
            level = xiulian_data.querySelector('#fykzl_value').value;
            total_cost = addItem(xiulian_data, item_id, total_cost);
            setCost(xiulian_data, item_id, type, level)

            item_id = "kfkzl";
            level = xiulian_data.querySelector('#kfkzl_value').value;
            total_cost = addItem(xiulian_data, item_id, total_cost);
            setCost(xiulian_data, item_id, type, level)

            type = "school_skill";
            item_id = "skill_0";
            level = school_skill_data.querySelector('#skill_0_value').value;
            total_cost = addItem(school_skill_data, item_id, total_cost);
            setCost(school_skill_data, item_id, type, level)

            item_id = "skill_1";
            level = school_skill_data.querySelector('#skill_1_value').value;
            total_cost = addItem(school_skill_data, item_id, total_cost);
            setCost(school_skill_data, item_id, type, level)

            item_id = "skill_2";
            level = school_skill_data.querySelector('#skill_2_value').value;
            total_cost = addItem(school_skill_data, item_id, total_cost);
            setCost(school_skill_data, item_id, type, level)

            item_id = "skill_3";
            level = school_skill_data.querySelector('#skill_3_value').value;
            total_cost = addItem(school_skill_data, item_id, total_cost);
            setCost(school_skill_data, item_id, type, level)

            item_id = "skill_4";
            level = school_skill_data.querySelector('#skill_4_value').value;
            total_cost = addItem(school_skill_data, item_id, total_cost);
            setCost(school_skill_data, item_id, type, level)

            item_id = "skill_5";
            level = school_skill_data.querySelector('#skill_5_value').value;
            total_cost = addItem(school_skill_data, item_id, total_cost);
            setCost(school_skill_data, item_id, type, level)

            item_id = "skill_6";
            level = school_skill_data.querySelector('#skill_6_value').value;
            total_cost = addItem(school_skill_data, item_id, total_cost);
            setCost(school_skill_data, item_id, type, level)


            type = "qiangzhuang";
            item_id = "speed";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            item_id = "strong";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            type = "life_skill";
            item_id = "qs";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            item_id = "mx";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            item_id = "cWeapon";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            item_id = "cook";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            item_id = "ys";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            item_id = "js";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)

            item_id = "qj";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)


            item_id = "zy";
            level = life_skill_data.querySelector(`#${item_id}`+'_value').value;
            total_cost = addItem(life_skill_data, item_id, total_cost);
            setCost(life_skill_data, item_id, type, level)


            let priceByCal = parseInt(parseFloat(total_cost) * yxbPrice || 0)
            calculate_data.querySelector('#totalCost_value').textContent = total_cost || 0
            calculate_data.querySelector('#totalCost_rmb').textContent = priceByCal

            if (priceOnWeb) {
                calculate_data.querySelector('#discount_value').textContent = parseFloat(priceOnWeb / priceByCal).toFixed(3);
            } else {
                calculate_data.querySelector('#discount_value').textContent = "未知"
            }
        }
    }


    let priceOnWeb = {}

    find_data.addEventListener('click', function () {

        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);

        if (!yxbPrice || !guoziPrice) {
            alert("先输入游戏币价格和修炼果价格")
        } else {
            chrome.runtime.sendMessage({action: "fetchData"});
            chrome.runtime.onMessage.addListener((request) => {

                if (request.action === "updateData") {
                    //乾元丹
                    console.log("接收到的数据：", request.data)
                    let level = request.data.qyd || 0;
                    xiulian_data.querySelector('#qyd_value').value = level;

                    //攻修
                    level = request.data.gjxl || 0;
                    xiulian_data.querySelector('#gjxl_value').value = level;

                    //防修
                    level = request.data.fyxl || 0;
                    xiulian_data.querySelector('#fyxl_value').value = level;

                    //法修
                    level = request.data.fsxl || 0;
                    xiulian_data.querySelector('#fsxl_value').value = level;

                    //法抗
                    level = request.data.kfxl || 0;
                    xiulian_data.querySelector('#kfxl_value').value = level;

                    //BB攻修
                    level = request.data.gjkzl || 0;
                    xiulian_data.querySelector('#gjkzl_value').value = level;

                    //BB防修
                    level = request.data.fykzl || 0;
                    xiulian_data.querySelector('#fykzl_value').value = level;

                    //BB法修
                    level = request.data.fskzl || 0;
                    xiulian_data.querySelector('#fskzl_value').value = level;

                    //BB法抗
                    level = request.data.kfkzl || 0;
                    xiulian_data.querySelector('#kfkzl_value').value = level;



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



                    priceOnWeb = parseFloat(request.data.price);
                    calculator(priceOnWeb);
                }
            });

        }

    });


    calculate.addEventListener('click', function () {
        calculator(priceOnWeb);
    });

});



