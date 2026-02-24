export const dom = {
    loginView: document.getElementById('login-view'),
    statsView: document.getElementById('stats-view'),
    qrImg: document.getElementById('qr-img'),
    qrStatus: document.getElementById('qr-status'),
    qrLoading: document.getElementById('qr-loading'),
    qrWrapper: document.querySelector('.qr-wrapper'),
    // Launcher Elements
    launcherTabs: document.querySelectorAll('.launcher-tab'),
    infoPanels: document.querySelectorAll('.info-content-panel'),
    qqContainer: document.getElementById('qr-login-container'),
    wechatContainer: document.getElementById('wechat-login-container'),

    logoutBtn: document.getElementById('logout-btn'),
    loading: document.getElementById('loading'),
    errorMsg: document.getElementById('error-msg'),
    qrOverlay: document.getElementById('qr-overlay'),
    wxQrOverlay: document.getElementById('wx-qr-overlay'),
    qqRefreshBtn: document.getElementById('qq-refresh-btn'),
    wxRefreshBtn: document.getElementById('wx-refresh-btn'),
    wxQrStatus: document.getElementById('wx-qr-status'),

    // Tabs
    get statsTab() { return document.getElementById('stats-tab'); },
    get collectionTab() { return document.getElementById('collection-tab'); },
    get sponsorsTab() { return document.getElementById('sponsors-tab'); },
    get historyTab() { return document.getElementById('history-tab'); },
    get mapsTab() { return document.getElementById('maps-tab'); },

    // Stats content
    statsContent: document.getElementById('stats-content'),
    modeStats: document.getElementById('mode-stats'),
    mapStats: document.getElementById('map-stats'),
    matchHistory: document.getElementById('match-history'),
    pageInfo: document.getElementById('page-info'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),

    // Fragment sidebar
    fragmentList: document.getElementById('fragment-list'),

    // Collection grids
    get weaponGrid() { return document.getElementById('weapon-grid'); },
    get trapGrid() { return document.getElementById('trap-grid'); },
    get pluginGrid() { return document.getElementById('plugin-grid'); },
    get weaponCount() { return document.getElementById('weapon-count'); },
    get trapCount() { return document.getElementById('trap-count'); },
    get pluginCount() { return document.getElementById('plugin-count'); },

    // Official Summary
    offHuntGames: document.getElementById('off-hunt-games'),
    offTowerGames: document.getElementById('off-tower-games'),
    offRankGames: document.getElementById('off-rank-games'),
    offChaseGames: document.getElementById('off-chase-games'),
    offPlayTime: document.getElementById('off-play-time'),
    recentGames: document.getElementById('recent-games'),
    recentWin: document.getElementById('recent-win'),
    recentDmg: document.getElementById('recent-dmg'),
    recentBossDmg: document.getElementById('recent-boss'),

    // Sidebar Elements
    navItems: document.querySelectorAll('.nav-item'),
    themeToggle: document.getElementById('theme-toggle'),

    initLauncherTabs() {
        // Elements to toggle on mobile
        const loginSide = document.querySelector('.launcher-login-side');
        const infoSide = document.querySelector('.launcher-info-side');

        this.launcherTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanel = tab.getAttribute('data-launcher-tab');
                this.launcherTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.infoPanels.forEach(p => p.classList.remove('active'));
                const panel = document.getElementById(`panel-${targetPanel}`);
                if (panel) panel.classList.add('active');

                // Mobile specific tab toggling
                if (window.innerWidth <= 768) {
                    if (targetPanel === 'info') {
                        // "同步登录" tab clicked
                        if (loginSide) loginSide.style.display = 'block';
                        if (infoSide) infoSide.style.display = 'none';
                    } else {
                        // Other info tabs clicked
                        if (loginSide) loginSide.style.display = 'none';
                        if (infoSide) infoSide.style.display = 'block';
                    }
                } else {
                    // Reset to desktop default in case of resize
                    if (loginSide) loginSide.style.display = '';
                    if (infoSide) infoSide.style.display = '';
                }
            });
        });

        // Window resize listener to reset visibility
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                if (loginSide) loginSide.style.display = '';
                if (infoSide) infoSide.style.display = '';
            } else {
                // Determine current active tab on resize down to mobile
                const activeTab = document.querySelector('.launcher-tab.active');
                if (activeTab) {
                    const target = activeTab.getAttribute('data-launcher-tab');
                    if (target === 'info') {
                        if (loginSide) loginSide.style.display = 'block';
                        if (infoSide) infoSide.style.display = 'none';
                    } else {
                        if (loginSide) loginSide.style.display = 'none';
                        if (infoSide) infoSide.style.display = 'block';
                    }
                }
            }
        });
    }
};

export function formatNumber(num) {
    return (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function showError(msg) {
    dom.errorMsg.textContent = msg;
    dom.errorMsg.classList.remove('hidden');
    setTimeout(() => dom.errorMsg.classList.add('hidden'), 3000);
}

export function switchView(viewName) {
    if (viewName === 'login') {
        dom.loginView.classList.remove('hidden');
        dom.statsView.classList.add('hidden');
    } else {
        dom.loginView.classList.add('hidden');
        dom.statsView.classList.remove('hidden');
    }
}

export function forceLogout() {
    localStorage.removeItem('nzm_cookie');
    localStorage.removeItem('nzm_login_type');
    location.reload();
}

export function showCookieExpiredModal() {
    if (document.querySelector('.cookie-expired-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'cookie-expired-overlay';

    overlay.innerHTML = `
        <div class="cookie-expired-modal">
            <span class="cookie-expired-icon">⚠️</span>
            <div class="cookie-expired-title">无法获取数据</div>
            <div class="cookie-expired-text" style="text-align:left; display:inline-block; max-width:100%;">
                <div style="margin-bottom:8px"><strong>可能原因：</strong></div>
                <ul style="margin:0 0 12px 20px; padding:0; list-style-type:disc;">
                    <li>登录凭证已过期 <span style="font-size:0.9em;color:#888">(重新登录即可)</span></li>
                    <li><span style="color:#d4a84b">从未登录过官方小程序</span> (常见)</li>
                </ul>
                <div style="margin-bottom:8px"><strong>解决方案：</strong></div>
                请前往手机QQ/微信搜索小程序<br>
                <strong style="color:#d4a84b; font-size:1.1em;">“逆战未来工具箱”</strong><br>
                进入并<span style="color:#10b981">同意用户协议</span>后，点击下方按钮重试。
            </div>
            <button class="cookie-expired-btn" id="relogin-btn" style="margin-top:1.5rem;">我已同意，重新登录</button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('relogin-btn').addEventListener('click', forceLogout);
}

export function showLogoutModal(onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;';

    const popup = document.createElement('div');
    popup.style.cssText = 'background:#1f1f23;border:1px solid rgba(255,255,255,0.1);padding:24px 32px;border-radius:12px;text-align:center;color:#fff;box-shadow:0 10px 25px rgba(0,0,0,0.5); animation: cardFloatIn 0.3s ease-out;';

    popup.innerHTML = `
        <div style="font-size:1.1rem;font-weight:bold;margin-bottom:12px;color:#d4a84b;">退出登录</div>
        <div style="margin-bottom:24px;color:#d1d5db;font-size:0.95rem;">确定要退出登录并随时清除本地缓存吗？</div>
        <div style="display:flex;gap:16px;justify-content:center;">
            <button id="logout-cancel-btn" style="padding:8px 24px;border-radius:6px;border:none;background:rgba(255,255,255,0.1);color:#d1d5db;cursor:pointer;">取消</button>
            <button id="logout-confirm-btn" style="padding:8px 24px;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer;">确定</button>
        </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    document.getElementById('logout-cancel-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    document.getElementById('logout-confirm-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
        if (onConfirm) onConfirm();
    });
}

export function showGroupPopup(groupName, groupNumber) {
    const isFullGroup = ['一群', '二群', '三群', '四群', '五群', '六群'].includes(groupName);
    const displayNumber = isFullGroup ? '群已满人' : groupNumber;
    const numberColor = isFullGroup ? '#ef4444' : '#10b981';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;';

    const popup = document.createElement('div');
    popup.style.cssText = 'background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:2px solid #ef4444;border-radius:16px;padding:2rem;max-width:400px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);';

    popup.innerHTML = `
        <div style="font-size:1.5rem;font-weight:bold;color:#f59e0b;margin-bottom:1rem;">⚠️ 重要提醒 ⚠️</div>
        <div style="background:#ef4444;color:#fff;padding:1rem;border-radius:8px;margin-bottom:1.5rem;font-weight:bold;line-height:1.6;">
            进群后请务必查看<span style="color:#fbbf24;font-size:1.1rem;">「群公告」</span>！<br>
            不要提问群公告中已有的问题！<br>
            否则将被禁言或移出群聊！
        </div>
        <div style="font-size:1.2rem;color:#94a3b8;margin-bottom:0.5rem;">${groupName}群号</div>
        <div style="font-size:2rem;font-weight:bold;color:${numberColor};margin-bottom:1.5rem;font-family:monospace;letter-spacing:2px;">${displayNumber}</div>
        <div style="display:flex;gap:1rem;justify-content:center;">
            ${isFullGroup ? '' : '<button id="copy-group-btn" style="padding:0.8rem 1.5rem;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;font-weight:bold;">复制群号</button>'}
            <button id="close-group-btn" style="padding:0.8rem 1.5rem;background:#4b5563;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;">关闭</button>
        </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    if (!isFullGroup) {
        popup.querySelector('#copy-group-btn').addEventListener('click', function () {
            navigator.clipboard.writeText(groupNumber);
            this.textContent = '已复制!';
            this.style.background = '#059669';
            setTimeout(() => {
                this.textContent = '复制群号';
                this.style.background = '#10b981';
            }, 1500);
        });
    }

    popup.querySelector('#close-group-btn').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

// Sidebar UI Logic
export function switchStatsTab(tabId, onSwitch) {
    // Update Sidebar Navigation UI
    dom.navItems.forEach(item => {
        if (item.getAttribute('onclick')?.includes(`'${tabId}'`)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Auto-close sidebar on mobile after clicking
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.stats-sidebar');
        const overlay = document.getElementById('mobile-sidebar-overlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }

    // Hide all tabs first
    if (dom.statsTab) dom.statsTab.classList.add('hidden');
    if (dom.collectionTab) dom.collectionTab.classList.add('hidden');
    if (dom.sponsorsTab) dom.sponsorsTab.classList.add('hidden');
    if (dom.historyTab) dom.historyTab.classList.add('hidden');
    if (dom.mapsTab) dom.mapsTab.classList.add('hidden');

    // Show selected tab
    if (tabId === 'stats' && dom.statsTab) {
        dom.statsTab.classList.remove('hidden');
    } else if (tabId === 'collection' && dom.collectionTab) {
        dom.collectionTab.classList.remove('hidden');
    } else if (tabId === 'sponsors' && dom.sponsorsTab) {
        dom.sponsorsTab.classList.remove('hidden');
        renderSponsors();
    } else if (tabId === 'history' && dom.historyTab) {
        dom.historyTab.classList.remove('hidden');
    } else if (tabId === 'maps' && dom.mapsTab) {
        dom.mapsTab.classList.remove('hidden');
        renderMapGallery();
    }

    // Reset scroll position for the container
    const scrollContainer = document.querySelector('.stats-container');
    if (scrollContainer) scrollContainer.scrollTop = 0;

    if (onSwitch) onSwitch(tabId);
}


// Window global for inline onclick
window.switchStatsTab = switchStatsTab;

const officialMaps = [
    { name: "黑暗复活节", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-12.png" },
    { name: "飓风要塞-风暴行动", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-132.png" },
    { name: "太空电梯-苍穹之上", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-135.png" },
    { name: "大都会", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-14.png" },
    { name: "昆仑神宫", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-16.png" },
    { name: "精绝古城", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-17.png" },
    { name: "冰点源起", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-21.png" },
    { name: "空间站", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-300.png" },
    { name: "20号星港", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-304.png" },
    { name: "联盟大厦", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-306.png" },
    { name: "根除变异", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-321.png" },
    { name: "夺回资料", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-322.png" },
    { name: "猎杀南十字", url: "https://nzm.playerhub.qq.com/playerhub/60106/maps/maps-323.png" }
];

export function renderMapGallery(apiGameList = []) {
    const list = document.getElementById('maps-list');
    if (!list) return;

    // Dynamically build list combining static base maps + whatever the official API returned in match history
    const mapDict = new Map();

    // Add base official maps
    officialMaps.forEach(m => mapDict.set(m.name, m.url));

    // Extract detailed unique maps from user's history payload, skipping known non-map items
    if (Array.isArray(apiGameList)) {
        apiGameList.forEach(g => {
            if (g.mapName && g.icon && g.icon.endsWith('.png') && !g.mapName.includes('引导') && !g.mapName.includes('训练')) {
                // Use standard regex to clean off bracketed difficulty suffixes like (英雄) from the name
                const cleanName = g.mapName.replace(/\(.*?\)|（.*?）/g, '').trim();
                mapDict.set(cleanName, g.icon);
            }
        });
    }

    // Convert back to array of objects
    const finalMaps = Array.from(mapDict.entries()).map(([name, url]) => ({ name, url }));

    list.innerHTML = finalMaps.map((map, i) => `
        <div class="matte-card" style="display: flex; flex-direction: column; overflow: hidden; animation: cardFloatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${Math.min(i, 20) * 0.05}s;">
            <div style="width: 100%; height: 180px; background-image: url('${map.url}'); background-size: cover; background-position: center;"></div>
            <div style="padding: 16px; background: rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05);">
                <span class="value" style="font-size:1.1rem; color:#fff; font-weight:bold; margin: 0;">${map.name}</span>
                <a href="${map.url}" target="_blank" download="${map.name}.png" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; padding: 6px 16px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: bold; transition: all 0.2s;" onmouseover="this.style.background='#10b981'; this.style.color='#fff';" onmouseout="this.style.background='rgba(16, 185, 129, 0.2)'; this.style.color='#10b981';">下载原图</a>
            </div>
        </div>
    `).join('');
}

// Sponsor Logic
const sponsorsData = [
    "一***橙子🍊", "匿名大佬", "李**cc", "再*吧", "sn0***1ne25", "得*沃", "A**u", "可爱小***oro",
    "盛", "夹*酱", "包*头", "*鹊", "CT**付", "重***城", "匿名大佬", "Ci**ue", "*~", "Z", "Un***tr",
    "后***海", "^_^", "匿名大佬", "雾*酱", "罗*花", "不关**的事", "*白", "怯", "Fl***ed",
    "向着***发", "*丁", "自*琦", "：", "李", "*心", "天*了", "當***雞", "do***73", "匿名大佬",
    "*风", "*恋", "碌**为", "朴", "*博", "酒", "*壹", "除却***是云", "*染", "51*****73", "寻",
    "灵宫****师傅", "X*N", "狴*锁", "赵*天", "匿名大佬", "裎", "靈", "匿名大佬", "邦***熊",
    "匿名大佬", "C*", "Fo****en", "盒**猫",
    // New Sponsors
    "*虚", "公子***TEL", "苹**薇", "T***o", "狼***O", "K*", "匿名大佬", "luc***un", "傲****卡", "匿名大佬",
    "*用", "辰", "墨******", "SF****豆付", "空", "*锋", "JY*****er", "*卿丶", "R****y", "*远.",
    "*然兄", "匿名大佬", "J", "叽里****u", "Fa****ll", "(*****)", "**生.", "*U", "匿名大佬", "益**前",
    "A*", "笑**", "抖**环", "一***憨", "璇", "匿名大佬", "ja****ou", "小*****aa", "*舟", "匿名大佬",
    "渡不****3G", "匿名大佬", "c", "查**人", "骁", "li***ng", "Es***la", "匿名大佬", "匿名大佬", "匿名大佬",
    "**豪", "匿名大佬", ">*0", "十二***。", "是**阿", "匿名大佬", "*林", "**帷*幕**", "丨", "不***.",
    "先*忙", "*灰", "屁*屁", "老***呆", "12*****89", "苏安****子酒", "匿名大佬", "*破", "琦", "匿名大佬",
    "夜*呀", "*.", "匿名大佬",
    "匿名大佬", "*色"
];

let currentSponsorPage = 1;

export function renderSponsors() {
    const list = document.getElementById('sponsor-list');
    if (!list) return;

    // Dynamically calculate grid columns based on CSS auto-fill minimum 180px
    const gridStyle = window.getComputedStyle(list);
    let columns = 1;
    if (gridStyle.gridTemplateColumns && gridStyle.gridTemplateColumns !== 'none') {
        columns = gridStyle.gridTemplateColumns.split(' ').length || 1;
    }

    // Mobile: 10 rows, PC: 15 rows
    const rowsPerPage = window.innerWidth <= 768 ? 10 : 15;
    const sponsorsPerPage = columns * rowsPerPage;

    const start = (currentSponsorPage - 1) * sponsorsPerPage;
    const end = start + sponsorsPerPage;
    const pageData = sponsorsData.slice(start, end);

    list.innerHTML = pageData.map((name, i) =>
        `<div class="matte-card" style="display:flex; flex-direction:row; align-items:center; justify-content:center; padding:0.75rem 1rem; animation: cardFloatIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${Math.min(i, 40) * 0.02}s;">
            <span class="value" style="font-size:0.95rem; color:var(--text-main); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
        </div>`
    ).join('');

    // Bind buttons (use .onclick instead of addEventListener to prevent multiple fires on re-render)
    const prevBtn = document.getElementById('prev-sponsor-btn');
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentSponsorPage > 1) {
                currentSponsorPage--;
                renderSponsors();
            }
        };
    }

    const nextBtn = document.getElementById('next-sponsor-btn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentSponsorPage < Math.ceil(sponsorsData.length / sponsorsPerPage)) {
                currentSponsorPage++;
                renderSponsors();
            }
        };
    }
}
