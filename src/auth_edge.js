// Auth Edge - Cloudflare 边缘节点直接处理登录（原始方案）
// 不经过国内服务器，直接在 CF Worker 中完成 QQ/微信 OAuth 流程

import { getPtqrToken, getGTK } from './utils.js';

export async function handleAuthQR(request) {
    const clientId = '101491592';
    const authUrl = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=https://nzm.qq.com/&scope=all`;

    console.log(`[QQ QR - Edge] Init Discovery: ${authUrl}`);

    let realAppId = '716027609';
    let daid = '383';
    let pt_3rd_aid = clientId;
    let xloginUrl = '';

    try {
        let resp = await fetch(authUrl, { redirect: 'manual' });
        let location = resp.headers.get('Location');

        if (location) {
            console.log(`[QQ QR - Edge] Redirect 1: ${location}`);
            if (location.includes('/show')) {
                resp = await fetch(location);
                const html = await resp.text();
                const iframeMatch = html.match(/src="([^"]*xui\.ptlogin2\.qq\.com\/cgi-bin\/xlogin[^"]*)"/);
                if (iframeMatch) {
                    xloginUrl = iframeMatch[1].replace(/&amp;/g, '&');
                    console.log(`[QQ QR - Edge] Found xlogin iframe: ${xloginUrl}`);

                    const urlObj = new URL(xloginUrl);
                    if (urlObj.searchParams.has('appid')) realAppId = urlObj.searchParams.get('appid');
                    if (urlObj.searchParams.has('daid')) daid = urlObj.searchParams.get('daid');
                } else {
                    console.log('[QQ QR - Edge] xlogin iframe not found in /show page, using defaults.');
                }
            } else if (location.includes('xlogin')) {
                xloginUrl = location;
                const urlObj = new URL(location);
                if (urlObj.searchParams.has('appid')) realAppId = urlObj.searchParams.get('appid');
                if (urlObj.searchParams.has('daid')) daid = urlObj.searchParams.get('daid');
            }
        }
    } catch (e) {
        console.error(`[QQ QR - Edge] Discovery Error: ${e.message}`);
    }

    console.log(`[QQ QR - Edge] Final Params - AppID: ${realAppId}, DAID: ${daid}, 3rd_AID: ${pt_3rd_aid}`);

    const qrUrl = `https://ssl.ptlogin2.qq.com/ptqrshow?appid=${realAppId}&e=2&l=M&s=3&d=72&v=4&t=0.5${Date.now()}&daid=${daid}&pt_3rd_aid=${pt_3rd_aid}`;

    const referer = xloginUrl || `https://xui.ptlogin2.qq.com/cgi-bin/xlogin?appid=${realAppId}&daid=${daid}&style=33&login_text=%E6%8E%88%E6%9D%83%E5%B9%B6%E7%99%BB%E5%BD%95&hide_title_bar=1&hide_border=1&target=self&s_url=https%3A%2F%2Fgraph.qq.com%2Foauth2.0%2Flogin_jump&pt_3rd_aid=${pt_3rd_aid}&pt_feedback_link=https%3A%2F%2Fsupport.qq.com%2Fproducts%2F77942%3FcustomInfo%3Dwww.qq.com`;

    console.log(`[QQ QR - Edge] Fetching QR from: ${qrUrl}`);
    const resp = await fetch(qrUrl, {
        headers: {
            'Referer': referer,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!resp.ok) {
        console.error(`[QQ QR - Edge] Fetch failed: ${resp.status}`);
        return new Response(JSON.stringify({ success: false, message: `二维码获取失败 HTTP ${resp.status}` }));
    }

    const setCookie = resp.headers.get('set-cookie') || '';
    let qrsig = '';
    const match = setCookie.match(/qrsig=([^;,]+)/);
    if (match) qrsig = match[1];

    // Workers 环境中使用 getSetCookie (如果可用)
    if (!qrsig && typeof resp.headers.getSetCookie === 'function') {
        for (const c of resp.headers.getSetCookie()) {
            const m = c.match(/qrsig=([^;,]+)/);
            if (m) { qrsig = m[1]; break; }
        }
    }

    console.log(`[QQ QR - Edge] Got qrsig: ${qrsig ? 'Yes' : 'No'}`);

    const arrayBuffer = await resp.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:image/png;base64,${base64}`;

    return new Response(JSON.stringify({
        success: true,
        data: { qrcode: dataUrl, qrsig: qrsig }
    }), { headers: { 'Content-Type': 'application/json' } });
}

export async function handleAuthCheck(request) {
    const url = new URL(request.url);
    const qrsig = url.searchParams.get('qrsig');

    if (!qrsig) return new Response(JSON.stringify({ msg: 'missing qrsig' }));
    console.log(`[QQ Login - Edge] Received qrsig: ${qrsig.substring(0, 5)}...`);

    const ptqrtoken = getPtqrToken(qrsig);
    console.log(`[QQ Login - Edge] Generated ptqrtoken: ${ptqrtoken}`);

    const appId = '716027609';
    const daid = '383';
    const pt_3rd_aid = '101491592';

    const redirectUri = 'https://milo.qq.com/comm-htdocs/login/qc_redirect.html?parent_domain=https%3A%2F%2Fnzm.qq.com&isMiloSDK=1&isPc=1';

    const u1 = encodeURIComponent(`https://graph.qq.com/oauth2.0/login_jump?response_type=code&client_id=${pt_3rd_aid}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=&state=STATE`);

    const checkUrl = `https://ssl.ptlogin2.qq.com/ptqrlogin?u1=${u1}&ptqrtoken=${ptqrtoken}&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-${Date.now()}&js_ver=21020514&js_type=1&login_sig=&pt_uistyle=40&aid=${appId}&daid=${daid}&pt_3rd_aid=${pt_3rd_aid}&`;
    console.log(`[QQ Login - Edge] Check URL: ${checkUrl}`);

    const userAgent = request.headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    try {
        const resp = await fetch(checkUrl, {
            headers: {
                'Cookie': `qrsig=${qrsig}`,
                'User-Agent': userAgent
            }
        });
        const text = await resp.text();
        console.log(`[QQ Login - Edge] ptqrlogin response: ${text.trim()}`);

        if (text.includes("ptuiCB('0'")) {
            const checkSigMatch = text.match(/ptuiCB\('0','0','(.*?)','0','(.*?)', '(.*?)'/);
            if (!checkSigMatch) {
                console.error('[QQ Login - Edge] Failed to extract check_sig URL');
                return new Response(JSON.stringify({ success: false, message: '无法获取登录签名' }));
            }

            const checkSigUrl = checkSigMatch[1];
            console.log(`[QQ Login - Edge] Found checkSigUrl: ${checkSigUrl}`);

            const sigResp = await fetch(checkSigUrl, {
                redirect: 'manual',
                headers: { 'User-Agent': userAgent }
            });

            const sigLocation = sigResp.headers.get('Location');

            let cookieList = [];
            if (typeof sigResp.headers.getSetCookie === 'function') {
                cookieList = sigResp.headers.getSetCookie();
            } else {
                const raw = sigResp.headers.get('set-cookie') || '';
                cookieList = [raw];
            }

            const cookieMap = new Map();
            const rawHeader = sigResp.headers.get('set-cookie') || '';

            const kvMatches = rawHeader.matchAll(/([a-zA-Z0-9_]+)=([^;,\s]+)/g);
            for (const m of kvMatches) {
                const k = m[1];
                const v = m[2];
                const lowerK = k.toLowerCase();
                if (['expires', 'path', 'domain', 'httponly', 'secure', 'samesite', 'max-age'].includes(lowerK)) continue;
                if (['wed', 'thu', 'fri', 'sat', 'sun', 'mon', 'tue', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'gmt'].includes(lowerK)) continue;
                cookieMap.set(k, v);
            }

            const userCookies = `ui=607785AE-E678-4701-A497-764D0FC49846; RK=boGUZXEvRm; ptcz=c786dc6971b607216b225c2286030a5f788d5c6dbdf5dafcaebc1abd58600cfc; eas_sid=y1C7E545m1g0X1q0Y5x3I9N1O0; _qimei_uuid42=1990d103a0b10060e28b87e1b78f54e4d5d0589383; _qimei_fingerprint=58c9794e0ac8bdca6abac516582ce27e; _qimei_i_3=45cc2d85c00b568a9397fa61088671e5f5eea1f6150a0080b2da2a592fc0733a606430943989e2adb1a1; _qimei_h38=527fddbbe28b87e1b78f54e40200000211990d; qq_domain_video_guid_verify=5767bb84755b9a66; _qimei_q32=0b1382900c79cd3bfa956a75180e9a41; _qimei_q36=3e02d6fa1162248bbcd679da300013419805; Qs_lvt_323937=1761515531; Qs_pv_323937=327942189078664400; _qimei_i_2=7abf4681c05a528fc7c1af315a8271e2f3e6f6a3410f0585bddb795b2693206d6267369c3089e7a687b1; _qimei_i_1=5ae04d87975d068f95c5ac65598c21e8f0bba5a315535587b0da2c582493206c616335943980ebdc8297fbf8; pgv_pvid=5239924134; _qpsvr_localtk=0.295834881636138; pt_login_type=3;`;

            const constructed = [];
            for (const [k, v] of cookieMap) {
                constructed.push(`${k}=${v}`);
            }
            const dynamicCookies = constructed.join('; ');
            const usefulCookies = userCookies + ' ' + dynamicCookies;

            const jumpUrl = sigLocation || decodeURIComponent(u1);

            const pSkey = cookieMap.get('p_skey') || cookieMap.get('skey') || '';
            const g_tk = getGTK(pSkey);
            const ui = '607785AE-E678-4701-A497-764D0FC49846';

            await fetch(jumpUrl, {
                headers: {
                    'Cookie': usefulCookies,
                    'Referer': 'https://xui.ptlogin2.qq.com/',
                    'User-Agent': userAgent
                }
            });

            const authBase = 'https://graph.qq.com/oauth2.0/authorize';
            const authParams = new URLSearchParams();
            authParams.append('response_type', 'code');
            authParams.append('client_id', '101491592');
            authParams.append('redirect_uri', redirectUri);
            authParams.append('scope', '');
            authParams.append('state', 'STATE');
            authParams.append('switch', '');
            authParams.append('from_ptlogin', '1');
            authParams.append('src', '1');
            authParams.append('update_auth', '1');
            authParams.append('openapi', '1010');
            authParams.append('g_tk', g_tk);
            authParams.append('auth_time', Date.now().toString());
            authParams.append('ui', ui);

            const authResp = await fetch(authBase, {
                method: 'POST',
                headers: {
                    'Cookie': usefulCookies,
                    'Referer': 'https://graph.qq.com/oauth2.0/show?which=Login&display=pc&response_type=code&state=STATE&client_id=101491592&redirect_uri=https%3A%2F%2Fmilo.qq.com%2Fcomm-htdocs%2Flogin%2Fqc_redirect.html%3Fparent_domain%3Dhttps%253A%252F%252Fnzm.qq.com%26isMiloSDK%3D1%26isPc%3D1',
                    'User-Agent': userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: authParams,
                redirect: 'manual'
            });

            const location = authResp.headers.get('Location');

            if (location) {
                const urlObj = new URL(location);
                let code = urlObj.searchParams.get('code');

                if (!code) {
                    const codeMatch = location.match(/[?&]code=([^&]+)/);
                    if (codeMatch) code = codeMatch[1];
                }

                if (code) {
                    const result = await exchangeCode(code, 'qc', pt_3rd_aid);
                    if (result.success) {
                        const tokenData = result.data;
                        const accessToken = tokenData.access_token;
                        const finalCookie = `acctype=qc; openid=${tokenData.openid}; appid=${pt_3rd_aid}; access_token=${accessToken}`;
                        return new Response(JSON.stringify({
                            success: true, status: 0, message: '登录成功',
                            data: { cookie: finalCookie }
                        }), { headers: { 'Content-Type': 'application/json' } });
                    } else {
                        return new Response(JSON.stringify({ success: false, message: result.error || 'Token交换失败' }));
                    }
                }
            }
            return new Response(JSON.stringify({ success: false, message: '获取Auth Code失败' }));

        } else if (text.includes("ptuiCB('66'")) {
            return new Response(JSON.stringify({ success: true, status: 66, message: '请使用手机QQ扫码' }));
        } else if (text.includes("ptuiCB('67'")) {
            return new Response(JSON.stringify({ success: true, status: 67, message: '请在手机上确认登录' }));
        } else if (text.includes("ptuiCB('65'")) {
            return new Response(JSON.stringify({ success: true, status: 65, message: '二维码已过期' }));
        } else {
            return new Response(JSON.stringify({ success: false, status: -1, message: '状态异常', raw: text }));
        }
    } catch (e) {
        console.error('[QQ Login - Edge] Exception:', e.message);
        return new Response(JSON.stringify({ success: false, status: -1, message: '请求失败: ' + e.message }));
    }
}

// --- WeChat QR Login ---
const WX_APPID = 'wxfa0c35392d06b82f';
const WX_REDIRECT_URI = 'https://iu.qq.com/comm-htdocs/login/milosdk/wx_pc_redirect.html';

export async function handleWxQR(request) {
    const qrPageUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WX_APPID}&redirect_uri=${encodeURIComponent(WX_REDIRECT_URI)}&response_type=code&scope=snsapi_login&state=1`;

    try {
        const resp = await fetch(qrPageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const html = await resp.text();

        const uuidMatch = html.match(/\/connect\/qrcode\/([a-zA-Z0-9_-]+)/);
        if (!uuidMatch) {
            return new Response(JSON.stringify({ success: false, message: '获取微信二维码失败' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const uuid = uuidMatch[1];
        const qrImgUrl = `https://open.weixin.qq.com/connect/qrcode/${uuid}`;

        const imgResp = await fetch(qrImgUrl);
        const imgBuf = await imgResp.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
        const dataUrl = `data:${contentType};base64,${base64}`;

        return new Response(JSON.stringify({
            success: true,
            data: { qrcode: dataUrl, uuid }
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function handleWxCheck(request) {
    const url = new URL(request.url);
    const uuid = url.searchParams.get('uuid');
    if (!uuid) return new Response(JSON.stringify({ success: false, message: 'missing uuid' }));

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        let text;
        try {
            const checkUrl = `https://long.open.weixin.qq.com/connect/l/qrconnect?uuid=${uuid}&_=${Date.now()}`;
            const resp = await fetch(checkUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: controller.signal
            });
            text = await resp.text();
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                return new Response(JSON.stringify({ success: true, status: 408, message: '等待扫码' }));
            }
            throw e;
        }
        clearTimeout(timeoutId);

        const errMatch = text.match(/wx_errcode=(\d+)/);
        const codeMatch = text.match(/wx_code='([^']*)'/);

        const errcode = errMatch ? parseInt(errMatch[1]) : -1;
        const wxCode = codeMatch ? codeMatch[1] : '';

        if (errcode === 405 && wxCode) {
            const result = await exchangeCode(wxCode, 'wx', WX_APPID);
            if (result.success) {
                const tokenData = result.data;
                const cookie = `acctype=wx; openid=${tokenData.openid}; appid=${WX_APPID}; access_token=${tokenData.access_token}; refresh_token=${tokenData.refresh_token}`;
                return new Response(JSON.stringify({
                    success: true, status: 0, message: '登录成功',
                    data: { cookie }
                }), { headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({
                success: false, status: -1,
                message: result.error || 'Token交换失败'
            }), { headers: { 'Content-Type': 'application/json' } });
        } else if (errcode === 408) {
            return new Response(JSON.stringify({ success: true, status: 408, message: '等待扫码' }));
        } else if (errcode === 404) {
            return new Response(JSON.stringify({ success: true, status: 404, message: '已扫码，请确认' }));
        } else if (errcode === 402 || errcode === 403) {
            return new Response(JSON.stringify({ success: true, status: 402, message: '二维码已过期' }));
        } else {
            return new Response(JSON.stringify({ success: true, status: errcode, message: '未知状态' }));
        }
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }));
    }
}

async function exchangeCode(code, acctype, appid) {
    let url;
    const referer = 'https://nzm.qq.com/';
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

    if (acctype === 'qc') {
        const cbName = `miloJsonpCb_${Math.floor(Math.random() * 100000)}`;
        const params = new URLSearchParams({
            a: 'qcCodeToOpenId',
            qc_code: code,
            appid: appid,
            redirect_uri: 'https://milo.qq.com/comm-htdocs/login/qc_redirect.html',
            callback: cbName,
            _: Date.now()
        });
        url = `https://ams.game.qq.com/ams/userLoginSvr?${params}`;
    } else {
        const params = new URLSearchParams({
            appid: appid,
            wxcode: code,
            acctype: acctype,
            sServiceType: 'undefined',
            wxcodedomain: 'nzm.qq.com',
            callback: '_cb'
        });
        url = `https://apps.game.qq.com/ams/ame/codeToOpenId.php?${params}`;
    }

    try {
        console.log(`[Token Exchange - Edge] Requesting: ${url}`);
        const resp = await fetch(url, {
            headers: { 'User-Agent': ua, 'Referer': referer }
        });
        const text = await resp.text();

        const jsonMatch = text.match(/[a-zA-Z0-9_]+\((\{.*?\})\)/);
        if (!jsonMatch) {
            return { success: false, error: `JSONP解析失败` };
        }

        const result = JSON.parse(jsonMatch[1]);

        if (acctype === 'qc') {
            if (result.iRet === '0' || result.iRet === 0) {
                return { success: true, data: result };
            }
            return { success: false, error: `QQ接口错误: ${result.sMsg || result.iRet}` };
        } else {
            if (parseInt(result.iRet) === 0 && result.sMsg) {
                const data = JSON.parse(result.sMsg);
                return { success: true, data: data };
            }
            return { success: false, error: `WX接口错误: ${result.sMsg || result.iRet}` };
        }
    } catch (e) {
        return { success: false, error: `HTTP错误: ${e.message}` };
    }
}
