import { state, pollState } from './state.js';
import { dom, switchView, showError, showCookieExpiredModal, showGroupPopup, switchStatsTab, renderSponsors, showLogoutModal } from './ui_components.js';
import { api, clearApiCache } from './api.js';
import { startQRLogin, startWxQRLogin, checkQR, checkWxQR, switchLoginMethod } from './auth_manager.js';
import { renderStats, renderMatchHistory, getModeByMapId, calculateRecentBossDamage } from './stats_renderer.js';
import { renderWeapons, renderTraps, renderPlugins, renderFragments } from './collection_renderer.js';
import { ITEMS_PER_PAGE } from './config.js';
import { generateShareImage } from './share_image.js';

// --- Dashboard Update View ---
function updateDashboard() {
    const data = state.data;
    if (!data) return;

    dom.updateAccountInfo(state.userProfile || {});
    dom.updateOfficialSummary(data.officialSummary || {});

}

// --- Initialization ---
async function init() {
    dom.initLauncherTabs();
    bindEvents();
    renderSponsors();

    if (state.cookie) {
        switchStatsTab('stats');
        await loadStats();
    } else {
        switchView('login');
        startQRLogin();
    }
}

// 切换节点后，根据当前激活的登录方式 (QQ/微信) 重新获取二维码
function refreshQRForCurrentMethod() {
    // 停掉所有正在进行的轮询
    if (pollState.qrTimer) { clearInterval(pollState.qrTimer); pollState.qrTimer = null; }
    if (pollState.wxQrTimer) { clearInterval(pollState.wxQrTimer); pollState.wxQrTimer = null; }
    pollState.isQRPollingActive = false;
    pollState.isWxQRPollingActive = false;
    pollState.qrSig = '';
    pollState.wxQrUuid = '';

    // 判断当前是 QQ 还是微信 tab 处于激活状态
    const wechatTab = document.getElementById('method-wechat-tab');
    if (wechatTab && wechatTab.classList.contains('active')) {
        startWxQRLogin();
    } else {
        startQRLogin();
    }
}

function bindEvents() {
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        if (state.cookie) {
            document.getElementById('refresh-btn').textContent = '刷新中...';
            clearApiCache(); // 清除所有缓存，强制从服务器重新获取
            loadStats(true).then(() => {
                document.getElementById('refresh-btn').textContent = '刷新状态';
            });
        }
    });

    dom.logoutBtn?.addEventListener('click', () => {
        showLogoutModal(() => {
            clearApiCache();
            localStorage.removeItem('nzm_cookie');
            localStorage.removeItem('nzm_login_type');
            location.reload();
        });
    });

    dom.qqRefreshBtn?.addEventListener('click', startQRLogin);
    dom.wxRefreshBtn?.addEventListener('click', startWxQRLogin);

    dom.qqRefreshBtn?.addEventListener('click', startQRLogin);
    dom.wxRefreshBtn?.addEventListener('click', startWxQRLogin);

    // Login Method Switching
    document.getElementById('method-qq-tab')?.addEventListener('click', () => switchLoginMethod('qq'));
    document.getElementById('method-wechat-tab')?.addEventListener('click', () => switchLoginMethod('wechat'));

    // Node Selector Switching (5s cooldown)
    let nodeSwitchCooldown = false;
    function handleNodeSwitch(activeId, inactiveId) {
        const activeBtn = document.getElementById(activeId);
        const inactiveBtn = document.getElementById(inactiveId);
        if (!activeBtn || activeBtn.classList.contains('active')) return;
        if (nodeSwitchCooldown) return;

        activeBtn.classList.add('active');
        inactiveBtn.classList.remove('active');
        refreshQRForCurrentMethod();

        // 5秒冷却
        nodeSwitchCooldown = true;
        const allBtns = document.querySelectorAll('.node-btn');
        allBtns.forEach(b => b.style.opacity = '0.5');
        allBtns.forEach(b => b.style.pointerEvents = 'none');
        setTimeout(() => {
            nodeSwitchCooldown = false;
            allBtns.forEach(b => b.style.opacity = '');
            allBtns.forEach(b => b.style.pointerEvents = '');
        }, 5000);
    }
    document.getElementById('node-cf')?.addEventListener('click', () => handleNodeSwitch('node-cf', 'node-cn'));
    document.getElementById('node-cn')?.addEventListener('click', () => handleNodeSwitch('node-cn', 'node-cf'));

    // Generate Share Image
    const genShareImgBtn = document.getElementById('gen-share-img-btn');
    if (genShareImgBtn) {
        genShareImgBtn.addEventListener('click', () => {
            generateShareImage(genShareImgBtn);
        });
    }

    // Pagination
    dom.prevPage?.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderMatchHistory(state.data.gameList);
        }
    });
    dom.nextPage?.addEventListener('click', () => {
        const filteredLength = state.data.gameList.filter(g => state.currentModeFilter === 'all' || getModeByMapId(g.iMapId) === state.currentModeFilter).length;
        const total = Math.ceil(filteredLength / ITEMS_PER_PAGE);
        if (state.currentPage < total) {
            state.currentPage++;
            renderMatchHistory(state.data.gameList);
        }
    });

    // Page Jump
    const pageJumpBtn = document.getElementById('page-jump-btn');
    const pageJumpInput = document.getElementById('page-jump-input');
    if (pageJumpBtn && pageJumpInput) {
        const doJump = () => {
            const target = parseInt(pageJumpInput.value);
            if (!target || target < 1) return;
            const filteredLength = state.data.gameList.filter(g => state.currentModeFilter === 'all' || getModeByMapId(g.iMapId) === state.currentModeFilter).length;
            const total = Math.ceil(filteredLength / ITEMS_PER_PAGE);
            state.currentPage = Math.min(target, total);
            pageJumpInput.value = '';
            renderMatchHistory(state.data.gameList);
        };
        pageJumpBtn.addEventListener('click', doJump);
        pageJumpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doJump();
        });
    }

    // Handle auth success event
    window.addEventListener('auth:success', () => {
        loadStats();
    });

    // Page Visibility
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (pollState.qrTimer) { clearInterval(pollState.qrTimer); pollState.qrTimer = null; }
            if (pollState.wxQrTimer) { clearInterval(pollState.wxQrTimer); pollState.wxQrTimer = null; }
        } else {
            if (pollState.isQRPollingActive && pollState.qrSig && !pollState.qrTimer) {
                pollState.qrTimer = setInterval(checkQR, 3000);
            }
            if (pollState.isWxQRPollingActive && pollState.wxQrUuid && !pollState.wxQrTimer) {
                pollState.wxQrTimer = setInterval(checkWxQR, 4000);
            }
        }
    });
}

async function loadStats(forceRefresh = false) {
    if (!state.cookie) return switchView('login');

    switchView('stats');
    dom.loading.classList.remove('hidden');
    dom.statsContent.classList.add('hidden');

    try {
        const json = await api.getStats(forceRefresh);
        if (json.success) {
            state.data = json.data;
            renderStats(json.data);
            dom.statsContent.classList.remove('hidden');
            loadFragments();
            // 异步计算最近 Boss 伤害
            calculateRecentBossDamage(json.data.gameList);
        } else {
            showError('数据获取失败: ' + (json.message || '未知错误'));
            if (['Missing Cookie', 'Invalid Cookie', 'No Data'].includes(json.message)) {
                showCookieExpiredModal();
            }
        }
    } catch (e) {
        if (e.message === 'UNAUTHORIZED') {
            showCookieExpiredModal();
        } else {
            showError('请求失败: ' + e.message);
        }
    } finally {
        dom.loading.classList.add('hidden');
    }
}

async function loadFragments() {
    try {
        const json = await api.getCollection('home');
        if (json.success && json.data.home) {
            renderFragments(json.data.home);
        }
    } catch (e) {
        console.error('Failed to load fragments:', e);
    }
}

// Enhanced Global Tab Switcher for Sidebar
window.switchStatsTab = (tabId) => {
    switchStatsTab(tabId, (id) => {
        state.currentTab = id;
        if (id === 'collection' && !state.collection) {
            loadCollection();
        }
        if (id === 'history' && state.data?.gameList) {
            renderMatchHistory(state.data.gameList);
        }
    });
};

async function loadCollection() {
    dom.weaponGrid.innerHTML = '<p style="color:#888;">加载中...</p>';
    try {
        const json = await api.getCollection('all');
        if (json.success) {
            state.collection = json.data;
            renderWeapons(json.data.weapons);
            renderTraps(json.data.traps);
            renderPlugins(json.data.plugins);
            if (json.data.weaponSummary && dom.weaponCount) {
                dom.weaponCount.textContent = `(${json.data.weaponSummary.owned}/${json.data.weaponSummary.total})`;
            }
        }
    } catch (e) {
        console.error('Failed to load collection:', e);
    }
}

// Global scope for legacy onclick if any (though we aim for event listeners)
window.showGroupPopup = showGroupPopup;

// Run init
document.addEventListener('DOMContentLoaded', init);
