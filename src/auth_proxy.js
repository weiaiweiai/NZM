// Auth Proxy - 将认证请求安全地转发到国内服务器 (api.haman.moe)
// API Key 从 Worker 环境变量 NZM_AUTH_KEY 中获取，前端完全看不到

const AUTH_SERVER = 'https://api.haman.moe';

// 路由映射: Worker路径 -> 国内服务器路径
const ROUTE_MAP = {
    '/api/auth/qr': '/api/qr',
    '/api/auth/check': '/api/check',
    '/api/auth/wx-qr': '/api/wx/qr',
    '/api/auth/wx-check': '/api/wx/check',
};

/**
 * 通用代理函数：将前端请求安全地转发到国内认证服务器
 */
async function proxyToAuthServer(request, env, targetPath) {
    const incomingUrl = new URL(request.url);

    // 构建目标 URL，保留原始查询参数 (如 qrsig=xxx, uuid=xxx)，但移除 node 参数
    const params = new URLSearchParams(incomingUrl.search);
    params.delete('node'); // 不要把 node 参数传给国内服务器
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const targetUrl = `${AUTH_SERVER}${targetPath}${queryString}`;

    console.log(`[Auth Proxy] ${incomingUrl.pathname} -> ${targetUrl}`);

    const resp = await fetch(targetUrl, {
        method: request.method,
        headers: {
            'x-nzm-key': env.NZM_AUTH_KEY,
            'User-Agent': 'NZM-Worker/1.0',
        },
    });

    const body = await resp.text();
    return new Response(body, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export async function handleAuthQR(request, env) {
    return proxyToAuthServer(request, env, ROUTE_MAP['/api/auth/qr']);
}

export async function handleAuthCheck(request, env) {
    return proxyToAuthServer(request, env, ROUTE_MAP['/api/auth/check']);
}

export async function handleWxQR(request, env) {
    return proxyToAuthServer(request, env, ROUTE_MAP['/api/auth/wx-qr']);
}

export async function handleWxCheck(request, env) {
    return proxyToAuthServer(request, env, ROUTE_MAP['/api/auth/wx-check']);
}
