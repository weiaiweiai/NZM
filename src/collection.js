import IMG_MAP from './img_map.js';

// Collection APIs for testing
const HEADERS = {
    'Host': 'comm.ams.game.qq.com',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B)',
    'Referer': 'https://servicewechat.com/wx4e8cbe4fb0eca54c/9/page-frame.html',
    'xweb_xhr': '1',
};
const API_URL = 'https://comm.ams.game.qq.com/ide/';

function normalizeCookie(cookie) {
    return (cookie || '').replace(/[\r\n]/g, '').trim();
}

function buildBody(method, param) {
    const params = {
        iChartId: '430662', iSubChartId: '430662', sIdeToken: 'NoOapI',
        eas_url: 'http://wechatmini.qq.com/-/-/pages/handbook/handbook/',
        method: method, from_source: '2',
        param: JSON.stringify(param),
    };
    return new URLSearchParams(params).toString();
}

// === Image URL Rewrite Helper ===
function rewriteUrls(list) {
    if (!list || !Array.isArray(list)) return list;
    return list.map(item => {
        if (item.pic && IMG_MAP[item.pic]) item.pic = IMG_MAP[item.pic];
        if (item.icon && IMG_MAP[item.icon]) item.icon = IMG_MAP[item.icon];
        return item;
    });
}

// 武器图鉴
async function fetchWeaponCollection(cookie) {
    const cleanCookie = normalizeCookie(cookie);
    const body = buildBody('collection.weapon.list', { seasonID: 1, queryTime: true });
    try {
        const res = await fetch(API_URL, { method: 'POST', headers: { ...HEADERS, 'Cookie': cleanCookie }, body });
        const data = await res.json();
        return rewriteUrls(data.jData?.data?.data?.list) || null;
    } catch (e) { return { error: e.message }; }
}

// 塔防图鉴
async function fetchTrapCollection(cookie) {
    const cleanCookie = normalizeCookie(cookie);
    const body = buildBody('collection.trap.list', { seasonID: 1 });
    try {
        const res = await fetch(API_URL, { method: 'POST', headers: { ...HEADERS, 'Cookie': cleanCookie }, body });
        const data = await res.json();
        return rewriteUrls(data.jData?.data?.data?.list) || null;
    } catch (e) { return { error: e.message }; }
}

// 插件图鉴
async function fetchPluginCollection(cookie) {
    const cleanCookie = normalizeCookie(cookie);
    const body = buildBody('collection.plugin.list', { seasonID: 1 });
    try {
        const res = await fetch(API_URL, { method: 'POST', headers: { ...HEADERS, 'Cookie': cleanCookie }, body });
        const data = await res.json();
        return rewriteUrls(data.jData?.data?.data?.list) || null;
    } catch (e) { return { error: e.message }; }
}

// 首页碎片进度
async function fetchCollectionHome(cookie) {
    const cleanCookie = normalizeCookie(cookie);
    const body = buildBody('collection.home', { seasonID: 1, limit: 4 });
    try {
        const res = await fetch(API_URL, { method: 'POST', headers: { ...HEADERS, 'Cookie': cleanCookie }, body });
        const data = await res.json();
        return rewriteUrls(data.jData?.data?.data?.weaponList) || null;
    } catch (e) { return { error: e.message }; }
}

export async function handleCollection(request) {
    const cookie = request.headers.get('X-NZM-Cookie');
    if (!cookie) return new Response(JSON.stringify({ success: false, message: 'Missing Cookie' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';

    let result = {};
    const tasks = [];

    if (type === 'all' || type === 'weapon') {
        tasks.push(fetchWeaponCollection(cookie).then(data => {
            result.weapons = data;
            if (data && Array.isArray(data)) {
                result.weaponSummary = { total: data.length, owned: data.filter(w => w.owned).length };
            }
        }));
    }
    if (type === 'all' || type === 'trap') {
        tasks.push(fetchTrapCollection(cookie).then(data => {
            result.traps = data;
            if (data && Array.isArray(data)) {
                result.trapSummary = { total: data.length, owned: data.filter(t => t.owned).length };
            }
        }));
    }
    if (type === 'all' || type === 'plugin') {
        tasks.push(fetchPluginCollection(cookie).then(data => {
            result.plugins = data;
            if (data && Array.isArray(data)) {
                result.pluginSummary = { total: data.length, owned: data.filter(p => p.owned).length };
            }
        }));
    }
    if (type === 'all' || type === 'home') {
        tasks.push(fetchCollectionHome(cookie).then(data => result.home = data));
    }

    await Promise.all(tasks);

    return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
