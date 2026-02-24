import { dom } from './ui_components.js';

export function getQualityBadge(quality) {
    switch (quality) {
        case 4: return '<span class="collection-item-badge badge-legendary">传说</span>';
        case 3: return '<span class="collection-item-badge badge-epic">史诗</span>';
        case 2: return '<span class="collection-item-badge badge-rare">稀有</span>';
        default: return '<span class="collection-item-badge badge-common">普通</span>';
    }
}

export function renderWeapons(weapons, filterQuality = 'all') {
    if (!weapons) return;
    let filtered = filterQuality === 'all' ? [...weapons] : weapons.filter(w => w.quality == filterQuality);
    filtered.sort((a, b) => {
        if (a.owned !== b.owned) return a.owned ? -1 : 1;
        return (b.quality || 0) - (a.quality || 0);
    });
    dom.weaponGrid.innerHTML = filtered.map((w, i) => `
        <div class="collection-item ${w.owned ? '' : 'not-owned'}" data-quality="${w.quality}" style="position: relative; animation: cardFloatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${0.2 + (Math.min(i, 100) * 0.02)}s;">
            <div style="position: absolute; top: 8px; left: 8px; background: ${w.owned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${w.owned ? '#10b981' : '#ef4444'}; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; border: 1px solid ${w.owned ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; z-index: 2;">${w.owned ? '已拥有' : '未拥有'}</div>
            ${getQualityBadge(w.quality)}
            <img class="collection-item-img" src="${w.pic}" alt="${w.weaponName}" loading="lazy">
            <div class="collection-item-info">
                <div class="collection-item-name" title="${w.weaponName}">${w.weaponName}</div>
            </div>
        </div>`).join('');
}

export function renderTraps(traps) {
    if (!traps || !dom.trapGrid) return;
    dom.trapGrid.innerHTML = traps.map((t, i) => `
        <div class="collection-item ${t.owned ? '' : 'not-owned'}" style="position: relative; animation: cardFloatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${0.2 + (Math.min(i, 100) * 0.02)}s;">
            <div style="position: absolute; top: 8px; left: 8px; background: ${t.owned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${t.owned ? '#10b981' : '#ef4444'}; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; border: 1px solid ${t.owned ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; z-index: 2;">${t.owned ? '已拥有' : '未拥有'}</div>
            <img class="collection-item-img" src="${t.icon}" alt="${t.trapName}" loading="lazy">
            <div class="collection-item-info">
                <div class="collection-item-name" title="${t.trapName}">${t.trapName}</div>
            </div>
        </div>`).join('');
}

export function renderPlugins(plugins, filterSlot = 'all') {
    if (!plugins || !dom.pluginGrid) return;
    const filtered = filterSlot === 'all' ? plugins : plugins.filter(p => p.slotIndex == filterSlot);
    dom.pluginGrid.innerHTML = filtered.map((p, i) => `
        <div class="collection-item ${p.owned ? '' : 'not-owned'}" data-slot="${p.slotIndex}" style="animation: cardFloatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${0.2 + (Math.min(i, 100) * 0.02)}s;">
            ${getQualityBadge(p.quality)}
            <img class="collection-item-img" src="${p.pic}" alt="${p.itemName}" loading="lazy">
            <div class="collection-item-info">
                <div class="collection-item-name" title="${p.itemName}">${p.itemName}</div>
            </div>
        </div>`).join('');
}

export function renderFragments(fragments) {
    if (!fragments || !dom.fragmentList) return;
    if (fragments.length === 0) {
        dom.fragmentList.innerHTML = '<p style="color:#888;font-size:0.9rem;">暂无碎片进度</p>';
        return;
    }
    const withProgress = fragments.filter(f => f.itemProgress && f.itemProgress.current > 0);
    if (withProgress.length === 0) {
        dom.fragmentList.innerHTML = '<p style="color:#888;font-size:0.9rem;">暂无碎片进度</p>';
        return;
    }
    dom.fragmentList.innerHTML = withProgress.map((f, i) => {
        const progress = f.itemProgress;
        const percent = Math.min(100, (progress.current / progress.required) * 100);
        const isComplete = progress.current >= progress.required;
        return `
            <div class="progress-item" style="animation: cardFloatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: ${0.4 + (Math.min(i, 100) * 0.04)}s;">
                <img class="progress-icon" src="${f.pic || ''}" alt="${f.weaponName}">
                <div class="progress-info">
                    <div class="progress-name">${f.weaponName}</div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill ${isComplete ? 'complete' : ''}" style="width:${percent}%"></div>
                    </div>
                    <div class="progress-text">${progress.current}/${progress.required}</div>
                </div>
            </div>`;
    }).join('');
}
