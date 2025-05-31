
const fs = require('fs');
const { JSDOM } = require('jsdom');
const iconv = require('iconv-lite');

const keys = ['新版乾元丹数量','防御修炼','法术修炼','抗法修炼','攻击控制力','防御控制力','法术控制力','抗法控制力']

function parseHTML(filePath) {
    // 读取GBK编码的HTML文件
    const gbkBuffer = fs.readFileSync(filePath);
    const html = iconv.decode(gbkBuffer, 'gbk');

    // 创建DOM环境
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 提取目标表格数据
    const roleBox = document.getElementById('role_info_box');
    if (!roleBox) {
        throw new Error('未找到role_info_box元素');
    }

    const result = {};

    Array.from(roleBox.querySelectorAll('td')).forEach(td => {
        if (td.textContent.includes('新版乾元丹数量')) {
            result.乾元丹数量 = td.textContent.split('：')[1].trim();
        }
    });

    // 防御修炼数据提取（兼容方案）
    Array.from(roleBox.querySelectorAll('th')).forEach(th => {
        if (th.textContent.includes('攻击修炼')) {
            const valueCell = th.nextElementSibling;
            result.攻击修炼 = valueCell?.textContent.trim() || '未找到';
        }
        if (th.textContent.includes('防御修炼')) {
            const valueCell = th.nextElementSibling;
            result.防御修炼 = valueCell?.textContent.trim() || '未找到';
        }
        if (th.textContent.includes('法术修炼')) {
            const valueCell = th.nextElementSibling;
            result.法术修炼 = valueCell?.textContent.trim() || '未找到';
        }
        if (th.textContent.includes('抗法修炼')) {
            const valueCell = th.nextElementSibling;
            result.抗法修炼 = valueCell?.textContent.trim() || '未找到';
        }
        if (th.textContent.includes('攻击控制力')) {
            const valueCell = th.nextElementSibling;
            result.攻击控制力 = valueCell?.textContent.trim() || '未找到';
        }
        if (th.textContent.includes('防御控制力')) {
            const valueCell = th.nextElementSibling;
            result.防御控制力 = valueCell?.textContent.trim() || '未找到';
        }
        if (th.textContent.includes('法术控制力')) {
            const valueCell = th.nextElementSibling;
            result.法术控制力 = valueCell?.textContent.trim() || '未找到';
        }
        if (th.textContent.includes('抗法控制力')) {
            const valueCell = th.nextElementSibling;
            result.抗法控制力 = valueCell?.textContent.trim() || '未找到';
        }

    });

    return result;
}

// 使用示例
try {
    const data = parseHTML('local.html');
    console.log('角色修炼数据:', data);
    console.log('攻击修炼:', data.攻击修炼);
} catch (err) {
    console.error('解析失败:', err.message);
}
