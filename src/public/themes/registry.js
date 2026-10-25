// Реестр тем оформления iPodify с защитой от мерцания обложек

let _lastPixelUrl = null;
let _lastNeoPixelUrl = null;

// 1. Монохромный рендер 32x32 Game Boy (с защитой от повторного рендера)
function renderPixelatedArtToCanvas(canvasId, imgUrl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Если этот же трек уже отрендерен на холсте — пропускаем перерисовку
    if (canvas.dataset.loadedUrl === (imgUrl || 'empty')) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.imageSmoothingEnabled = false;

    if (!imgUrl) {
        ctx.fillStyle = '#0f380f';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#9bbc0f';
        ctx.fillRect(6, 6, 20, 20);
        ctx.fillStyle = '#0f380f';
        ctx.fillRect(9, 8, 14, 8);
        canvas.dataset.loadedUrl = 'empty';
        return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const off = document.createElement('canvas');
        off.width = 32;
        off.height = 32;
        const offCtx = off.getContext('2d');
        offCtx.drawImage(img, 0, 0, 32, 32);

        try {
            const imgData = offCtx.getImageData(0, 0, 32, 32);
            const d = imgData.data;
            const palette = [
                [15, 56, 15],
                [48, 98, 48],
                [139, 172, 15],
                [155, 188, 15]
            ];

            for (let i = 0; i < d.length; i += 4) {
                const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
                let chosen = palette[0];
                if (lum > 185) chosen = palette[3];
                else if (lum > 120) chosen = palette[2];
                else if (lum > 60) chosen = palette[1];

                d[i] = chosen[0];
                d[i+1] = chosen[1];
                d[i+2] = chosen[2];
            }
            offCtx.putImageData(imgData, 0, 0);
        } catch (_) {}

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, W, H);
        canvas.dataset.loadedUrl = imgUrl;
    };

    img.onerror = () => {
        ctx.fillStyle = '#0f380f';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#9bbc0f';
        ctx.fillRect(4, 4, 24, 24);
        canvas.dataset.loadedUrl = imgUrl;
    };

    img.src = imgUrl;
}

// 2. Полноцветный сочный Hi-Color рендер 64x64 Neo-Pixel (с защитой от повторного рендера)
function renderNeoPixelArtToCanvas(canvasId, imgUrl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (canvas.dataset.loadedUrl === (imgUrl || 'empty')) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.imageSmoothingEnabled = false;

    if (!imgUrl) {
        ctx.fillStyle = '#141524';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(16, 16, 32, 32);
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(24, 24, 16, 16);
        canvas.dataset.loadedUrl = 'empty';
        return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const off = document.createElement('canvas');
        off.width = 64;
        off.height = 64;
        const offCtx = off.getContext('2d');
        offCtx.drawImage(img, 0, 0, 64, 64);

        try {
            const imgData = offCtx.getImageData(0, 0, 64, 64);
            const d = imgData.data;

            for (let i = 0; i < d.length; i += 4) {
                d[i]   = Math.round(d[i]   / 12) * 12;
                d[i+1] = Math.round(d[i+1] / 12) * 12;
                d[i+2] = Math.round(d[i+2] / 12) * 12;
            }
            offCtx.putImageData(imgData, 0, 0);
        } catch (_) {}

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, W, H);
        canvas.dataset.loadedUrl = imgUrl;
    };

    img.onerror = () => {
        ctx.fillStyle = '#141524';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00e5ff';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText('PIXEL', 12, 36);
        canvas.dataset.loadedUrl = imgUrl;
    };

    img.src = imgUrl;
}

window.IPODIFY_THEMES = [
    {
        id: 'classic',
        name: 'Classic 1G',
        layout: '/themes/classic/layout.html',
        css: null
    },
    {
        id: 'modern',
        name: 'Classic 6G',
        layout: '/themes/modern/layout.html',
        css: '/themes/modern/style.css',
        renderNowPlaying: (ctx) => {
            const coverImg = ctx.artworkUrl
                ? `<img class="modern-cover-img" src="${ctx.artworkUrl}" alt="Album Art" />`
                : `<div class="modern-cover-empty">${ctx.icons.musicNote}</div>`;

            const reflectionImg = ctx.artworkUrl
                ? `<div class="modern-cover-reflection"><img src="${ctx.artworkUrl}" alt="Reflection" /></div>`
                : '';

            return `
                <div class="modern-np-view">
                    <div class="modern-np-main">
                        <div class="modern-cover-wrapper">
                            ${coverImg}
                            ${reflectionImg}
                        </div>
                        <div class="modern-np-meta">
                            <div class="modern-np-track-badges">
                                ${ctx.isScrubbing ? '<span style="font-weight:700">[Scrub]</span>' : ''}
                                ${ctx.shuffleIcon}
                                ${ctx.repeatIcon}
                            </div>
                            <div class="modern-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="modern-np-artist">${ctx.artist}</div>
                            <div class="modern-np-album">${ctx.album}</div>
                            <div class="modern-np-index">${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="modern-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="modern-progress-bar">
                                <div class="modern-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="modern-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="modern-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            ${ctx.icons.volumeLow}
                            <div class="modern-progress-bar">
                                <div class="modern-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            ${ctx.icons.volumeHigh}
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'neopixel',
        name: 'Neo-Pixel 64x64',
        layout: '/themes/neopixel/layout.html',
        css: '/themes/neopixel/style.css',
        renderNowPlaying: (ctx) => {
            const canvasId = 'neopixel-canvas-static';
            setTimeout(() => renderNeoPixelArtToCanvas(canvasId, ctx.artworkUrl), 0);

            return `
                <div class="neopixel-np-view">
                    <div class="neopixel-np-main">
                        <div class="neopixel-cover-wrapper">
                            <canvas id="${canvasId}" class="neopixel-canvas-art" width="64" height="64"></canvas>
                        </div>
                        <div class="neopixel-np-meta">
                            <div class="neopixel-badge-mode">[HI-COLOR_64]</div>
                            <div class="neopixel-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="neopixel-np-artist">${ctx.artist}</div>
                            <div class="neopixel-np-album">${ctx.album}</div>
                            <div class="neopixel-np-index">TRACK:${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="neopixel-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="neopixel-progress-track">
                                <div class="neopixel-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="neopixel-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="neopixel-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            <span style="font-size:7px; font-weight:700; color:#ff2a6d;">VOL</span>
                            <div class="neopixel-progress-track">
                                <div class="neopixel-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            <span style="font-size:7px; font-weight:700; color:#00f0ff;">MAX</span>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'pixel',
        name: '8-Bit GameBoy',
        layout: '/themes/pixel/layout.html',
        css: '/themes/pixel/style.css',
        renderNowPlaying: (ctx) => {
            const canvasId = 'pixel-art-canvas-static';
            setTimeout(() => renderPixelatedArtToCanvas(canvasId, ctx.artworkUrl), 0);

            return `
                <div class="pixel-np-view">
                    <div class="pixel-np-main">
                        <div class="pixel-cover-wrapper">
                            <canvas id="${canvasId}" class="pixel-canvas-art" width="32" height="32"></canvas>
                        </div>
                        <div class="pixel-np-meta">
                            <div class="pixel-badge-mode">[ROM_STEREO]</div>
                            <div class="pixel-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="pixel-np-artist">${ctx.artist}</div>
                            <div class="pixel-np-album">${ctx.album}</div>
                            <div class="pixel-np-index">TRACK:${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="pixel-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="pixel-progress-track">
                                <div class="pixel-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="pixel-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="pixel-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            <span style="font-size:7px; font-weight:700;">VOL</span>
                            <div class="pixel-progress-track">
                                <div class="pixel-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            <span style="font-size:7px; font-weight:700;">MAX</span>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'u2',
        name: 'iPod U2 Edition',
        layout: '/themes/u2/layout.html',
        css: '/themes/u2/style.css',
        renderNowPlaying: (ctx) => {
            const coverImg = ctx.artworkUrl
                ? `<img class="u2-cover-img" src="${ctx.artworkUrl}" alt="Album Art" />`
                : `<div class="u2-cover-empty">${ctx.icons.musicNote}</div>`;

            const reflectionImg = ctx.artworkUrl
                ? `<div class="u2-cover-reflection"><img src="${ctx.artworkUrl}" alt="Reflection" /></div>`
                : '';

            return `
                <div class="u2-np-view">
                    <div class="u2-np-main">
                        <div class="u2-cover-wrapper">
                            ${coverImg}
                            ${reflectionImg}
                        </div>
                        <div class="u2-np-meta">
                            <div class="u2-np-track-badges">
                                ${ctx.isScrubbing ? '<span style="font-weight:700">[Scrub]</span>' : ''}
                                ${ctx.shuffleIcon}
                                ${ctx.repeatIcon}
                            </div>
                            <div class="u2-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="u2-np-artist">${ctx.artist}</div>
                            <div class="u2-np-album">${ctx.album}</div>
                            <div class="u2-np-index">${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="u2-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="u2-progress-bar">
                                <div class="u2-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="u2-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="u2-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            ${ctx.icons.volumeLow}
                            <div class="u2-progress-bar">
                                <div class="u2-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            ${ctx.icons.volumeHigh}
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'nano',
        name: 'iPod Nano 2G',
        layout: '/themes/nano/layout.html',
        css: '/themes/nano/style.css',
        renderNowPlaying: (ctx) => {
            const coverImg = ctx.artworkUrl
                ? `<img class="nano-cover-img" src="${ctx.artworkUrl}" alt="Album Art" />`
                : `<div class="nano-cover-empty">${ctx.icons.musicNote}</div>`;

            const reflectionImg = ctx.artworkUrl
                ? `<div class="nano-cover-reflection"><img src="${ctx.artworkUrl}" alt="Reflection" /></div>`
                : '';

            return `
                <div class="nano-np-view">
                    <div class="nano-np-main">
                        <div class="nano-cover-wrapper">
                            ${coverImg}
                            ${reflectionImg}
                        </div>
                        <div class="nano-np-meta">
                            <div class="nano-np-track-badges">
                                ${ctx.isScrubbing ? '<span style="font-weight:700">[Scrub]</span>' : ''}
                                ${ctx.shuffleIcon}
                                ${ctx.repeatIcon}
                            </div>
                            <div class="nano-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="nano-np-artist">${ctx.artist}</div>
                            <div class="nano-np-album">${ctx.album}</div>
                            <div class="nano-np-index">${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="nano-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="nano-progress-bar">
                                <div class="nano-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="nano-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="nano-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            ${ctx.icons.volumeLow}
                            <div class="nano-progress-bar">
                                <div class="nano-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            ${ctx.icons.volumeHigh}
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'eva01',
        name: 'EVA-01 NERV',
        layout: '/themes/eva01/layout.html',
        css: '/themes/eva01/style.css',
        renderNowPlaying: (ctx) => {
            const coverHTML = ctx.artworkUrl
                ? `<img class="eva-cover-img" src="${ctx.artworkUrl}" alt="Wave Pattern" />`
                : `<div class="eva-cover-empty">NO_DATA</div>`;

            return `
                <div class="eva-np-view">
                    <div class="eva-np-main">
                        <div class="eva-cover-wrapper">
                            ${coverHTML}
                        </div>
                        <div class="eva-np-meta">
                            <div class="eva-np-tagline">MAGI // SYNCHRO: 100%</div>
                            <div class="eva-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="eva-np-artist">${ctx.artist}</div>
                            <div class="eva-np-album">${ctx.album}</div>
                            <div class="eva-np-status-row">
                                <span>SEQ: ${ctx.trackIndexText}</span>
                                <span>${ctx.isScrubbing ? 'SEEK_ACTIVE' : 'STREAMING'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="eva-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="eva-progress-track">
                                <div class="eva-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="eva-time-row">
                                <span>T+ ${ctx.currentTimeFormatted}</span>
                                <span>REM -${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="eva-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            <span style="font-size:10px; font-weight:900; color:#ff7700;">GAIN</span>
                            <div class="eva-progress-track">
                                <div class="eva-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            <span style="font-size:10px; font-weight:900; color:#39ff14;">dB</span>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'arasaka',
        name: 'Arasaka Datapad',
        layout: '/themes/arasaka/layout.html',
        css: '/themes/arasaka/style.css',
        renderNowPlaying: (ctx) => {
            const coverHTML = ctx.artworkUrl
                ? `<img class="arasaka-cover-img" src="${ctx.artworkUrl}" alt="Biochip Data" />`
                : `<div class="arasaka-cover-empty">NO_CHIP</div>`;

            return `
                <div class="arasaka-np-view">
                    <div class="arasaka-np-main">
                        <div class="arasaka-cover-wrapper">
                            ${coverHTML}
                        </div>
                        <div class="arasaka-np-meta">
                            <div class="arasaka-np-badge-row">
                                <span class="arasaka-badge">NEURAL_FEED_OK</span>
                                <span style="font-size:10px; color:#fcee09;">${ctx.isScrubbing ? '[SEEK]' : 'LIVE'}</span>
                            </div>
                            <div class="arasaka-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="arasaka-np-artist">${ctx.artist}</div>
                            <div class="arasaka-np-album">${ctx.album}</div>
                            <div class="arasaka-np-index">TRACK // ${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="arasaka-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="arasaka-progress-track">
                                <div class="arasaka-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="arasaka-time-row">
                                <span>IN: ${ctx.currentTimeFormatted}</span>
                                <span>OUT: -${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="arasaka-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            <span style="font-size:11px; font-weight:800; color:#fcee09;">VOL</span>
                            <div class="arasaka-progress-track">
                                <div class="arasaka-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            <span style="font-size:11px; font-weight:800; color:#ff003c;">MAX</span>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'atomic',
        name: 'Atomic Purple',
        layout: '/themes/atomic/layout.html',
        css: '/themes/atomic/style.css',
        renderNowPlaying: (ctx) => {
            const coverHTML = ctx.artworkUrl
                ? `<img class="atomic-cover-img" src="${ctx.artworkUrl}" alt="Cartridge Art" />`
                : `<div class="atomic-cover-empty">NO CART</div>`;

            return `
                <div class="atomic-np-view">
                    <div class="atomic-np-main">
                        <div class="atomic-cover-wrapper">
                            ${coverHTML}
                        </div>
                        <div class="atomic-np-meta">
                            <div class="atomic-np-header-tag">[ROM_PLAY // STEREO]</div>
                            <div class="atomic-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="atomic-np-artist">${ctx.artist}</div>
                            <div class="atomic-np-album">${ctx.album}</div>
                            <div class="atomic-np-index">TRACK: ${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="atomic-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="atomic-progress-bar">
                                <div class="atomic-progress-fill" style="width: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="atomic-time-row">
                                <span>T:${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="atomic-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            <span style="font-size:13px; font-weight:700; color:#0f380f;">VOL</span>
                            <div class="atomic-progress-bar">
                                <div class="atomic-progress-fill" style="width: ${ctx.volumePercent}%"></div>
                            </div>
                            <span style="font-size:13px; font-weight:700; color:#0f380f;">MAX</span>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'braun',
        name: 'Braun Functional',
        layout: '/themes/braun/layout.html',
        css: '/themes/braun/style.css',
        renderNowPlaying: (ctx) => {
            const coverHTML = ctx.artworkUrl
                ? `<img class="braun-cover-img" src="${ctx.artworkUrl}" alt="Plate" />`
                : `<div class="braun-cover-empty">BRAUN</div>`;

            return `
                <div class="braun-np-view">
                    <div class="braun-np-main">
                        <div class="braun-cover-wrapper">
                            ${coverHTML}
                        </div>
                        <div class="braun-np-meta">
                            <div class="braun-np-freq-tag">UKW / FM // STEREO</div>
                            <div class="braun-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="braun-np-artist">${ctx.artist}</div>
                            <div class="braun-np-album">${ctx.album}</div>
                            <div class="braun-np-channel">PROGRAMM ${ctx.trackIndexText}</div>
                        </div>
                    </div>

                    <div class="braun-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="braun-scale-legend">
                                <span>88 MHz</span>
                                <span>TUNING</span>
                                <span>108 MHz</span>
                            </div>
                            <div class="braun-tuner-track">
                                <div class="braun-tuner-needle" style="left: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="braun-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="braun-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            <span style="font-size:10px; font-weight:800; color:#111;">MIN</span>
                            <div class="braun-tuner-track">
                                <div class="braun-tuner-needle" style="left: ${ctx.volumePercent}%"></div>
                            </div>
                            <span style="font-size:10px; font-weight:800; color:#e65c00;">MAX</span>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    {
        id: 'ios26',
        name: 'iOS 26 Glass',
        layout: '/themes/ios26/layout.html',
        css: '/themes/ios26/style.css',
        renderNowPlaying: (ctx) => {
            const coverHTML = ctx.artworkUrl
                ? `<img class="ios26-cover-img" src="${ctx.artworkUrl}" alt="Album Cover" />`
                : `<div class="ios26-cover-empty">${ctx.icons.musicNote}</div>`;

            return `
                <div class="ios26-np-view">
                    <div class="ios26-np-hero">
                        <div class="ios26-cover-frame">
                            ${coverHTML}
                        </div>
                        <div class="ios26-np-meta">
                            <div class="ios26-np-TopRow">
                                <span>${ctx.trackIndexText}</span>
                                <span class="ios26-np-badges">
                                    ${ctx.isScrubbing ? '[Scrub]' : ''}
                                    ${ctx.shuffleIcon}
                                    ${ctx.repeatIcon}
                                </span>
                            </div>
                            <div class="ios26-np-title ${ctx.isLongTitle ? 'marquee' : ''}"><span>${ctx.title}</span></div>
                            <div class="ios26-np-artist">${ctx.artist}</div>
                            <div class="ios26-np-album">${ctx.album}</div>
                        </div>
                    </div>

                    <div class="ios26-np-bottom">
                        <div style="display: ${ctx.showVolume ? 'none' : 'block'}">
                            <div class="ios26-bar-track">
                                <div class="ios26-bar-fill" style="width: ${ctx.progressPercent}%"></div>
                                <div class="ios26-glass-knob" style="left: ${ctx.progressPercent}%"></div>
                            </div>
                            <div class="ios26-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="ios26-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            ${ctx.icons.volumeLow}
                            <div class="ios26-bar-track">
                                <div class="ios26-bar-fill" style="width: ${ctx.volumePercent}%"></div>
                                <div class="ios26-glass-knob" style="left: ${ctx.volumePercent}%"></div>
                            </div>
                            ${ctx.icons.volumeHigh}
                        </div>
                    </div>
                </div>
            `;
        }
    }
];
