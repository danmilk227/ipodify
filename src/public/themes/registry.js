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
