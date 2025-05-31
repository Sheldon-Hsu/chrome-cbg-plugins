
//查找修炼元素
function get_xiulian() {
// 获取所有包含修炼信息的行
    const rows = document.querySelectorAll('.tb02 tr');
    let gx = null;
    let fx = null;
    let fsx = null;
    let kfx = null;

    rows.forEach(row => {
        const th = row.querySelector('th');
        if (th && th.textContent.trim() === '攻击修炼：') {
            const td = row.querySelector('td');
            gx = td ? td.textContent.trim() : null;
        }
        if (th && th.textContent.trim() === '防御修炼：') {
            const td = row.querySelector('td');
            fx = td ? td.textContent.trim() : null;
        }
        if (th && th.textContent.trim() === '法术修炼：') {
            const td = row.querySelector('td');
            fsx = td ? td.textContent.trim() : null;
        }
        if (th && th.textContent.trim() === '抗法修炼：') {
            const td = row.querySelector('td');
            kfx = td ? td.textContent.trim() : null;
        }
    });

    if  (gx==null ||fx==null|| fsx==null||kfx==null ){
        console.log("未提取到修炼信息")
    }
    return {gx,fx,fsx,kfx}
}

document.getElementById('find_xiulian').addEventListener('click',  () => {
    const result = get_xiulian();
    document.getElementById('result').textContent =
        JSON.stringify(result[0].result, null, 2);
})



//查找技能
function get_school_skill(){

}
