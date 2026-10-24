// Реестр тем оформления iPodify.
// Каждая тема находится в своей папке /themes/<id>/ и может иметь:
// - layout: собственный HTML-каркас устройства
// - css: собственный файл стилей
// - renderNowPlaying: (опционально) собственную HTML-верстку экрана плеера

window.IPODIFY_THEMES = [
    {
        id: 'classic',
        name: 'Classic 1G',
        layout: '/themes/classic/layout.html',
        css: null
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
