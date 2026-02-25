import { API_BASE } from './config.js';
import { state } from './state.js';

// ============================================================
// 本地缓存层 - 减少 Worker 请求量
// 缓存有效期 5 分钟，5 分钟内重复访问直接从 sessionStorage 读取
// ============================================================
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟 (毫秒)
const CACHE_PREFIX = 'nzm_cache_';

function getCachedData(key) {
    try {
        const raw = sessionStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) {
            sessionStorage.removeItem(CACHE_PREFIX + key);
            return null; // 已过期
        }
        return data;
    } catch { return null; }
}

function setCachedData(key, data) {
    try {
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* 存储满了就跳过，不影响功能 */ }
}

/**
 * 清除所有缓存 (用于手动刷新按钮)
 */
export function clearApiCache() {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
}

// ============================================================
// 基础请求函数
// ============================================================
export async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    if (state.cookie) {
        options.headers = {
            ...options.headers,
            'X-NZM-Cookie': state.cookie
        };
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
    }

    return await response.json();
}

/**
 * 带缓存的请求：先查本地缓存，命中则跳过网络请求
 * @param {string} cacheKey - 缓存键名
 * @param {string} endpoint - API 路径
 * @param {boolean} forceRefresh - 强制刷新（忽略缓存）
 */
async function cachedRequest(cacheKey, endpoint, forceRefresh = false) {
    if (!forceRefresh) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            console.log(`[Cache] HIT: ${cacheKey}`);
            return cached;
        }
    }
    console.log(`[Cache] MISS: ${cacheKey}, fetching...`);
    const data = await apiRequest(endpoint);
    if (data.success) {
        setCachedData(cacheKey, data);
    }
    return data;
}

// ============================================================
// 节点选择
// ============================================================
function getSelectedNode() {
    const cnBtn = document.getElementById('node-cn');
    if (cnBtn && cnBtn.classList.contains('active')) return 'cn';
    return 'cf';
}

// ============================================================
// API 接口
// ============================================================
export const api = {
    // Auth - 登录相关不缓存
    getQqQR: () => apiRequest(`/auth/qr?node=${getSelectedNode()}`),
    checkQqQR: (sig) => apiRequest(`/auth/check?qrsig=${sig}&node=${getSelectedNode()}`),
    getWxQR: () => apiRequest(`/auth/wx-qr?node=${getSelectedNode()}`),
    checkWxQR: (uuid) => apiRequest(`/auth/wx-check?uuid=${uuid}&node=${getSelectedNode()}`),

    // Data - 带 5 分钟缓存
    getStats: (forceRefresh = false) => cachedRequest('stats', '/stats', forceRefresh),
    getCollection: (type = 'all', forceRefresh = false) => cachedRequest(`collection_${type}`, `/collection?type=${type}`, forceRefresh),

    // Detail - 按 roomId 缓存
    getMatchDetail: (roomId) => cachedRequest(`detail_${roomId}`, `/detail?room_id=${roomId}`)
};
