document.addEventListener('DOMContentLoaded', function () {
    const modePC = document.getElementById('mode_pc');
    const modePocket = document.getElementById('mode_pocket');
    const navPC = document.getElementById('nav_pc');
    const navPocket = document.getElementById('nav_pocket');

    let currentMode = 'pc'; // 'pc' | 'pocket'

    function switchMode(mode) {
        currentMode = mode;
        if (mode === 'pc') {
            modePC.classList.add('active');
            modePocket.classList.remove('active');
            navPC.style.display = '';
            navPocket.style.display = 'none';
        } else {
            modePC.classList.remove('active');
            modePocket.classList.add('active');
            navPC.style.display = 'none';
            navPocket.style.display = '';
        }
    }

    modePC.addEventListener('click', function () {
        switchMode('pc');
    });

    modePocket.addEventListener('click', function () {
        switchMode('pocket');
    });

    // 保存模式并跳转页面
    function navigateWithMode(page) {
        chrome.storage.local.set({calcMode: currentMode}, function () {
            chrome.runtime.sendMessage({action: "switchPage", page: page});
        });
    }

    // 电脑版
    document.getElementById('go_single').addEventListener('click', function () {
        navigateWithMode("sidebar.html");
    });

    document.getElementById('go_batch').addEventListener('click', function () {
        navigateWithMode("batch.html");
    });

    // 口袋版
    document.getElementById('go_pocket_single').addEventListener('click', function () {
        navigateWithMode("sidebar.html");
    });

    document.getElementById('go_pocket_batch').addEventListener('click', function () {
        navigateWithMode("batch.html");
    });
});
