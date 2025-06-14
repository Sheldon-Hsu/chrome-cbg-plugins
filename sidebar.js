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
    const bbxiu_data = document.getElementById('bbxiu_data');
    const school_skill_data = document.getElementById('school_skill_data');
    const life_skill_data = document.getElementById('life_skill_data');
    const calculate = document.getElementById('calculate');
    const calculate_data = document.getElementById('calculate_data');
    let guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);


    function setCost(element, item_id, type, level, ratio = 1) {

        if (!level) level = 0;
        if (type === "bbxiu") {
            try {
                let size = globalCostData[type][level.toString()]["guozi_size"]
                const cost = parseFloat(size) * guoziPrice;
                let costId = item_id + "_cost"
                let ratioCostId = item_id + "_ratio_cost"
                element.querySelector(`#${costId}`).value = cost || 0;
                element.querySelector(`#${ratioCostId}`).value = cost * ratio || 0;
            } catch (err) {
                alert("等级[" + level + "]超过限制，请修正");
            }
        } else {
            try {
                let cost = globalCostData[type][level.toString()]["totalcost"]
                let costId = item_id + "_cost"
                let ratioCostId = item_id + "_ratio_cost"
                element.querySelector(`#${costId}`).value = cost || 0;
                element.querySelector(`#${ratioCostId}`).value = cost * ratio || 0;
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
        if (!yxbPrice) {
            alert("先输入游戏币价格比例，如0.086");
        } else {
            let total_cost = {origin: 0, discount: 0};
            let level = 0;
            let item_id = "";
            let type = "qianyuandan";
            let ratio = 1;


            ratio = document.getElementById('xiulian_ratio').value

            item_id = "qyd";
            level = xiulian_data.querySelector(`#${item_id}` + '_value').value;
            setCost(xiulian_data, item_id, type, level, ratio);
            addItem(xiulian_data, item_id, total_cost);

            type = "gongxiu";
            item_id = "gjxl";
            level = xiulian_data.querySelector('#gjxl_value').value;
            setCost(xiulian_data, item_id, type, level, ratio);
            addItem(xiulian_data, item_id, total_cost);


            item_id = "fsxl";
            level = xiulian_data.querySelector('#fsxl_value').value;
            setCost(xiulian_data, item_id, type, level, ratio);
            addItem(xiulian_data, item_id, total_cost);


            type = "fangxiu";
            item_id = "fyxl";
            level = xiulian_data.querySelector('#fyxl_value').value;
            setCost(xiulian_data, item_id, type, level, ratio);
            addItem(xiulian_data, item_id, total_cost);

            item_id = "kfxl";
            level = xiulian_data.querySelector('#kfxl_value').value;
            setCost(xiulian_data, item_id, type, level, ratio);
            addItem(xiulian_data, item_id, total_cost);

            ratio = document.getElementById('bbxiu_ratio').value
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

            ratio = document.getElementById('school_skill_ratio').value
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


            ratio = document.getElementById('life_skill_data_ratio').value
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
            calculate_data.querySelector('#totalCost_value').textContent = total_cost.origin || '0'
            calculate_data.querySelector('#totalCost_ratio_value').textContent = total_cost.discount || '0'
            calculate_data.querySelector('#totalCost_rmb').textContent = priceByCal
            calculate_data.querySelector('#totalCost_ratio_rmb').textContent = discountPriceByCal

            if (priceOnWeb) {
                calculate_data.querySelector('#discount_value').textContent = (parseFloat(priceOnWeb) / priceByCal * 10).toFixed(2);
            } else {
                calculate_data.querySelector('#discount_value').textContent = "未知"
            }
        }
    }


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

                    calculate_data.querySelector('#price_value').value = parseFloat(request.data.price);

                    calculator();
                }
            });

        }

    });


    calculate.addEventListener('click', function () {
        calculator();
    });

});



