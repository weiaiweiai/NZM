import { state } from './state.js';
import { api } from './api.js';
import { formatNumber } from './ui_components.js';

export async function generateShareImage(btnElement) {
    if (!state.data) {
        alert('暂无战绩数据可供分享，请先绑定账号。');
        return;
    }

    if (!window.html2canvas) {
        alert('图片生成库仍在加载中，请稍后再试');
        return;
    }

    if (btnElement) {
        btnElement.disabled = true;
        const originalText = btnElement.textContent;
        btnElement.textContent = '生成中...';

        try {
            const d = state.data;

            // 1. Fetch User Info from latest match
            let nickname = '指挥官';
            let avatarUrl = '';

            if (d.gameList && d.gameList.length > 0) {
                try {
                    const roomId = d.gameList[0].DsRoomId;
                    const res = await api.getMatchDetail(roomId);
                    if (res && res.data && res.data.loginUserDetail) {
                        nickname = decodeURIComponent(res.data.loginUserDetail.nickname) || '指挥官';
                        avatarUrl = decodeURIComponent(res.data.loginUserDetail.avatar) || '';
                    }
                } catch (err) {
                    console.warn('Failed to fetch latest match detail for user info', err);
                }
            }

            // 2. Setup Container for html2canvas
            const container = document.createElement('div');
            // Hide it off-screen
            container.style.position = 'absolute';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.width = '800px';
            // Important for generic styles
            container.style.color = '#e5e7eb';
            container.style.fontFamily = "'Roboto', sans-serif";
            container.style.boxSizing = 'border-box';

            // To ensure html2canvas captures a dark background
            const bgWrapper = document.createElement('div');
            bgWrapper.style.position = 'relative';
            bgWrapper.style.width = '100%';
            bgWrapper.style.minHeight = '1000px';
            bgWrapper.style.background = '#111827';
            bgWrapper.style.padding = '40px';
            bgWrapper.style.boxSizing = 'border-box';
            bgWrapper.style.overflow = 'hidden';

            // Optional: Background image for the whole share card just like the previous canvas approach
            const bgPool = [
                'https://img.haman.uk/maps/maps-14.webp',
                'https://img.haman.uk/maps/maps-12.webp',
                'https://img.haman.uk/maps/maps-16.webp',
                'https://img.haman.uk/maps/maps-17.webp'
            ];
            if (d.gameList) {
                const mapsWithIcons = d.gameList.filter(g => g.icon);
                if (mapsWithIcons.length > 0) {
                    bgPool.push(mapsWithIcons[0].icon);
                }
            }
            const randomBg = bgPool[Math.floor(Math.random() * bgPool.length)];

            const bgFetchPromises = [];

            if (randomBg) {
                const bgImgDiv = document.createElement('div');
                bgImgDiv.style.position = 'absolute';
                bgImgDiv.style.top = '0';
                bgImgDiv.style.left = '0';
                bgImgDiv.style.width = '100%';
                bgImgDiv.style.height = '100%';
                bgImgDiv.style.zIndex = '0';
                bgImgDiv.style.overflow = 'hidden';
                bgImgDiv.style.background = '#111827';
                bgImgDiv.style.backgroundSize = 'cover';
                bgImgDiv.style.backgroundPosition = 'center';
                bgImgDiv.style.opacity = '0.35'; // Darken the background

                const p1 = fetch(`${randomBg}?cors=${Date.now()}`, { mode: 'cors' })
                    .then(res => res.blob())
                    .then(blob => new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    }))
                    .then(dataUrl => {
                        bgImgDiv.style.backgroundImage = `url("${dataUrl}")`;
                    })
                    .catch(e => console.warn('Global bg fetch failed:', e));
                bgFetchPromises.push(p1);

                bgWrapper.appendChild(bgImgDiv);
            }

            // Content Wrapper (above background)
            const content = document.createElement('div');
            content.style.position = 'relative';
            content.style.zIndex = '1';

            // 3. User Header
            let headerHtml = `
                <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 40px; padding-top: 20px;">
                    ${avatarUrl ? `<img src="${avatarUrl}" crossOrigin="anonymous" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #d4a84b; margin-bottom: 12px; object-fit: cover;">` : ''}
                    <h1 style="margin: 0; font-size: 32px; color: #fff; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${nickname}</h1>
                </div>
            `;
            content.innerHTML = headerHtml;

            // 4. Clone Stats Column
            const sourceColumn = document.querySelector('.stats-left-column');
            if (!sourceColumn) throw new Error('找不到数据源!');

            const cloneNode = sourceColumn.cloneNode(true);

            // 5. Clean up clone for html2canvas
            // Remove the refresh/generate buttons
            const actions = cloneNode.querySelector('.header-actions');
            if (actions) actions.remove();

            // Strip all animation classes beforehand
            const animatedElements = cloneNode.querySelectorAll('.animate-float-in');
            animatedElements.forEach(el => {
                el.classList.remove('animate-float-in');
                el.style.animation = 'none';
                el.style.opacity = '1';
                el.style.transform = 'none';
            });

            // Override inline opacity (which hides items) and fix backdrop-filters
            const allElements = cloneNode.querySelectorAll('*');
            allElements.forEach(el => {
                const style = el.style;
                style.animation = 'none';
                style.transition = 'none';

                if (style.opacity === '0' || style.opacity === 0) {
                    style.opacity = '1';
                }

                if (el.classList.contains('matte-card')) {
                    style.backdropFilter = 'none';
                    style.border = '1px solid rgba(255, 255, 255, 0.08)';
                    style.opacity = '1';
                    style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

                    if (!el.classList.contains('map-card-with-bg')) {
                        // Regular cards: neutral dark grey with slight transparency
                        style.backgroundColor = 'rgba(31, 31, 35, 0.85)';
                        style.background = 'rgba(31, 31, 35, 0.85)';
                    } else {
                        // Map cards need a solid dark backing since html2canvas doesn't do backdrop-filter
                        style.background = 'rgba(17, 24, 39, 0.95)';
                        style.backgroundColor = 'rgba(17, 24, 39, 0.95)';
                        style.boxShadow = 'none'; // Optional: remove shadow if it causes dark aura
                    }
                }

                // CRITICAL: Ensure the map image itself is fully solid so it doesn't mix with global bg.
                // ALSO add a dark gradient overlay to ensure the bright white text remains readable
                // since we removed the dark matte-card background from underneath it.
                if (el.classList.contains('map-bg-layer')) {
                    style.opacity = '0.45'; // Faded enough to read white text
                    const currentBg = style.backgroundImage;
                    if (currentBg && currentBg !== 'none') {
                        // Extract URL from 'url("...url...")'
                        const urlMatch = currentBg.match(/url\(['"]?(.*?)['"]?\)/);
                        if (urlMatch && urlMatch[1]) {
                            // Fetch map bg as Data URI
                            const p = fetch(`${urlMatch[1]}?cors=${Date.now()}`, { mode: 'cors' })
                                .then(res => res.blob())
                                .then(blob => new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                }))
                                .then(dataUrl => {
                                    style.backgroundImage = `url("${dataUrl}")`;
                                })
                                .catch(e => console.warn('Map bg fetch failed:', e));

                            bgFetchPromises.push(p);
                        }
                    }
                }

                if (el.classList.contains('master-title')) {
                    style.color = '#d4a84b';
                    style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
                    style.opacity = '1';
                }
            });

            // Adjust grid explicitly if external CSS isn't perfectly applied
            // Since we append to body, the launcher.css applies.
            // We just ensure width is strictly 800px max (720px inner)
            cloneNode.style.width = '100%';

            content.appendChild(cloneNode);

            // 6. Footer
            const date = new Date();
            const dateString = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
            const footer = document.createElement('div');
            footer.style.marginTop = '50px';
            footer.style.paddingBottom = '20px';
            footer.style.textAlign = 'center';
            footer.style.color = '#9ca3af';
            footer.innerHTML = `
                <p style="margin:5px 0; font-size: 16px;">生成于 ${dateString} · by HaMan</p>
                <p style="margin:5px 0; font-size: 14px;">数据来源 · 逆战未来工具箱</p>
            `;
            content.appendChild(footer);

            bgWrapper.appendChild(content);
            container.appendChild(bgWrapper);
            document.body.appendChild(container);

            // Wait for all CSS background fetches to resolve and apply Data URIs
            await Promise.all(bgFetchPromises);

            // 7. Wait for images to load explicitly inside the clone and set CORS rules
            const images = container.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = () => {
                        console.warn('Failed to load image for share card:', img.src);
                        resolve(); // Resolve anyway so we don't freeze the canvas generation
                    };
                });
            });
            await Promise.all(imagePromises);

            // Add a small delay for font rendering and DOM layout settling
            await new Promise(r => setTimeout(r, 200));

            // 8. Capture via html2canvas
            const canvas = await window.html2canvas(bgWrapper, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#111827',
                logging: false, // Turn off console logs
            });

            // Cleanup
            document.body.removeChild(container);

            // 9. Download
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const link = document.createElement('a');
            link.download = `战绩分享_${date.getTime()}.jpg`;
            link.href = dataUrl;
            link.click();

        } catch (e) {
            console.error('生成图片失败', e);
            alert('生成分享图时发生错误，请重试。\n' + e.message);
        } finally {
            btnElement.disabled = false;
            btnElement.textContent = originalText;
        }
    }
}
