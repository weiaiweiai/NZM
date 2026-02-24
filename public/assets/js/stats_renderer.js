import { state } from './state.js';
import { dom, formatNumber } from './ui_components.js';
import { api } from './api.js';
import { MAP_NAME, DIFF_NAME, ITEMS_PER_PAGE, CHECKPOINT_AREAS } from './config.js';

export function getModeByMapId(mapId) {
    const id = parseInt(mapId);
    if ([12, 14, 16, 17, 21, 30, 112, 114, 115].includes(id)) return '僵尸猎场';
    if ([300, 304, 306, 308].includes(id)) return '塔防战';
    if ([321, 322, 323, 324].includes(id)) return '时空追猎';
    if (id >= 1000) return '机甲战';
    return '未知';
}

export function renderStats(data) {
    const os = data.officialSummary || {};
    const huntGames = os.huntGameCount || '-';
    const towerGames = os.towerGameCount || '-';
    let playTime = os.playtime ? `${Math.floor(os.playtime / 60)}时` : '-';

    if (dom.offHuntGames) dom.offHuntGames.textContent = huntGames;
    if (dom.offTowerGames) dom.offTowerGames.textContent = towerGames;
    if (dom.offRankGames) dom.offRankGames.textContent = os.mechaGameCount || '-';
    if (dom.offChaseGames) dom.offChaseGames.textContent = os.timeHuntGameCount || '-';
    if (dom.offPlayTime) dom.offPlayTime.textContent = playTime;

    if (dom.recentGames) dom.recentGames.textContent = data.totalGames;
    if (dom.recentWin) dom.recentWin.textContent = data.winRate + '%';
    if (dom.recentDmg) dom.recentDmg.textContent = formatNumber(data.avgDamage);

    let modeHtml = '';
    let modeIdx = 0;
    for (const [m, info] of Object.entries(data.modeStats)) {
        let displayName = m;
        if (m === '猎场') displayName = '僵尸猎场';
        if (m === '追猎') displayName = '时空追猎';

        const rate = info.total > 0 ? ((info.win / info.total) * 100).toFixed(1) : 0;
        modeHtml += `
            <div class="matte-card mode-stat-card" style="animation: cardFloatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${0.5 + (Math.min(modeIdx, 60) * 0.04)}s;">
                <div class="label" style="display:flex; flex-direction:column; gap:4px; align-items:center; margin-top:8px;">
                    <span style="font-weight:bold;">${displayName}</span>
                    <div style="display:flex; gap:8px; font-size:0.75rem; color:var(--text-dim); justify-content:center;">
                        <span style="color:var(--success);">通关 ${info.win}</span>
                        <span style="color:var(--danger);">未通关 ${info.loss}</span>
                        <span>${rate}%</span>
                    </div>
                </div>
                <div class="value">${info.total} <small style="font-size:0.8rem; font-weight:normal; opacity:0.6;">场</small></div>
            </div>`;
        modeIdx++;
    }
    dom.modeStats.innerHTML = modeHtml;

    let mapHtml = '';
    let mapIdx = 0;
    for (const [m, diffs] of Object.entries(data.mapStats)) {
        let total = 0, win = 0;
        let diffStr = '';
        for (const [d, v] of Object.entries(diffs)) {
            total += v.total; win += v.win;
            diffStr += `<div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-top:4px; color:var(--text-dim);">
                <span>${d}</span>
                <span>${v.total}场 (${v.win > 0 ? Math.floor(v.win / v.total * 100) : 0}%)</span>
            </div>`;
        }
        const rate = total > 0 ? ((win / total) * 100).toFixed(0) : 0;

        // Find matching map image
        const matchedGame = data.gameList?.find(g => (g.mapName === m || MAP_NAME[g.iMapId] === m));
        const imgUrl = matchedGame ? (matchedGame.icon || 'images/maps-304.png') : 'images/maps-304.png';

        mapHtml += `
            <div class="matte-card map-card-with-bg" style="animation: cardFloatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${0.65 + (Math.min(mapIdx, 60) * 0.04)}s;">
                <div class="map-bg-layer" style="background-image: url('${imgUrl}')"></div>
                <div style="position:relative; z-index:1;">
                    <div class="value" style="font-size:1.4rem; margin-bottom:0.5rem; text-shadow:0 2px 4px rgba(0,0,0,0.8);">${m}</div>
                    <div style="font-size:0.9rem; color:var(--text-main); font-weight:600; margin-bottom:0.5rem;">${total} 场 - ${rate}% 通关率</div>
                    <div class="map-diffs" style="border-top:1px solid rgba(255,255,255,0.15); padding-top:0.5rem;">${diffStr}</div>
                </div>
            </div>`;
        mapIdx++;
    }
    dom.mapStats.innerHTML = mapHtml;

    renderMatchHistory(data.gameList);
}

export function renderMatchHistory(gameList) {
    if (!dom.matchHistory) return;
    dom.matchHistory.innerHTML = '';

    const filteredList = gameList.filter(g => {
        const mode = getModeByMapId(g.iMapId);
        if (mode === '机甲战') return false;
        if (state.currentModeFilter === 'all') return true;
        return mode === state.currentModeFilter;
    });

    if (filteredList.length === 0) {
        dom.matchHistory.innerHTML = '<div class="match-item">暂无符合条件的对局记录</div>';
        updatePagination(0);
        return;
    }

    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
    if (state.currentPage > totalPages) state.currentPage = 1;
    const startIdx = (state.currentPage - 1) * ITEMS_PER_PAGE;
    const pageData = filteredList.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    const htmlList = pageData.map((game, idx) => {
        const mode = getModeByMapId(game.iMapId);
        const mapName = game.mapName || MAP_NAME[game.iMapId] || `未知(${game.iMapId})`;
        const diffName = DIFF_NAME[game.iSubModeType] || game.iSubModeType;
        const isWin = game.iIsWin === '1' || game.iIsWin === 1;
        const duration = parseInt(game.iDuration) || 0;
        const startTime = game.dtGameStartTime || '';
        const score = parseInt(game.iScore) || 0;

        let img = game.icon || 'images/maps-304.png';
        let dateStr = startTime;
        try {
            const d = new Date(startTime);
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const dd = d.getDate().toString().padStart(2, '0');
            const hh = d.getHours().toString().padStart(2, '0');
            const mm = d.getMinutes().toString().padStart(2, '0');
            dateStr = `${m}-${dd} ${hh}:${mm}`;
        } catch (e) { }

        return `
            <div class="match-item ${isWin ? 'win' : 'loss'}" data-roomid="${game.DsRoomId}" data-mode="${mode}" style="animation: cardFloatIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${Math.min(idx, 30) * 0.02}s;">
                <div class="match-content-row">
                    <img src="${img}" class="match-thumb" loading="lazy">
                    <div class="match-info-center">
                        <div class="match-info-top">
                            <span class="match-result-text" style="color: ${isWin ? '#10b981' : '#ef4444'}; font-weight: 900;">${isWin ? '胜利' : '失败'}</span>
                            <span class="match-mode-text">${mode}</span>
                        </div>
                        <div class="match-info-bottom">
                            <span class="match-map-name">${mapName}-${diffName}</span>
                            <span class="match-date">${dateStr}</span>
                        </div>
                    </div>
                    <div class="match-toggle-btn"><span class="toggle-text"></span><span class="toggle-icon"></span></div>
                    <div class="match-info-right">
                        <div class="match-score-text">${formatNumber(score)}</div>
                        <div class="match-duration-text">${Math.floor(duration / 60)}分${duration % 60}秒</div>
                    </div>
                </div>
                <div class="match-details" id="detail-${game.DsRoomId}"></div>
            </div>`;
    });

    dom.matchHistory.innerHTML = htmlList.join('');

    dom.matchHistory.querySelectorAll('.match-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (e.target.closest('.match-details')) return;
            const roomId = item.dataset.roomid;
            const mode = item.dataset.mode;

            if (window.innerWidth <= 768) {
                // Mobile: slide-in detail page
                const matchInfo = {
                    result: item.classList.contains('win') ? '胜利' : '失败',
                    isWin: item.classList.contains('win'),
                    mode: mode,
                    mapName: item.querySelector('.match-map-name')?.textContent || '',
                    date: item.querySelector('.match-date')?.textContent || '',
                    score: item.querySelector('.match-score-text')?.textContent || '',
                    duration: item.querySelector('.match-duration-text')?.textContent || '',
                    thumb: item.querySelector('.match-thumb')?.src || ''
                };
                openMatchDetail(roomId, mode, matchInfo);
            } else {
                // PC: original inline expand/collapse
                const detailEl = item.querySelector('.match-details');
                if (!detailEl) return;
                const isExpanded = item.classList.toggle('expanded');
                if (isExpanded && !detailEl.dataset.loaded) {
                    detailEl.innerHTML = '<div style="text-align:center; padding:1rem; color:#94a3b8;">正在加载...</div>';
                    try {
                        const json = await api.getMatchDetail(roomId);
                        if (json.success && json.data) {
                            renderMatchDetail(json.data, detailEl, mode);
                            detailEl.dataset.loaded = '1';
                        } else {
                            detailEl.innerHTML = '<div style="text-align:center;color:#ff4444;padding:1rem;">加载失败</div>';
                        }
                    } catch (err) {
                        detailEl.innerHTML = `<div style="text-align:center;color:#ff4444;padding:1rem;">加载失败: ${err.message}</div>`;
                    }
                }
            }
        });
    });

    updatePagination(totalPages);
}

// ============ Match Detail Slide Page ============
let savedScrollPosition = 0;

async function openMatchDetail(roomId, mode, matchInfo) {
    const page = document.getElementById('match-detail-page');
    const summaryEl = document.getElementById('match-detail-summary');
    const contentEl = document.getElementById('match-detail-content');
    if (!page || !summaryEl || !contentEl) return;

    // Move to body to escape backdrop-filter stacking context (fixes scroll sync bug)
    if (page.parentNode !== document.body) {
        document.body.appendChild(page);
    }

    // Lock body scroll to prevent overscroll revealing background
    document.body.style.overflow = 'hidden';

    // Save list scroll position
    const scrollContainer = document.querySelector('.stats-main-layout');
    if (scrollContainer) savedScrollPosition = scrollContainer.scrollTop;

    // Reset detail page scroll to top
    page.scrollTop = 0;

    // Render summary header
    const resultColor = matchInfo.isWin ? '#10b981' : '#ef4444';
    summaryEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${matchInfo.thumb}" style="width: 80px; height: 48px; object-fit: cover; border-radius: 6px; background: #333; flex-shrink: 0;">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="color: ${resultColor}; font-weight: 900; font-size: 1.1rem;">${matchInfo.result}</span>
                    <span style="color: #ef4444; font-size: 0.95rem;">${matchInfo.mode}</span>
                </div>
                <div style="color: #cbd5e1; font-size: 0.85rem;">${matchInfo.mapName} · ${matchInfo.date}</div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
                <div style="color: #ef4444; font-family: 'Impact', sans-serif; font-size: 1.2rem; letter-spacing: 1px;">${matchInfo.score}</div>
                <div style="color: #f1f5f9; font-size: 0.85rem; font-weight: bold;">${matchInfo.duration}</div>
            </div>
        </div>`;

    // Show loading state
    contentEl.innerHTML = '<div style="text-align:center; padding: 3rem 1rem; color: #94a3b8;">正在加载对局详情...</div>';

    // Slide in
    page.classList.add('active');

    // Fetch detail data
    try {
        const json = await api.getMatchDetail(roomId);
        if (json.success && json.data) {
            renderMatchDetail(json.data, contentEl, mode);
        } else {
            contentEl.innerHTML = '<div style="text-align:center; color:#ff4444; padding: 2rem;">加载失败</div>';
        }
    } catch (e) {
        contentEl.innerHTML = `<div style="text-align:center; color:#ff4444; padding: 2rem;">加载失败: ${e.message || '网络错误'}</div>`;
    }
}

function closeMatchDetail() {
    const page = document.getElementById('match-detail-page');
    if (!page) return;
    page.classList.remove('active');

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore scroll position after animation completes
    setTimeout(() => {
        const scrollContainer = document.querySelector('.stats-main-layout');
        if (scrollContainer) scrollContainer.scrollTop = savedScrollPosition;
    }, 350);
}
window.closeMatchDetail = closeMatchDetail;

export function updatePagination(totalPages) {
    if (!dom.pageInfo) return;
    dom.pageInfo.textContent = `第 ${state.currentPage} 页 / 共 ${totalPages} 页`;
    dom.prevPage.disabled = state.currentPage <= 1;
    dom.nextPage.disabled = state.currentPage >= totalPages;
}

function renderCheckpointTimes(partitionDetails) {
    if (!partitionDetails || partitionDetails.length === 0) return '';
    const sortedCheckpoints = [...partitionDetails].sort((a, b) => parseInt(a.areaId) - parseInt(b.areaId));
    const checkpointsHtml = sortedCheckpoints.map((checkpoint, i) => {
        const areaName = CHECKPOINT_AREAS[checkpoint.areaId] || `区域${checkpoint.areaId}`;
        const usedTime = parseInt(checkpoint.usedTime) || 0;
        const timeStr = usedTime > 60 ? `${Math.floor(usedTime / 60)}分${usedTime % 60}秒` : `${usedTime}秒`;
        return `<div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 12px; display: flex; flex-direction: column; align-items: center; flex-shrink: 0; animation: cardFloatIn 0.4s ease forwards; opacity: 0; animation-delay: ${i * 0.04}s;">
            <div style="color: #10b981; font-size: 0.72rem; white-space: nowrap;">${areaName}</div>
            <div style="color: #e2e8f0; font-weight: bold; font-size: 0.9rem; white-space: nowrap; margin-top: 2px;">${timeStr}</div>
        </div>`;
    }).join('');
    return `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 10px 12px; margin-bottom: 10px;">
        <div style="font-size: 0.72rem; color: #64748b; font-weight: bold; letter-spacing: 0.06em; margin-bottom: 8px;">区域用时</div>
        <div style="display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto;">${checkpointsHtml}</div>
    </div>`;
}

function renderEquipmentCompact(equipmentScheme, pluginsPerRow = 2) {
    if (!equipmentScheme || equipmentScheme.length === 0) return '<p style="color:#666; text-align:center; padding:1rem;">无配装数据</p>';
    const weaponsHtml = equipmentScheme.map((weapon, i) => {
        const weaponName = decodeURIComponent(weapon.weaponName || '');
        const pluginsHtml = (weapon.commonItems || []).map(plugin => {
            const pluginName = decodeURIComponent(plugin.itemName || '');
            return `<div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                <img src="${plugin.pic}" style="width: 56px; height: 56px; border-radius: 6px; background: rgba(255,255,255,0.05);" title="${pluginName}" loading="lazy">
                <span style="color: #94a3b8; font-size: 0.7rem; margin-top: 4px; line-height: 1.2; max-width: 70px; word-break: break-all;">${pluginName}</span>
            </div>`;
        }).join('');
        return `
            <div class="matte-card" style="padding: 14px; min-width: 200px; flex: 1; animation: cardFloatIn 0.4s ease forwards; opacity: 0; animation-delay: ${i * 0.08}s;">
                <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <img src="${weapon.pic}" alt="${weaponName}" style="width: 180px; height: 100px; border-radius: 8px; background: rgba(255,255,255,0.05); object-fit: contain;" loading="lazy">
                    <span style="color: #e2e8f0; font-weight: bold; font-size: 0.8rem; margin-top: 6px; text-align: center;">${weaponName}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(${pluginsPerRow}, 1fr); gap: 10px; justify-items: center;">${pluginsHtml}</div>
            </div>`;
    }).join('');
    return `<div style="display: flex; flex-wrap: wrap; gap: 10px;">${weaponsHtml}</div>`;
}

export function toggleMatchDetailView(btn) {
    const container = btn.closest('.match-details');
    if (!container) return;
    const isEquipmentView = container.classList.toggle('equipment-mode');
    const allStats = container.querySelectorAll('.player-view[id^="stats-"]');
    const allEquip = container.querySelectorAll('.player-view[id^="equipment-"]');
    const playerLists = container.querySelectorAll('.player-list');
    const userDetailRows = container.querySelectorAll('[data-player-id="self"]');
    const toggleText = btn.querySelector('#global-toggle-text');

    if (isEquipmentView) {
        allStats.forEach(el => el.classList.add('hidden'));
        allEquip.forEach(el => el.classList.remove('hidden'));
        playerLists.forEach(el => el.classList.add('large-mode'));
        userDetailRows.forEach(el => el.classList.add('large-mode'));
        if (toggleText) toggleText.textContent = '显示数据';
    } else {
        allStats.forEach(el => el.classList.remove('hidden'));
        allEquip.forEach(el => el.classList.add('hidden'));
        playerLists.forEach(el => el.classList.remove('large-mode'));
        userDetailRows.forEach(el => el.classList.remove('large-mode'));
        if (toggleText) toggleText.textContent = '显示配装';
    }
}
window.toggleMatchDetailView = toggleMatchDetailView;

function renderMatchDetail(data, container, mode) {
    if (window.innerWidth <= 768) {
        renderMatchDetailMobile(data, container, mode);
    } else {
        renderMatchDetailPC(data, container, mode);
    }
}

function renderMatchDetailMobile(data, container, mode) {
    const self = data.loginUserDetail;
    const teammates = (data.list || []).filter(p => p.nickname !== self.nickname);
    const showExtra = mode !== '塔防战' && mode !== '时空追猎';

    const selfData = { ...self, _isSelf: true };
    const allPlayers = [selfData, ...teammates];
    allPlayers.sort((a, b) => (parseInt(b.baseDetail.iScore) || 0) - (parseInt(a.baseDetail.iScore) || 0));

    let checkpointHtml = (self.huntingDetails?.partitionDetails?.length > 0)
        ? renderCheckpointTimes(self.huntingDetails.partitionDetails) : '';

    const playersHtml = allPlayers.map((p, idx) => playerCardHtml(p, idx, showExtra, p._isSelf)).join('');
    container.innerHTML = checkpointHtml +
        `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">${playersHtml}</div>`;
}

function renderMatchDetailPC(data, container, mode) {
    const self = data.loginUserDetail;
    const teammates = (data.list || []).filter(p => p.nickname !== self.nickname);
    teammates.sort((a, b) => (parseInt(b.baseDetail.iScore) || 0) - (parseInt(a.baseDetail.iScore) || 0));
    const showExtra = mode !== '塔防战' && mode !== '时空追猎';
    let checkpointHtml = (self.huntingDetails?.partitionDetails?.length > 0)
        ? renderCheckpointTimes(self.huntingDetails.partitionDetails) : '';

    const globalToggleHtml = `
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
            <button class="global-toggle-btn" onclick="toggleMatchDetailView(this)" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                <span id="global-toggle-text">显示配装</span>
            </button>
        </div>`;

    const teammatesHtml = teammates.map((p, idx) => {
        const info = p.baseDetail;
        const hunt = p.huntingDetails || {};
        const hasExtra = showExtra && ((hunt.damageTotalOnBoss || hunt.DamageTotalOnBoss) > 0 || (hunt.damageTotalOnMobs || hunt.DamageTotalOnMobs) > 0);
        const playerId = `teammate-${idx}`;
        return `
            <div class="matte-card" data-player-id="${playerId}" style="padding: 12px 14px; animation: cardFloatIn 0.4s ease forwards; opacity: 0; animation-delay: ${idx * 0.06}s;">
                <div id="stats-${playerId}" class="player-view">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <img src="${decodeURIComponent(p.avatar)}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; background:#333; flex-shrink:0;" onerror="this.src='images/maps-304.png'">
                        <div style="display:flex; flex-direction:column; overflow:hidden; flex:1;">
                            <div style="font-weight:bold; font-size:1.1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:0.25rem;">${decodeURIComponent(p.nickname)}</div>
                            <div style="display:flex; gap:1rem; font-size:1.05rem; flex-wrap:wrap;">
                                <span>积分: ${formatNumber(info.iScore)}</span>
                                <span>击杀: ${info.iKills}</span>
                                <span>死亡: ${info.iDeaths}</span>
                                ${hasExtra ? `<span style="color:#ef4444;">Boss伤: ${formatNumber(hunt.damageTotalOnBoss || hunt.DamageTotalOnBoss || 0)}</span><span style="color:#10b981;">小怪伤: ${formatNumber(hunt.damageTotalOnMobs || hunt.DamageTotalOnMobs || 0)}</span><span style="color:#d4a84b;">金币: ${formatNumber(hunt.totalCoin || 0)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div id="equipment-${playerId}" class="player-view hidden">
                    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:10px;">
                        <img src="${decodeURIComponent(p.avatar)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; background:#333;" onerror="this.src='images/maps-304.png'">
                        <span style="font-weight:bold; font-size:0.95rem;">${decodeURIComponent(p.nickname)}</span>
                    </div>
                    ${renderEquipmentCompact(p.equipmentScheme, 2)}
                </div>
            </div>`;
    }).join('');

    const selfInfo = self.baseDetail;
    const selfHunt = self.huntingDetails || {};
    const selfHtml = `
        <div class="matte-card" data-player-id="self" style="padding: 16px; margin-top: 1rem; border: 1px solid rgba(99, 102, 241, 0.3); animation: cardFloatIn 0.5s ease forwards; opacity: 0;">
            <div id="stats-self" class="player-view">
                <div style="display:flex; gap:1rem; align-items:center;">
                    <div style="flex-shrink:0; text-align:center;">
                        <img src="${decodeURIComponent(self.avatar)}" style="width:56px; height:56px; border-radius:50%; border:2px solid var(--accent);">
                        <div style="font-weight:bold; margin-top:0.25rem; font-size:1rem;">${decodeURIComponent(self.nickname)}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.6rem; flex-grow: 1;">
                        <div class="matte-card" style="padding: 14px; text-align: center;"><div style="font-size:0.85rem; color:var(--text-dim);">积分</div><div style="font-size:1.5rem; font-weight:bold;">${formatNumber(selfInfo.iScore)}</div></div>
                        <div class="matte-card" style="padding: 14px; text-align: center;"><div style="font-size:0.85rem; color:var(--text-dim);">击杀</div><div style="font-size:1.5rem; font-weight:bold;">${selfInfo.iKills}</div></div>
                        <div class="matte-card" style="padding: 14px; text-align: center;"><div style="font-size:0.85rem; color:var(--text-dim);">死亡</div><div style="font-size:1.5rem; font-weight:bold;">${selfInfo.iDeaths}</div></div>
                        ${showExtra ? `
                        <div class="matte-card" style="padding: 14px; text-align: center;"><div style="font-size:0.85rem; color:var(--text-dim);">Boss伤害</div><div style="font-size:1.5rem; font-weight:bold; color:#ef4444;">${formatNumber(selfHunt.damageTotalOnBoss || selfHunt.DamageTotalOnBoss || 0)}</div></div>
                        <div class="matte-card" style="padding: 14px; text-align: center;"><div style="font-size:0.85rem; color:var(--text-dim);">小怪伤害</div><div style="font-size:1.5rem; font-weight:bold; color:#10b981;">${formatNumber(selfHunt.damageTotalOnMobs || selfHunt.DamageTotalOnMobs || 0)}</div></div>
                        <div class="matte-card" style="padding: 14px; text-align: center;"><div style="font-size:0.85rem; color:var(--text-dim);">金币</div><div style="font-size:1.5rem; font-weight:bold; color:#d4a84b;">${formatNumber(selfHunt.totalCoin || 0)}</div></div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div id="equipment-self" class="player-view hidden">
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:10px;">
                    <img src="${decodeURIComponent(self.avatar)}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid var(--accent);">
                    <span style="font-weight:bold; font-size:0.95rem;">${decodeURIComponent(self.nickname)}</span>
                </div>
                ${renderEquipmentCompact(self.equipmentScheme, 4)}
            </div>
        </div>`;

    container.innerHTML = checkpointHtml + globalToggleHtml +
        '<div class="player-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; margin-top: 0.5rem;">' + teammatesHtml + '</div>' + selfHtml;
}

function playerCardHtml(p, idx, showExtra, isSelf) {
    const info = p.baseDetail;
    const hunt = p.huntingDetails || {};
    const nickname = decodeURIComponent(p.nickname || '');
    const avatar = decodeURIComponent(p.avatar || '');
    const selfBorder = isSelf ? 'border: 1px solid rgba(212, 168, 75, 0.5);' : '';
    const selfLabel = isSelf ? `<span style="font-size:0.7rem; color: #d4a84b; margin-left: 4px;">(我)</span>` : '';

    const stat = (value, label, color = '#e2e8f0') => `
        <div style="text-align: center; min-width: 50px;">
            <div style="font-size: 1rem; font-weight: bold; color: ${color}; line-height: 1.2;">${value}</div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${label}</div>
        </div>`;

    const bossDmg = parseInt(hunt.damageTotalOnBoss || hunt.DamageTotalOnBoss || 0);
    const mobDmg = parseInt(hunt.damageTotalOnMobs || hunt.DamageTotalOnMobs || 0);
    const coin = parseInt(hunt.totalCoin || 0);
    const hasExtra = showExtra && (bossDmg > 0 || mobDmg > 0);

    return `
        <div class="matte-card" style="padding: 12px 14px; ${selfBorder} animation: cardFloatIn 0.4s ease forwards; opacity: 0; animation-delay: ${idx * 0.05}s;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="flex-shrink: 0; text-align: center; width: 52px;">
                    <img src="${avatar}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; background: #333; ${isSelf ? 'border: 2px solid #d4a84b;' : ''}" onerror="this.src='images/maps-304.png'">
                    <div style="font-size: 0.72rem; color: ${isSelf ? '#d4a84b' : '#94a3b8'}; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 52px; word-break: break-all; line-height: 1.3;">${nickname}</div>
                </div>
                <div style="flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 4px; align-items: center;">
                    ${stat(formatNumber(info.iScore), '积分', '#ffffff')}
                    ${stat(info.iKills, '击杀', '#ffffff')}
                    ${stat(info.iDeaths, '死亡', '#ffffff')}
                    ${hasExtra ? stat(formatNumber(bossDmg), 'Boss伤害', '#ef4444') : (showExtra ? stat('—', 'Boss伤害', '#475569') : '')}
                    ${hasExtra ? stat(formatNumber(mobDmg), '小怪伤害', '#10b981') : (showExtra ? stat('—', '小怪伤害', '#475569') : '')}
                    ${showExtra ? stat(coin > 0 ? formatNumber(coin) : '—', '金币', coin > 0 ? '#d4a84b' : '#475569') : ''}
                </div>
                <div style="flex-shrink: 0; font-size: 1rem; font-weight: bold; color: ${['#ef4444', '#d4a84b', '#94a3b8', '#7c4a1e'][idx] || '#475569'};">#${idx + 1}</div>
            </div>
        </div>`;
}

export async function calculateRecentBossDamage(gameList) {
    if (!gameList || !gameList.length) {
        if (dom.recentBossDmg) dom.recentBossDmg.textContent = '-';
        return;
    }
    const huntGames = gameList.filter(g => g.modeName && g.modeName.includes('猎场'));
    if (huntGames.length === 0) {
        if (dom.recentBossDmg) dom.recentBossDmg.textContent = '-';
        return;
    }

    const gamesToFetch = huntGames.slice(0, 10);
    let totalBossDmg = 0;
    let validCount = 0;

    if (dom.recentBossDmg) dom.recentBossDmg.textContent = '计算中...';

    try {
        const batchSize = 5;
        for (let i = 0; i < gamesToFetch.length; i += batchSize) {
            const batch = gamesToFetch.slice(i, i + batchSize);
            const promises = batch.map(g => api.getMatchDetail(g.DsRoomId).catch(() => null));
            const results = await Promise.all(promises);
            results.forEach(res => {
                if (res && res.success && res.data && res.data.loginUserDetail) {
                    const huntInfo = res.data.loginUserDetail.huntingDetails || {};
                    const dmg = parseInt(huntInfo.damageTotalOnBoss || huntInfo.DamageTotalOnBoss || 0);
                    if (dmg >= 0 && !isNaN(dmg)) {
                        totalBossDmg += dmg;
                        validCount++;
                    }
                }
            });
            if (i + batchSize < gamesToFetch.length) await new Promise(r => setTimeout(r, 300));
        }
        let avg = validCount > 0 ? Math.floor(totalBossDmg / validCount) : 0;
        if (state.data) state.data.calcAvgBossDamage = avg;
        if (dom.recentBossDmg) dom.recentBossDmg.textContent = avg > 0 ? formatNumber(avg) : '0';
    } catch (e) {
        if (dom.recentBossDmg) dom.recentBossDmg.textContent = '获取失败';
    }
}
