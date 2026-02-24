// Auth Router - 根据前端传入的 ?node= 参数选择登录节点
// node=cn  → 走国内 (上海阿里云) 服务器代理
// node=cf  → 走 Cloudflare 边缘网络直连 (默认)

import * as proxy from './auth_proxy.js';
import * as edge from './auth_edge.js';

/**
 * 从请求 URL 中读取 node 参数，决定使用哪个处理模块
 * @returns {'cn' | 'cf'}
 */
function getNode(request) {
    const url = new URL(request.url);
    const node = url.searchParams.get('node');
    return (node === 'cn') ? 'cn' : 'cf';
}

// --- QQ ---
export async function handleAuthQR(request, env) {
    const node = getNode(request);
    console.log(`[Auth Router] QR request -> node=${node}`);
    if (node === 'cn') return proxy.handleAuthQR(request, env);
    return edge.handleAuthQR(request);
}

export async function handleAuthCheck(request, env) {
    const node = getNode(request);
    console.log(`[Auth Router] Check request -> node=${node}`);
    if (node === 'cn') return proxy.handleAuthCheck(request, env);
    return edge.handleAuthCheck(request);
}

// --- WeChat ---
export async function handleWxQR(request, env) {
    const node = getNode(request);
    console.log(`[Auth Router] WX QR request -> node=${node}`);
    if (node === 'cn') return proxy.handleWxQR(request, env);
    return edge.handleWxQR(request);
}

export async function handleWxCheck(request, env) {
    const node = getNode(request);
    console.log(`[Auth Router] WX Check request -> node=${node}`);
    if (node === 'cn') return proxy.handleWxCheck(request, env);
    return edge.handleWxCheck(request);
}
