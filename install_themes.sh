#!/usr/bin/env bash
set -e

THEME_DIR="src/public/themes/u2"
mkdir -p "$THEME_DIR"

# 1. layout.html
cat << 'EOF' > "$THEME_DIR/layout.html"
<div class="ipod-container u2-shell-wrap">
    <div class="ipod u2-device">
        <!-- Верхний физический переключатель HOLD со срезанной фаской -->
        <div class="hold-switch-wrapper u2-hold" id="hold-switch" title="Toggle Hold Lock">
            <span class="hold-label">HOLD</span>
            <div class="hold-track">
                <div class="hold-orange"></div>
                <div class="hold-slider"></div>
            </div>
        </div>

        <!-- Скошенная рамка цветного дисплея QVGA с хромированной окантовкой -->
        <div class="screen-bezel u2-screen-bezel">
            <div class="screen u2-screen" id="screen">
                <div class="status-bar u2-status-bar">
                    <span id="status-title" class="status-title-text">iPod</span>
                    <div class="status-icons">
                        <span id="status-lock-icon" class="status-icon"></span>
                        <span id="status-play-icon" class="status-icon"></span>
                        <span id="battery-text" class="battery-text"></span>
                        <div class="battery-icon u2-battery" id="battery-icon">
                            <div class="battery-level" id="battery-level"></div>
                        </div>
                    </div>
                </div>

                <div class="screen-content" id="screen-content"></div>
            </div>
        </div>

        <!-- Знаменитое ярко-красное Click Wheel с черными кнопками -->
        <div class="wheel-container u2-wheel-wrap">
            <div class="click-wheel u2-wheel" id="click-wheel">
                <div class="wheel-button menu-btn" id="btn-menu">MENU</div>
                <div class="wheel-button prev-btn" id="btn-prev">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </div>
                <div class="wheel-button next-btn" id="btn-next">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </div>
                <div class="wheel-button play-pause-btn" id="btn-play-pause">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>

                <div class="center-button u2-center-button" id="btn-center"></div>
            </div>
        </div>
    </div>
</div>
EOF

# 2. style.css
cat << 'EOF' > "$THEME_DIR/style.css"
/* ==========================================================================
   iPod U2 Special Edition (Jet Black Plastic + Blood Red Click Wheel)
   ========================================================================== */

body[data-theme="u2"] {
    background: radial-gradient(circle at 50% 40%, #1c0608 0%, #08080a 100%);
    color: #121212;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
}

/* Корпус: глубокий черный рояльный глянец с хромированными отблесками */
body[data-theme="u2"] .ipod.u2-device {
    width: 350px !important;
    height: 574px !important;
    padding: 16px 20px 22px !important;
    box-sizing: border-box !important;
    border-radius: 36px !important;
    background: linear-gradient(
        135deg,
        #2a2c30 0%,
        #121316 20%,
        #0a0b0d 55%,
        #15171a 80%,
        #2f3238 100%
    ) !important;
    border: 1.5px solid #3c3f46 !important;
    box-shadow:
        0 32px 64px rgba(0, 0, 0, 0.9),
        0 8px 16px rgba(0, 0, 0, 0.6),
        inset 0 1.5px 2px rgba(255, 255, 255, 0.35),
        inset 0 -2px 3px rgba(0, 0, 0, 0.9) !important;
}

/* Переключатель HOLD */
body[data-theme="u2"] .u2-hold {
    position: absolute;
    top: 7px;
    right: 38px;
}

body[data-theme="u2"] .hold-label {
    color: #8c101c !important;
    font-weight: 800 !important;
    font-size: 9px !important;
    letter-spacing: 0.08em;
}

body[data-theme="u2"] .hold-track {
    background: #0d0e10 !important;
    border: 1px solid #383a40 !important;
    border-radius: 4px !important;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.8) !important;
}

body[data-theme="u2"] .hold-orange {
    background: #d90429 !important;
}

body[data-theme="u2"] .hold-slider {
    background: linear-gradient(180deg, #d3d7dc 0%, #7d828a 100%) !important;
    border: 1px solid #4f535a !important;
    border-radius: 3px !important;
}

/* Безель экрана: хромированная тонкая окантовка и черный контур */
body[data-theme="u2"] .u2-screen-bezel {
    width: 308px !important;
    height: 234px !important;
    background: #050506 !important;
    border-radius: 8px !important;
    padding: 3px !important;
    border: 1px solid #30333a !important;
    box-shadow:
        inset 0 2px 4px rgba(0, 0, 0, 0.95),
        0 1px 2px rgba(255, 255, 255, 0.15) !important;
    margin-bottom: 24px !important;
}

/* Экран */
body[data-theme="u2"] .screen.u2-screen {
    --screen-text: #111418;
    width: 100% !important;
    height: 100% !important;
    border-radius: 6px !important;
    background: #f7f9fb !important;
    color: var(--screen-text) !important;
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.2) !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden;
}

body[data-theme="u2"] .screen.u2-screen .screen-content {
    flex: 1 1 auto !important;
    height: calc(100% - 24px) !important;
    display: flex !important;
    flex-direction: column !important;
}

/* Статус-бар в стиле U2 Edition (черный глянец с рубиновым отблеском) */
body[data-theme="u2"] .status-bar.u2-status-bar {
    height: 24px !important;
    padding: 0 10px !important;
    background: linear-gradient(
        180deg,
        #2a2c30 0%,
        #17181c 48%,
        #0a0b0d 52%,
        #1c1d22 100%
    ) !important;
    border-bottom: 1px solid #3d0d12 !important;
    color: #f0f2f5 !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.8);
}

body[data-theme="u2"] .status-icon {
    font-size: 10px !important;
}

/* Батарея */
body[data-theme="u2"] .battery-icon.u2-battery {
    border: 1px solid #757d88 !important;
    background: #1a1c20 !important;
    border-radius: 2px !important;
    height: 11px !important;
    width: 22px !important;
}

body[data-theme="u2"] .battery-icon.u2-battery::after {
    background-color: #757d88 !important;
}

body[data-theme="u2"] .battery-level {
    background: linear-gradient(180deg, #d90429 0%, #9b0018 100%) !important;
}

/* Меню: градиентное рубиновое выделение вместо классического синего */
body[data-theme="u2"] .menu-list {
    padding: 0 !important;
}

body[data-theme="u2"] .menu-item {
    height: 28px !important;
    padding: 0 12px !important;
    font-size: 13.5px !important;
    font-weight: 700 !important;
    color: #121418 !important;
    border-bottom: 1px solid #ebeff5;
}

body[data-theme="u2"] .menu-item.active {
    background: linear-gradient(
        180deg,
        #e61c33 0%,
        #c9182b 48%,
        #9e0b1b 52%,
        #b81223 100%
    ) !important;
    color: #ffffff !important;
    text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.6);
    border-bottom: 1px solid #750611 !important;
}

body[data-theme="u2"] .menu-item.active .menu-arrow {
    color: #ffffff !important;
}

/* Скроллбар */
body[data-theme="u2"] .ipod-scrollbar {
    width: 9px !important;
    background: #e4e7ec !important;
    border-left: 1px solid #bfc6d0 !important;
}

body[data-theme="u2"] .ipod-scrollbar-thumb {
    background: linear-gradient(90deg, #b81424 0%, #800a16 100%) !important;
    border-radius: 2px !important;
}

/* ==========================================================================
   Экран Now Playing: центрированный 3D-конверт с рубиновым прогресс-баром
   ========================================================================== */
.u2-np-view {
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    height: 100% !important;
    width: 100% !important;
    padding: 10px 14px 12px !important;
    box-sizing: border-box !important;
    background: linear-gradient(180deg, #ffffff 0%, #eef2f7 100%);
}

.u2-np-main {
    display: flex;
    gap: 14px;
    align-items: center;
    width: 100%;
    margin: auto 0 !important;
}

/* 3D-обложка альбома */
.u2-cover-wrapper {
    position: relative;
    width: 110px;
    height: 110px;
    flex-shrink: 0;
    perspective: 520px;
    perspective-origin: 25% 50%;
}

.u2-cover-img {
    width: 102px;
    height: 102px;
    object-fit: cover;
    display: block;
    border-radius: 1px;
    transform-style: preserve-3d;
    transform-origin: left center;
    transform: rotateY(13deg) translateZ(0);
    border: 1px solid rgba(0, 0, 0, 0.25);
    box-shadow:
        3px 4px 10px rgba(0, 0, 0, 0.35),
        -1px 1px 3px rgba(0, 0, 0, 0.18),
        inset 1px 0 1px rgba(255, 255, 255, 0.7);
}

.u2-cover-reflection {
    position: absolute;
    top: 103px;
    left: 0;
    width: 102px;
    height: 40px;
    overflow: hidden;
    pointer-events: none;
    transform-style: preserve-3d;
    transform-origin: left top;
    transform: rotateY(13deg) scaleY(-1);
    opacity: 0.35;
    mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 75%);
    -webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 75%);
}

.u2-cover-reflection img {
    width: 102px;
    height: 102px;
    object-fit: cover;
    display: block;
}

.u2-cover-empty {
    width: 102px;
    height: 102px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e3e6eb;
    border: 1px solid #c2c8d2;
    transform: rotateY(13deg);
    transform-origin: left center;
    box-shadow: 3px 4px 10px rgba(0, 0, 0, 0.25);
}

/* Метаданные трека */
.u2-np-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.u2-np-track-badges {
    display: flex;
    justify-content: flex-end;
    gap: 5px;
    color: #a81322;
    margin-bottom: 4px;
}

.u2-np-title {
    font-size: 14.5px;
    font-weight: 800;
    color: #0d0f12;
    line-height: 1.25;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.u2-np-artist {
    font-size: 13px;
    font-weight: 700;
    color: #c9182b;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.u2-np-album {
    font-size: 11.5px;
    font-weight: 500;
    color: #555b66;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.u2-np-index {
    font-size: 11px;
    font-weight: 700;
    color: #7b828f;
}

/* Прогресс-бар */
.u2-np-bottom {
    margin-top: 0 !important;
    width: 100%;
}

.u2-progress-bar {
    width: 100%;
    height: 10px;
    background: #d8dde4;
    border: 1px solid #85131d;
    border-radius: 5px;
    overflow: hidden;
    position: relative;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
}

.u2-progress-fill {
    height: 100%;
    background: linear-gradient(
        180deg,
        #f0243b 0%,
        #c9182b 48%,
        #960d1b 52%,
        #b81223 100%
    );
    border-radius: 4px;
}

.u2-time-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 700;
    color: #2b3038;
    margin-top: 4px;
}

.u2-vol-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
}

.u2-vol-row .u2-progress-bar {
    flex: 1;
}

/* ==========================================================================
   Красное Click Wheel с глубоким черным кликером
   ========================================================================== */
body[data-theme="u2"] .click-wheel.u2-wheel {
    width: 220px !important;
    height: 220px !important;
    background: radial-gradient(circle at 40% 35%, #eb1a31 0%, #ba0d20 65%, #8f0614 100%) !important;
    border: 1.5px solid #66030c !important;
    border-radius: 50% !important;
    box-shadow:
        0 6px 14px rgba(0, 0, 0, 0.75),
        inset 0 1.5px 2px rgba(255, 255, 255, 0.35),
        inset 0 -3px 5px rgba(0, 0, 0, 0.6) !important;
}

body[data-theme="u2"] .wheel-button {
    color: #121316 !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    letter-spacing: 0.06em;
    opacity: 0.95 !important;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);
}

body[data-theme="u2"] .wheel-button:active {
    color: #ffffff !important;
}

/* Центральная кнопка: контрастный чёрный диск */
body[data-theme="u2"] .center-button.u2-center-button {
    width: 76px !important;
    height: 76px !important;
    background: linear-gradient(135deg, #2b2e34 0%, #111215 100%) !important;
    border: 1.5px solid #08080a !important;
    box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.6),
        inset 0 1px 1px rgba(255, 255, 255, 0.25) !important;
}

body[data-theme="u2"] .center-button.u2-center-button:active {
    background: #090a0c !important;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8) !important;
}
EOF

# 3. Обновление registry.js (добавление темы u2)
REGISTRY_FILE="src/public/themes/registry.js"

cat << 'EOF' > "$REGISTRY_FILE"
// Реестр тем оформления iPodify.
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
                                <div class="ios26-bar-fill" style="width: ${ctx.progressPercent}%\"></div>
                                <div class="ios26-glass-knob" style="left: ${ctx.progressPercent}%\"></div>
                            </div>
                            <div class="ios26-time-row">
                                <span>${ctx.currentTimeFormatted}</span>
                                <span>-${ctx.remainingTimeFormatted}</span>
                            </div>
                        </div>

                        <div class="ios26-vol-row" style="display: ${ctx.showVolume ? 'flex' : 'none'}">
                            ${ctx.icons.volumeLow}
                            <div class="ios26-bar-track">
                                <div class="ios26-bar-fill" style="width: ${ctx.volumePercent}%\"></div>
                                <div class="ios26-glass-knob" style="left: ${ctx.volumePercent}%\"></div>
                            </div>
                            ${ctx.icons.volumeHigh}
                        </div>
                    </div>
                </div>
            `;
        }
    }
];
EOF

echo "Тема iPod U2 Special Edition успешно установлена и зарегистрирована!"
