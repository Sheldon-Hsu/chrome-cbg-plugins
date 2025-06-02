document.addEventListener('DOMContentLoaded', function () {
    const find_data = document.getElementById('find_data');
    const xiulian_data = document.getElementById('xiulian_data');
    const school_skill_data = document.getElementById('school_skill_data');
    const life_skill_data = document.getElementById('life_skill_data');
    const calculate = document.getElementById('calculate');
    const calculate_data = document.getElementById('calculate_data');


    function calculator(priceOnWeb) {
        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        if (!yxbPrice) {
            alert("先输入游戏币价格比例，如0.086")
        } else {
            let total_cost = parseFloat(xiulian_data.querySelector('#qyd_cost').value) +
                parseFloat(xiulian_data.querySelector('#gjxl_cost').value) +
                parseFloat(xiulian_data.querySelector('#fyxl_cost').value) +
                parseFloat(xiulian_data.querySelector('#fsxl_cost').value) +
                parseFloat(xiulian_data.querySelector('#kfxl_cost').value) +
                parseFloat(xiulian_data.querySelector('#gjkzl_cost').value) +
                parseFloat(xiulian_data.querySelector('#fykzl_cost').value) +
                parseFloat(xiulian_data.querySelector('#fskzl_cost').value) +
                parseFloat(xiulian_data.querySelector('#kfkzl_cost').value) +
                parseFloat(school_skill_data.querySelector('#skill_0_cost').value) +
                parseFloat(school_skill_data.querySelector('#skill_1_cost').value) +
                parseFloat(school_skill_data.querySelector('#skill_2_cost').value) +
                parseFloat(school_skill_data.querySelector('#skill_3_cost').value) +
                parseFloat(school_skill_data.querySelector('#skill_4_cost').value) +
                parseFloat(school_skill_data.querySelector('#skill_5_cost').value) +
                parseFloat(school_skill_data.querySelector('#skill_6_cost').value) +
                parseFloat(life_skill_data.querySelector('#qs_cost').value) +
                parseFloat(life_skill_data.querySelector('#speed_cost').value) +
                parseFloat(life_skill_data.querySelector('#strong_cost').value);


            let priceByCal = parseInt(parseFloat(total_cost) * yxbPrice || 0)
            calculate_data.querySelector('#totalCost_value').textContent = total_cost || 0
            calculate_data.querySelector('#totalCost_rmb').textContent = priceByCal

            if (priceOnWeb) {
                calculate_data.querySelector('#discount_value').textContent = parseFloat(priceOnWeb/priceByCal ).toFixed(3);
            }

        }
    }


    find_data.addEventListener('click', function () {

        let yxbPrice = parseFloat(document.getElementById('yxbPrice_value').value);
        const guoziPrice = parseFloat(document.getElementById('guoziPrice_value').value);

        if (!yxbPrice || !guoziPrice) {
            alert("先输入游戏币价格和修炼果价格")
        } else {
            chrome.runtime.sendMessage({action: "fetchData"});
            chrome.runtime.onMessage.addListener((request) => {

                if (request.action === "updateData") {
                    //乾元丹
                    xiulian_data.querySelector('#qyd_value').value = request.data.qyd || 0;
                    xiulian_data.querySelector('#qyd_cost').value = request.data.qydCost || 0;
                    //攻修
                    xiulian_data.querySelector('#gjxl_value').value = request.data.gjxl || 0;
                    xiulian_data.querySelector('#gjxl_cost').value = request.data.gjxlCost || 0;
                    //防修
                    xiulian_data.querySelector('#fyxl_value').value = request.data.fyxl || 0;
                    xiulian_data.querySelector('#fyxl_cost').value = request.data.fyxlCost || 0;
                    //法修
                    xiulian_data.querySelector('#fsxl_value').value = request.data.fsxl || 0;
                    xiulian_data.querySelector('#fsxl_cost').value = request.data.fsxlCost || 0;
                    //法抗
                    xiulian_data.querySelector('#kfxl_value').value = request.data.kfxl || 0;
                    xiulian_data.querySelector('#kfxl_cost').value = request.data.kfxlCost || 0;
                    //BB攻修
                    xiulian_data.querySelector('#gjkzl_value').value = request.data.gjkzl || 0;
                    //BB防修
                    xiulian_data.querySelector('#fykzl_value').value = request.data.fykzl || 0;
                    //BB法修
                    xiulian_data.querySelector('#fskzl_value').value = request.data.fskzl || 0;
                    //BB法抗
                    xiulian_data.querySelector('#kfkzl_value').value = request.data.kfkzl || 0;
                    const kzl1_cost = parseFloat(request.data.guoziSize1) * guoziPrice
                    const kzl2_cost = parseFloat(request.data.guoziSize2) * guoziPrice
                    const kzl3_cost = parseFloat(request.data.guoziSize3) * guoziPrice
                    const kzl4_cost = parseFloat(request.data.guoziSize4) * guoziPrice
                    xiulian_data.querySelector('#gjkzl_cost').value = kzl1_cost || 0;
                    xiulian_data.querySelector('#fykzl_cost').value = kzl2_cost || 0;
                    xiulian_data.querySelector('#fskzl_cost').value = kzl3_cost || 0;
                    xiulian_data.querySelector('#kfkzl_cost').value = kzl4_cost || 0;


                    console.log("获取技能数据：" + request.data)
                    school_skill_data.querySelector('#skill_0_value').value = request.data.skill_1 || 0;
                    school_skill_data.querySelector('#skill_1_value').value = request.data.skill_2 || 0;
                    school_skill_data.querySelector('#skill_2_value').value = request.data.skill_3 || 0;
                    school_skill_data.querySelector('#skill_3_value').value = request.data.skill_4 || 0;
                    school_skill_data.querySelector('#skill_4_value').value = request.data.skill_5 || 0;
                    school_skill_data.querySelector('#skill_5_value').value = request.data.skill_6 || 0;
                    school_skill_data.querySelector('#skill_6_value').value = request.data.skill_7 || 0;


                    school_skill_data.querySelector('#skill_0_cost').value = request.data.skill_1_cost || 0;
                    school_skill_data.querySelector('#skill_1_cost').value = request.data.skill_2_cost || 0;
                    school_skill_data.querySelector('#skill_2_cost').value = request.data.skill_3_cost || 0;
                    school_skill_data.querySelector('#skill_3_cost').value = request.data.skill_4_cost || 0;
                    school_skill_data.querySelector('#skill_4_cost').value = request.data.skill_5_cost || 0;
                    school_skill_data.querySelector('#skill_5_cost').value = request.data.skill_6_cost || 0;
                    school_skill_data.querySelector('#skill_6_cost').value = request.data.skill_7_cost || 0;

                    life_skill_data.querySelector('#qs_value').value = request.data.qs || 0
                    life_skill_data.querySelector('#mx_value').value = request.data.mx || 0
                    life_skill_data.querySelector('#speed_value').value = request.data.speed || 0
                    life_skill_data.querySelector('#strong_value').value = request.data.strong || 0

                    life_skill_data.querySelector('#qs_cost').value = request.data.qsCost || 0
                    life_skill_data.querySelector('#mx_cost').value = request.data.mxCost || 0
                    life_skill_data.querySelector('#speed_cost').value = request.data.speedCost || 0
                    life_skill_data.querySelector('#strong_cost').value = request.data.strongCost || 0

                    let priceOnWeb = parseFloat(request.data.price);
                    calculator(priceOnWeb);
                }
            });

        }

    });


    calculate.addEventListener('click', function () {
        calculator();
    });

});



