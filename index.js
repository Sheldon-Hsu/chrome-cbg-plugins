document.addEventListener('DOMContentLoaded', function () {
    const goSingle = document.getElementById('go_single');
    const goBatch = document.getElementById('go_batch');

    goSingle.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: "switchPage", page: "sidebar.html"});
    });

    goBatch.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: "switchPage", page: "batch.html"});
    });
});
