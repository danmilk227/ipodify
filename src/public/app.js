// --- Saved Preferences ---
const savedPrefs = JSON.parse(localStorage.getItem('ipodify_prefs') || '{}');

// Available Themes from /themes/registry.js
const availableThemes = (Array.isArray(window.IPODIFY_THEMES) && window.IPODIFY_THEMES.length > 0)
    ? window.IPODIFY_THEMES
    : [{ id: 'classic', name: 'Classic 1G', layout: '/themes/classic/layout.html', css: null }];

// Clean Vector SVG Icons (No Emojis)
const ICONS = {
    play: `<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" style="display:block"><path d="M2.5 1.5v9l8-4.5-8-4.5z"/></svg>`,
    pause: `<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" style="display:block"><path d="M2.5 1.5h2.5v9H2.5v-9zm4.5 0h2.5v9H7v-9z"/></svg>`,
    lock: `<svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" style="display:block"><path d="M3.5 5V3.8a2.5 2.5 0 0 1 5 0V5h.8c.4 0 .7.3.7.7v4.6c0 .4-.3.7-.7.7H2.7a.7.7 0 0 1-.7-.7V5.7c0-.4.3-.7.7-.7h.8zm1.2 0h2.6V3.8a1.3 1.3 0 0 0-2.6 0V5z"/></svg>`,
    bolt: `<svg width="8" height="10" viewBox="0 0 10 12" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:1px"><path d="M6 0L1 7h3.5L3.5 12 9 5H5.5L6 0z"/></svg>`,
    shuffle: `<svg width="12" height="11" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2h3v3M1 3h2.5c2.2 0 3.5 2 5 4s2.8 4 5 4H15m-3 2h3v-3M1 11h2.5c1.2 0 2.1-.7 3-1.8M15 2l-4.5 4.2"/></svg>`,
    repeatAll: `<svg width="12" height="11" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 1l2 2-2 2"/><path d="M2 7V5a2 2 0 0 1 2-2h9M5 13l-2-2 2-2"/><path d="M14 7v2a2 2 0 0 1-2 2H3"/></svg>`,
    repeatOne: `<svg width="13" height="11" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 1l2 2-2 2"/><path d="M2 7V5a2 2 0 0 1 2-2h9M5 13l-2-2 2-2"/><path d="M14 7v2a2 2 0 0 1-2 2H3"/><path d="M8 5.2v3.6"/></svg>`,
    volumeLow: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 6h3l4-3.5v11L5 10H2V6z"/></svg>`,
    volumeHigh: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 6h3l4-3.5v11L4 10H1V6zm9.5-1.5a4.5 4.5 0 0 1 0 7l-.8-.9a3.3 3.3 0 0 0 0-5.2l.8-.9zm2-2a7.2 7.2 0 0 1 0 11l-.8-.9a6 6 0 0 0 0-9.2l.8-.9z"/></svg>`,
    timer: `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7.5" r="5"/><path d="M7 5v3l2 1.2M5.2 1h3.6"/></svg>`,
    musicNote: `<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" opacity="0.45"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`
};

// State
const state = {
    accessToken: null,
    currentUserId: null,
    userName: 'iPod User',
    savedTracksCache: [],
    menuStack: [],
    currentMenu: null,
    selectedIndex: 0,
    theme: savedPrefs.theme || 'classic',
    clickerEnabled: savedPrefs.clickerEnabled !== undefined ? savedPrefs.clickerEnabled : true,
    backlight: savedPrefs.backlight || false,
    showBatteryPercent: savedPrefs.showBatteryPercent !== undefined ? savedPrefs.showBatteryPercent : true,
    batteryLevel: 100,
    batteryCharging: false,
    isHoldLocked: false,
    shuffle: false,
    repeatMode: 0, // 0: Off, 1: All, 2: One
    sleepMinutes: 0, // 0: Off, 15, 30, 60
    player: null,
    deviceId: null,
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.5,
    showVolume: false,
    isScrubbing: false,
    scrubPosition: 0,
    queueIndex: 1,
    queueTotal: 1
};

let volumeTimeout = null;
let scrubTimeout = null;
let sleepTimerTimeout = null;
let clockInterval = null;
let audioCtx = null;
let deferredInstallPrompt = null;
const layoutCache = {};

function savePreferences() {
    localStorage.setItem('ipodify_prefs', JSON.stringify({
        theme: state.theme,
        clickerEnabled: state.clickerEnabled,
        backlight: state.backlight,
        showBatteryPercent: state.showBatteryPercent
    }));
}

// Dynamic DOM References (re-bound when theme layout.html changes)
let screenEl = null;
let screenContent = null;
let statusTitle = null;
let statusPlayIcon = null;
let statusLockIcon = null;
let batteryTextEl = null;
let batteryLevelEl = null;
let holdSwitchEl = null;
let wheel = null;
let btnCenter = null;
let btnMenu = null;
let btnPrev = null;
let btnNext = null;
let btnPlayPause = null;
let ambientArtworkEl = null;
const themeLinkEl = document.getElementById('dynamic-theme-css');
const themeMountEl = document.getElementById('theme-mount');

// --- Theme Engine with Custom HTML Layouts ---
function getCurrentThemeObj() {
    return availableThemes.find(t => t.id === state.theme) || availableThemes[0];
}

function getTrackArtworkUrl(track) {
    if (!track || !track.album || !Array.isArray(track.album.images) || track.album.images.length === 0) {
        return null;
    }
    return track.album.images[0].url || null;
}

function updateAmbientArtwork() {
    if (!ambientArtworkEl) return;
    const artUrl = getTrackArtworkUrl(state.currentTrack);
    ambientArtworkEl.style.backgroundImage = artUrl ? `url("${artUrl}")` : 'none';
}

function bindLayoutDOM() {
    screenEl = document.getElementById('screen');
    screenContent = document.getElementById('screen-content');
    statusTitle = document.getElementById('status-title');
    statusPlayIcon = document.getElementById('status-play-icon');
    statusLockIcon = document.getElementById('status-lock-icon');
    batteryTextEl = document.getElementById('battery-text');
    batteryLevelEl = document.getElementById('battery-level');
    holdSwitchEl = document.getElementById('hold-switch');
    wheel = document.getElementById('click-wheel');
    btnCenter = document.getElementById('btn-center');
    btnMenu = document.getElementById('btn-menu');
    btnPrev = document.getElementById('btn-prev');
    btnNext = document.getElementById('btn-next');
    btnPlayPause = document.getElementById('btn-play-pause');
    ambientArtworkEl = document.getElementById('ambient-artwork');

    if (screenEl) {
        screenEl.classList.toggle('backlight-on', state.backlight);
    }

    if (holdSwitchEl) {
        holdSwitchEl.classList.toggle('active', state.isHoldLocked);
        holdSwitchEl.addEventListener('click', () => {
            state.isHoldLocked = !state.isHoldLocked;
            holdSwitchEl.classList.toggle('active', state.isHoldLocked);
            if (statusLockIcon) {
                statusLockIcon.innerHTML = state.isHoldLocked ? ICONS.lock : '';
            }
            playPiezoClick(true);
        });
    }

    if (statusLockIcon) {
        statusLockIcon.innerHTML = state.isHoldLocked ? ICONS.lock : '';
    }

    if (wheel) {
        wheel.addEventListener('mousedown', handleStart);
        wheel.addEventListener('touchstart', handleStart, { passive: false });
        wheel.addEventListener('touchmove', handleMove, { passive: false });
        wheel.addEventListener('touchend', handleEnd);
    }

    if (btnCenter) setupButton(btnCenter, () => handleSelect());
    if (btnMenu) setupButton(btnMenu, () => handleMenuBack());
    if (btnPrev) setupButton(btnPrev, () => { if (state.player) state.player.previousTrack(); });
    if (btnNext) setupButton(btnNext, () => { if (state.player) state.player.nextTrack(); });
    if (btnPlayPause) setupButton(btnPlayPause, () => { if (state.player) state.player.togglePlay(); });

    updateBatteryUI();
    updateStatusPlayIcon();
    updateAmbientArtwork();
}

async function applyTheme(themeId) {
    const themeObj = availableThemes.find(t => t.id === themeId) || availableThemes[0];
    state.theme = themeObj.id;
    document.body.setAttribute('data-theme', themeObj.id);

    if (themeLinkEl) {
        themeLinkEl.setAttribute('href', themeObj.css || '');
    }

    let layoutHTML = layoutCache[themeObj.id];
    if (!layoutHTML && themeObj.layout) {
        try {
            const res = await fetch(themeObj.layout);
            if (res.ok) {
                layoutHTML = await res.text();
                layoutCache[themeObj.id] = layoutHTML;
            }
        } catch (e) {
            console.error('Failed to load theme layout:', e);
        }
    }

    if (themeMountEl && layoutHTML) {
        themeMountEl.innerHTML = layoutHTML;
    }

    bindLayoutDOM();
    savePreferences();

    if (state.currentMenu) {
        if (state.currentMenu === 'now_playing') renderNowPlaying();
        else if (state.currentMenu === 'about') renderAbout();
        else if (state.currentMenu === 'clock_view') renderClockView();
        else if (state.currentMenu === 'brick_game') startBrickGame();
        else renderMenu(state.currentMenu);
    }
}

async function cycleThemeState() {
    const currentIndex = availableThemes.findIndex(t => t.id === state.theme);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    await applyTheme(availableThemes[nextIndex].id);
}

// --- PWA Service Worker & Install Prompt ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (state.currentMenu === 'settings') renderMenu('settings');
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (state.currentMenu === 'settings') renderMenu('settings');
});

// --- Real Battery Status API (No Emojis) ---
function updateBatteryUI() {
    if (batteryLevelEl) {
        batteryLevelEl.style.width = `${Math.max(5, state.batteryLevel)}%`;
    }
    if (batteryTextEl) {
        const bolt = state.batteryCharging ? ICONS.bolt : '';
        const pct = state.showBatteryPercent ? `${state.batteryLevel}%` : '';
        batteryTextEl.innerHTML = `${bolt}${pct}`;
    }
}

async function initBatteryMonitor() {
    updateBatteryUI();
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            const syncBattery = () => {
                state.batteryLevel = Math.round(battery.level * 100);
                state.batteryCharging = Boolean(battery.charging);
                updateBatteryUI();
            };
            syncBattery();
            battery.addEventListener('levelchange', syncBattery);
            battery.addEventListener('chargingchange', syncBattery);
        } catch (_) {}
    }
}

// --- Authentic 1st Gen Piezo Clicker (No Vibration) ---
function unlockAudio() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

function playPiezoClick(isButton = false) {
    if (!state.clickerEnabled) return;
    try {
        unlockAudio();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isButton ? 1900 : 2600, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + (isButton ? 0.012 : 0.007));

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(1.5, now);

        gain.gain.setValueAtTime(isButton ? 0.28 : 0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isButton ? 0.012 : 0.007));

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + (isButton ? 0.013 : 0.008));
    } catch (_) {}
}

// --- Click Wheel Logic ---
let totalDragAngle = 0;
let isDragging = false;
let startAngle = 0;
let lastAngle = 0;
let angleAccumulator = 0;
const ANGLE_THRESHOLD = 14;

function getAngle(x, y) {
    if (!wheel) return 0;
    const rect = wheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
}

function handleStart(e) {
    unlockAudio();
    if (state.isHoldLocked) return;
    totalDragAngle = 0;
    if (e.target.id === 'btn-center') return;

    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startAngle = getAngle(clientX, clientY);
    lastAngle = startAngle;
    angleAccumulator = 0;
}

function handleMove(e) {
    if (!isDragging || state.isHoldLocked) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentAngle = getAngle(clientX, clientY);

    let deltaAngle = currentAngle - lastAngle;

    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    angleAccumulator += deltaAngle;
    totalDragAngle += Math.abs(deltaAngle);

    if (state.currentMenu === 'brick_game') {
        moveBrickPaddle(deltaAngle * 1.4);
    }

    if (Math.abs(angleAccumulator) >= ANGLE_THRESHOLD) {
        const ticks = Math.trunc(angleAccumulator / ANGLE_THRESHOLD);

        if (ticks > 0) {
            handleScroll(1);
            angleAccumulator -= ticks * ANGLE_THRESHOLD;
        } else if (ticks < 0) {
            handleScroll(-1);
            angleAccumulator -= ticks * ANGLE_THRESHOLD;
        }
    }

    lastAngle = currentAngle;

    if (totalDragAngle > 5) {
        if (e.cancelable) e.preventDefault();
    }
}

function handleEnd() {
    isDragging = false;
}

document.addEventListener('mousemove', handleMove);
document.addEventListener('mouseup', handleEnd);

// --- Button Clicks & Keyboard Support ---
function setupButton(element, callback) {
    element.addEventListener('click', (e) => {
        unlockAudio();
        if (state.isHoldLocked) return;
        if (totalDragAngle > 5) return;

        playPiezoClick(true);
        callback();
        e.stopPropagation();
    });
}

document.addEventListener('keydown', (e) => {
    unlockAudio();
    if (state.isHoldLocked) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (state.currentMenu === 'brick_game') moveBrickPaddle(18);
        handleScroll(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (state.currentMenu === 'brick_game') moveBrickPaddle(-18);
        handleScroll(-1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        playPiezoClick(true);
        handleSelect();
    } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        playPiezoClick(true);
        handleMenuBack();
    } else if (e.key === ' ') {
        e.preventDefault();
        playPiezoClick(true);
        if (state.player) state.player.togglePlay();
    }
});

// --- UI Rendering & Menu Logic ---
const VISIBLE_MENU_ROWS = 6;

const menus = {
    main: {
        title: 'iPod',
        items: [
            { label: 'Playlists', type: 'menu', target: 'playlists' },
            { label: 'Artists', type: 'menu', target: 'artists' },
            { label: 'Albums', type: 'menu', target: 'albums' },
            { label: 'Songs', type: 'menu', target: 'songs' },
            { label: 'Extras', type: 'menu', target: 'extras' },
            { label: 'Settings', type: 'menu', target: 'settings' },
            { label: 'Shuffle Songs', type: 'action', action: 'shuffleAllSongs' },
            { label: 'Backlight', type: 'action', action: 'toggleBacklightQuick' },
            { label: 'Now Playing', type: 'now_playing' }
        ]
    },
    extras: {
        title: 'Extras',
        items: [
            { label: 'Clock', type: 'clock_view' },
            { label: 'Brick (Game)', type: 'brick_game' },
            {
                label: 'Sleep Timer',
                type: 'toggle',
                action: 'cycleSleepTimer',
                getValue: () => state.sleepMinutes === 0 ? 'Off' : `${state.sleepMinutes}m`
            }
        ]
    },
    settings: {
        title: 'Settings',
        items: [
            { label: 'About', type: 'about' },
            {
                label: 'Theme',
                type: 'toggle',
                action: 'cycleTheme',
                getValue: () => getCurrentThemeObj().name
            },
            {
                label: 'Shuffle',
                type: 'toggle',
                action: 'toggleShuffle',
                getValue: () => state.shuffle ? 'Songs' : 'Off'
            },
            {
                label: 'Repeat',
                type: 'toggle',
                action: 'toggleRepeat',
                getValue: () => ['Off', 'All', 'One'][state.repeatMode]
            },
            {
                label: 'Backlight',
                type: 'toggle',
                action: 'toggleBacklight',
                getValue: () => state.backlight ? 'On' : 'Off'
            },
            {
                label: 'Clicker',
                type: 'toggle',
                action: 'toggleClicker',
                getValue: () => state.clickerEnabled ? 'On' : 'Off'
            },
            {
                label: 'Battery %',
                type: 'toggle',
                action: 'toggleBatteryPct',
                getValue: () => state.showBatteryPercent ? 'On' : 'Off'
            },
            {
                label: 'Install App',
                type: 'action',
                action: 'installPWA',
                getValue: () => (window.matchMedia('(display-mode: standalone)').matches ? 'Installed' : 'Get')
            },
            { label: 'Log Out', type: 'action', action: 'logout' }
        ]
    },
    auth: {
        title: 'Spotify',
        items: [
            { label: 'Log In', type: 'action', action: 'login' }
        ]
    },
    playlists: { title: 'Playlists', items: [{ label: 'Loading...', type: 'none' }] },
    artists: { title: 'Artists', items: [{ label: 'Loading...', type: 'none' }] },
    albums: { title: 'Albums', items: [{ label: 'Loading...', type: 'none' }] },
    songs: { title: 'Songs', items: [{ label: 'Loading...', type: 'none' }] }
};

function updateStatusPlayIcon() {
    if (!statusPlayIcon) return;
    if (state.isPlaying) {
        statusPlayIcon.innerHTML = ICONS.play;
    } else if (state.currentTrack) {
        statusPlayIcon.innerHTML = ICONS.pause;
    } else {
        statusPlayIcon.innerHTML = '';
    }
}

function stopSpecialViews() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    stopBrickGame();
}

function buildMenuHTML(menu) {
    const total = menu.items.length;
    const showScrollbar = total > VISIBLE_MENU_ROWS;

    let html = '<div class="menu-wrapper"><div class="menu-list-viewport"><ul class="menu-list">';
    menu.items.forEach((item, index) => {
        const isActive = index === state.selectedIndex ? 'active' : '';
        const hasSubmenu = ['menu', 'playlist_folder', 'artist_folder', 'album_folder', 'about', 'now_playing', 'clock_view', 'brick_game'].includes(item.type);
        const arrow = hasSubmenu ? '<span class="menu-arrow">></span>' : '';
        const value = item.getValue ? `<span>${item.getValue()}</span>` : '';

        html += `
            <li class="menu-item ${isActive}" data-index="${index}">
                <span class="menu-item-label">${item.label}</span>
                <span class="menu-item-right">${value}${arrow}</span>
            </li>
        `;
    });
    html += '</ul></div>';

    if (showScrollbar) {
        const thumbHeightPct = Math.max(15, (VISIBLE_MENU_ROWS / total) * 100);
        const maxTopPct = 100 - thumbHeightPct;
        const thumbTopPct = total > 1 ? (state.selectedIndex / (total - 1)) * maxTopPct : 0;

        html += `
            <div class="ipod-scrollbar">
                <div class="ipod-scrollbar-thumb" id="ipod-scrollbar-thumb" style="height: ${thumbHeightPct}%; top: ${thumbTopPct}%;"></div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function renderMenu(menuId, animateDir = null) {
    const menu = menus[menuId];
    if (!menu || !screenContent) return;

    stopSpecialViews();
    state.currentMenu = menuId;
    state.isScrubbing = false;
    if (statusTitle) statusTitle.innerText = menu.title;
    updateStatusPlayIcon();

    const html = buildMenuHTML(menu);

    if (animateDir) {
        const oldView = document.createElement('div');
        oldView.className = `screen-view ${animateDir === 'right' ? 'slide-out-left' : 'slide-out-right'}`;
        oldView.innerHTML = screenContent.innerHTML;

        const newView = document.createElement('div');
        newView.className = `screen-view ${animateDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`;
        newView.innerHTML = html;

        screenContent.innerHTML = '';
        screenContent.appendChild(oldView);
        screenContent.appendChild(newView);

        setTimeout(() => {
            if (screenContent) {
                screenContent.innerHTML = html;
                updateActiveItem();
            }
        }, 180);
    } else {
        screenContent.innerHTML = html;
        updateActiveItem();
    }
}

function renderAbout(animateDir = null, customMessage = null) {
    if (!screenContent) return;
    stopSpecialViews();
    state.currentMenu = 'about';
    if (statusTitle) statusTitle.innerText = customMessage ? 'Install App' : 'About';

    const songsCount = state.savedTracksCache.length;
    const playlistsCount = menus.playlists.items.filter(i => i.type === 'playlist_folder').length;
    const albumsCount = menus.albums.items.filter(i => i.type === 'album_folder').length;

    const html = customMessage ? `
        <div class="about-view">
            <div class="about-title">Install iPodify</div>
            <div style="text-align:center; line-height:1.35; margin:auto 0;">
                ${customMessage}
            </div>
            <div style="text-align:center; font-size:11px;">Press MENU to go back</div>
        </div>
    ` : `
        <div class="about-view">
            <div class="about-title">${state.userName}'s iPod</div>
            <div class="about-row"><span>Songs</span><span>${songsCount}</span></div>
            <div class="about-row"><span>Albums</span><span>${albumsCount}</span></div>
            <div class="about-row"><span>Playlists</span><span>${playlistsCount}</span></div>
            <div class="about-row"><span>Theme</span><span>${getCurrentThemeObj().name}</span></div>
            <div class="about-row"><span>Version</span><span>1.4 (2026)</span></div>
        </div>
    `;

    if (animateDir) {
        const oldView = document.createElement('div');
        oldView.className = `screen-view ${animateDir === 'right' ? 'slide-out-left' : 'slide-out-right'}`;
        oldView.innerHTML = screenContent.innerHTML;

        const newView = document.createElement('div');
        newView.className = `screen-view ${animateDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`;
        newView.innerHTML = html;

        screenContent.innerHTML = '';
        screenContent.appendChild(oldView);
        screenContent.appendChild(newView);

        setTimeout(() => {
            if (screenContent) screenContent.innerHTML = html;
        }, 180);
    } else {
        screenContent.innerHTML = html;
    }
}

// --- Extras: Classic iPod Clock (No Emojis) ---
function renderClockView() {
    if (!screenContent) return;
    stopSpecialViews();
    state.currentMenu = 'clock_view';
    if (statusTitle) statusTitle.innerText = 'Clock';

    const updateClockHTML = () => {
        if (state.currentMenu !== 'clock_view' || !screenContent) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const sleepStr = state.sleepMinutes > 0
            ? `<div style="font-size:11px; margin-top:6px; display:flex; align-items:center; justify-content:center; gap:4px;">${ICONS.timer}<span>Sleep: ${state.sleepMinutes}m</span></div>`
            : '';

        screenContent.innerHTML = `
            <div class="clock-view">
                <div class="clock-time">${timeStr}</div>
                <div class="clock-date">${dateStr}</div>
                ${sleepStr}
            </div>
        `;
    };

    updateClockHTML();
    clockInterval = setInterval(updateClockHTML, 1000);
}

// --- Extras: 1st Gen iPod Brick (Breakout) Game ---
let brickAnimFrame = null;
const brickState = {
    paddleX: 110,
    paddleW: 54,
    paddleH: 6,
    ballX: 140,
    ballY: 120,
    vx: 2.2,
    vy: -2.2,
    score: 0,
    lives: 3,
    bricks: []
};

function initBricksArray() {
    const rows = 4;
    const cols = 8;
    brickState.bricks = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            brickState.bricks.push({
                x: 10 + c * 33,
                y: 18 + r * 11,
                w: 29,
                h: 7,
                alive: true
            });
        }
    }
}

function moveBrickPaddle(deltaX) {
    brickState.paddleX = Math.max(4, Math.min(280 - brickState.paddleW - 4, brickState.paddleX + deltaX));
}

function stopBrickGame() {
    if (brickAnimFrame) {
        cancelAnimationFrame(brickAnimFrame);
        brickAnimFrame = null;
    }
}

function startBrickGame() {
    if (!screenContent) return;
    stopSpecialViews();
    state.currentMenu = 'brick_game';
    if (statusTitle) statusTitle.innerText = 'Brick';

    screenContent.innerHTML = `<canvas id="brick-canvas" class="brick-canvas" width="280" height="186"></canvas>`;
    const canvas = document.getElementById('brick-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    brickState.paddleX = 113;
    brickState.ballX = 140;
    brickState.ballY = 140;
    brickState.vx = 2.1 * (Math.random() > 0.5 ? 1 : -1);
    brickState.vy = -2.2;
    brickState.score = 0;
    brickState.lives = 3;
    initBricksArray();

    const loop = () => {
        if (state.currentMenu !== 'brick_game' || !screenEl) return;

        const fg = getComputedStyle(screenEl).getPropertyValue('--screen-text').trim() || '#1f2623';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = fg;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Score: ${brickState.score}`, 8, 12);
        ctx.fillText(`Balls: ${brickState.lives}`, 225, 12);

        brickState.ballX += brickState.vx;
        brickState.ballY += brickState.vy;

        if (brickState.ballX < 4 || brickState.ballX > canvas.width - 4) {
            brickState.vx *= -1;
            playPiezoClick(false);
        }
        if (brickState.ballY < 16) {
            brickState.vy *= -1;
            playPiezoClick(false);
        }

        const py = canvas.height - 14;
        if (
            brickState.ballY >= py - 3 &&
            brickState.ballY <= py + brickState.paddleH &&
            brickState.ballX >= brickState.paddleX &&
            brickState.ballX <= brickState.paddleX + brickState.paddleW
        ) {
            brickState.vy = -Math.abs(brickState.vy);
            const hitOffset = (brickState.ballX - (brickState.paddleX + brickState.paddleW / 2)) / (brickState.paddleW / 2);
            brickState.vx = hitOffset * 3.1;
            playPiezoClick(false);
        }

        brickState.bricks.forEach(b => {
            if (!b.alive) return;
            if (
                brickState.ballX >= b.x &&
                brickState.ballX <= b.x + b.w &&
                brickState.ballY >= b.y &&
                brickState.ballY <= b.y + b.h
            ) {
                b.alive = false;
                brickState.vy *= -1;
                brickState.score += 10;
                playPiezoClick(false);
            }
        });

        if (brickState.bricks.every(b => !b.alive)) {
            initBricksArray();
        }

        if (brickState.ballY > canvas.height) {
            brickState.lives -= 1;
            if (brickState.lives <= 0) {
                brickState.score = 0;
                brickState.lives = 3;
                initBricksArray();
            }
            brickState.ballX = brickState.paddleX + brickState.paddleW / 2;
            brickState.ballY = py - 8;
            brickState.vy = -2.2;
        }

        brickState.bricks.forEach(b => {
            if (b.alive) {
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        });

        ctx.fillRect(brickState.paddleX, py, brickState.paddleW, brickState.paddleH);
        ctx.fillRect(brickState.ballX - 3, brickState.ballY - 3, 6, 6);

        brickAnimFrame = requestAnimationFrame(loop);
    };

    brickAnimFrame = requestAnimationFrame(loop);
}

// --- Now Playing Screen (Supports Per-Theme HTML Template & Clean SVG Icons) ---
function renderNowPlaying(animateDir = null) {
    if (!screenContent) return;
    stopSpecialViews();
    state.currentMenu = 'now_playing';
    if (statusTitle) statusTitle.innerText = 'Now Playing';
    updateStatusPlayIcon();

    const title = state.currentTrack ? state.currentTrack.name : 'Not Playing';
    const artist = state.currentTrack ? state.currentTrack.artists.map(a => a.name).join(', ') : '';
    const album = state.currentTrack ? state.currentTrack.album.name : '';
    const artworkUrl = getTrackArtworkUrl(state.currentTrack);
    const themeObj = getCurrentThemeObj();
    const isLongTitle = title.length > (themeObj.id === 'classic' ? 24 : 16);

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const activePos = state.isScrubbing ? state.scrubPosition : state.position;
    const progressPercent = state.duration ? Math.min(100, Math.max(0, (activePos / state.duration) * 100)) : 0;

    const trackIndexText = state.currentTrack ? `${state.queueIndex} of ${state.queueTotal}` : '';
    const shuffleIcon = state.shuffle ? ICONS.shuffle : '';
    const repeatIcon = state.repeatMode === 1 ? ICONS.repeatAll : (state.repeatMode === 2 ? ICONS.repeatOne : '');

    let html = '';

    if (typeof themeObj.renderNowPlaying === 'function') {
        html = themeObj.renderNowPlaying({
            title,
            artist,
            album,
            artworkUrl,
            isLongTitle,
            trackIndexText,
            isScrubbing: state.isScrubbing,
            showVolume: state.showVolume,
            progressPercent,
            volumePercent: state.volume * 100,
            currentTimeFormatted: formatTime(activePos),
            remainingTimeFormatted: formatTime(Math.max(0, state.duration - activePos)),
            shuffleIcon,
            repeatIcon,
            icons: ICONS
        });
    } else {
        // Default Classic 1G Now Playing (No Emojis)
        html = `
            <div class="now-playing">
                <div class="np-header">
                    <span>${trackIndexText}</span>
                    <span class="np-modes" style="display:inline-flex; align-items:center; gap:5px;">
                        ${state.isScrubbing ? '[Scrub]' : ''}
                        ${shuffleIcon}
                        ${repeatIcon}
                    </span>
                </div>
                <div class="np-info">
                    <div class="np-title ${isLongTitle ? 'marquee' : ''}"><span>${title}</span></div>
                    <div class="np-artist">${artist}</div>
                    <div class="np-album">${album}</div>
                </div>

                <div class="np-progress-container" style="display: ${state.showVolume ? 'none' : 'block'}">
                    <div class="np-progress-bar">
                        <div class="np-progress-fill" style="width: ${state.isScrubbing ? 0 : progressPercent}%"></div>
                        ${state.isScrubbing ? `<div class="np-scrub-diamond" style="left: ${progressPercent}%"></div>` : ''}
                    </div>
                    <div class="np-time">
                        <span>${formatTime(activePos)}</span>
                        <span>-${formatTime(Math.max(0, state.duration - activePos))}</span>
                    </div>
                </div>

                <div class="np-volume-container" style="display: ${state.showVolume ? 'flex' : 'none'}">
                    <span class="np-vol-icon">${ICONS.volumeLow}</span>
                    <div class="np-volume-bar-wrapper">
                        <div class="np-volume-fill" style="width: ${state.volume * 100}%"></div>
                    </div>
                    <span class="np-vol-icon">${ICONS.volumeHigh}</span>
                </div>
            </div>
        `;
    }

    if (animateDir) {
        const oldView = document.createElement('div');
        oldView.className = `screen-view ${animateDir === 'right' ? 'slide-out-left' : 'slide-out-right'}`;
        oldView.innerHTML = screenContent.innerHTML;

        const newView = document.createElement('div');
        newView.className = `screen-view ${animateDir === 'right' ? 'slide-in-right' : 'slide-in-left'}`;
        newView.innerHTML = html;

        screenContent.innerHTML = '';
        screenContent.appendChild(oldView);
        screenContent.appendChild(newView);

        setTimeout(() => {
            if (screenContent) screenContent.innerHTML = html;
        }, 180);
    } else {
        screenContent.innerHTML = html;
    }
}

function updateActiveItem() {
    if (!screenContent || ['now_playing', 'about', 'clock_view', 'brick_game'].includes(state.currentMenu)) return;

    const viewport = screenContent.querySelector('.menu-list-viewport');
    const items = screenContent.querySelectorAll('.menu-item');
    if (!viewport || items.length === 0) return;

    items.forEach((item, index) => {
        if (index === state.selectedIndex) {
            item.classList.add('active');
            const itemTop = item.offsetTop;
            const itemBottom = itemTop + item.offsetHeight;
            const viewTop = viewport.scrollTop;
            const viewBottom = viewTop + viewport.clientHeight;

            if (itemTop < viewTop) {
                viewport.scrollTop = itemTop;
            } else if (itemBottom > viewBottom) {
                viewport.scrollTop = itemBottom - viewport.clientHeight;
            }
        } else {
            item.classList.remove('active');
        }
    });

    const thumb = document.getElementById('ipod-scrollbar-thumb');
    const total = items.length;
    if (thumb && total > VISIBLE_MENU_ROWS) {
        const thumbHeightPct = Math.max(15, (VISIBLE_MENU_ROWS / total) * 100);
        const maxTopPct = 100 - thumbHeightPct;
        const thumbTopPct = total > 1 ? (state.selectedIndex / (total - 1)) * maxTopPct : 0;
        thumb.style.top = `${thumbTopPct}%`;
    }
}

function handleScroll(direction) {
    if (['about', 'clock_view', 'brick_game'].includes(state.currentMenu)) return;

    if (state.currentMenu === 'now_playing') {
        if (!state.player) return;

        if (state.isScrubbing && state.duration > 0) {
            state.scrubPosition = Math.max(0, Math.min(state.duration, state.scrubPosition + direction * 5000));
            playPiezoClick(false);
            renderNowPlaying();

            if (scrubTimeout) clearTimeout(scrubTimeout);
            scrubTimeout = setTimeout(() => {
                commitScrub();
            }, 1200);
            return;
        }

        let newVolume = Math.min(1, Math.max(0, state.volume + direction * 0.05));
        state.volume = newVolume;
        state.showVolume = true;
        playPiezoClick(false);
        renderNowPlaying();

        state.player.setVolume(newVolume).catch(() => {});

        if (volumeTimeout) clearTimeout(volumeTimeout);
        volumeTimeout = setTimeout(() => {
            state.showVolume = false;
            if (state.currentMenu === 'now_playing') {
                renderNowPlaying();
            }
        }, 1800);
        return;
    }

    const menu = menus[state.currentMenu];
    if (!menu || !menu.items || menu.items.length === 0) return;

    let newIndex = state.selectedIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= menu.items.length) newIndex = menu.items.length - 1;

    if (newIndex !== state.selectedIndex) {
        state.selectedIndex = newIndex;
        playPiezoClick(false);
        updateActiveItem();
    }
}

async function commitScrub() {
    if (!state.isScrubbing) return;
    const targetPos = Math.floor(state.scrubPosition);
    state.position = targetPos;
    state.isScrubbing = false;
    if (scrubTimeout) clearTimeout(scrubTimeout);

    if (state.player) {
        try {
            await state.player.seek(targetPos);
        } catch (_) {}
    }
    if (state.currentMenu === 'now_playing') {
        renderNowPlaying();
    }
}

function toggleBacklightState() {
    state.backlight = !state.backlight;
    if (screenEl) screenEl.classList.toggle('backlight-on', state.backlight);
    savePreferences();
}

async function toggleShuffleState() {
    state.shuffle = !state.shuffle;
    if (state.accessToken && state.deviceId) {
        fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state.shuffle}&device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${state.accessToken}` }
        }).catch(() => {});
    }
}

async function toggleRepeatState() {
    state.repeatMode = (state.repeatMode + 1) % 3;
    const modes = ['off', 'context', 'track'];
    if (state.accessToken && state.deviceId) {
        fetch(`https://api.spotify.com/v1/me/player/repeat?state=${modes[state.repeatMode]}&device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${state.accessToken}` }
        }).catch(() => {});
    }
}

function cycleSleepTimerState() {
    const options = [0, 15, 30, 60];
    const nextIdx = (options.indexOf(state.sleepMinutes) + 1) % options.length;
    state.sleepMinutes = options[nextIdx];

    if (sleepTimerTimeout) {
        clearTimeout(sleepTimerTimeout);
        sleepTimerTimeout = null;
    }

    if (state.sleepMinutes > 0) {
        sleepTimerTimeout = setTimeout(() => {
            if (state.player) state.player.pause();
            state.sleepMinutes = 0;
        }, state.sleepMinutes * 60 * 1000);
    }
}

async function handleInstallPWA() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice.catch(() => {});
        deferredInstallPrompt = null;
        renderMenu('settings');
    } else {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const msg = isStandalone
            ? 'iPodify is already installed as an app!'
            : 'In browser menu tap "Install App" or "Add to Home Screen".';
        renderAbout('right', msg);
    }
}

function handleSelect() {
    if (state.currentMenu === 'now_playing') {
        if (!state.currentTrack) return;
        if (!state.isScrubbing) {
            state.isScrubbing = true;
            state.showVolume = false;
            state.scrubPosition = state.position;
            renderNowPlaying();
            if (scrubTimeout) clearTimeout(scrubTimeout);
            scrubTimeout = setTimeout(() => commitScrub(), 3500);
        } else {
            commitScrub();
        }
        return;
    }

    if (['about', 'clock_view', 'brick_game'].includes(state.currentMenu)) {
        handleMenuBack();
        return;
    }

    const menu = menus[state.currentMenu];
    if (!menu || !menu.items) return;

    const item = menu.items[state.selectedIndex];
    if (!item) return;

    if (item.type === 'menu') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        state.selectedIndex = 0;
        renderMenu(item.target, 'right');
    } else if (item.type === 'about') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderAbout('right');
    } else if (item.type === 'clock_view') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderClockView();
    } else if (item.type === 'brick_game') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        startBrickGame();
    } else if (item.type === 'playlist_folder') {
        loadPlaylistTracks(item.id, item.label);
    } else if (item.type === 'artist_folder') {
        loadArtistTracks(item.id, item.label);
    } else if (item.type === 'album_folder') {
        loadAlbumTracks(item.id, item.label, item.initialTracks);
    } else if (item.type === 'play_context') {
        playEntireContext(item.context_uri, item.menuId);
    } else if (item.type === 'track') {
        playContext(item.uri, item.context_uri, menu.uris);
    } else if (item.type === 'now_playing') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderNowPlaying('right');
    } else if (item.type === 'toggle') {
        if (item.action === 'cycleTheme') {
            cycleThemeState();
        } else if (item.action === 'toggleClicker') {
            state.clickerEnabled = !state.clickerEnabled;
            savePreferences();
            playPiezoClick(true);
            renderMenu(state.currentMenu);
        } else if (item.action === 'toggleBatteryPct') {
            state.showBatteryPercent = !state.showBatteryPercent;
            savePreferences();
            updateBatteryUI();
            renderMenu(state.currentMenu);
        } else if (item.action === 'toggleBacklight') {
            toggleBacklightState();
            renderMenu(state.currentMenu);
        } else if (item.action === 'toggleShuffle') {
            toggleShuffleState();
            renderMenu(state.currentMenu);
        } else if (item.action === 'toggleRepeat') {
            toggleRepeatState();
            renderMenu(state.currentMenu);
        } else if (item.action === 'cycleSleepTimer') {
            cycleSleepTimerState();
            renderMenu(state.currentMenu);
        }
    } else if (item.type === 'action') {
        if (item.action === 'login') {
            window.location.href = '/login';
        } else if (item.action === 'toggleBacklightQuick') {
            toggleBacklightState();
        } else if (item.action === 'shuffleAllSongs') {
            shufflePlayAllSongs();
        } else if (item.action === 'installPWA') {
            handleInstallPWA();
        } else if (item.action === 'logout') {
            fetch('/logout').then(() => {
                window.location.hash = '';
                state.accessToken = null;
                state.menuStack = [];
                state.selectedIndex = 0;
                renderMenu('auth');
            });
        }
    }
}

function handleMenuBack() {
    if (state.isScrubbing) {
        state.isScrubbing = false;
        if (scrubTimeout) clearTimeout(scrubTimeout);
        renderNowPlaying();
        return;
    }

    if (state.menuStack.length > 0) {
        const prev = state.menuStack.pop();
        state.selectedIndex = prev.index;
        renderMenu(prev.id, 'left');
    }
}

// --- Spotify API Integration ---
async function fetchSpotifyAPI(endpoint) {
    if (!state.accessToken) return null;

    try {
        const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${state.accessToken}`
            }
        });

        if (response.status === 401) {
            window.location.reload();
            return null;
        }

        const rawText = await response.text();
        let data = null;
        if (rawText) {
            try {
                data = JSON.parse(rawText);
            } catch (_) {
                data = null;
            }
        }

        if (!response.ok) {
            let errMsg = response.statusText || `HTTP ${response.status}`;
            if (data && data.error) {
                errMsg = data.error.message || data.error;
            } else if (rawText) {
                errMsg = rawText.slice(0, 40);
            }
            return { error: errMsg, status: response.status };
        }

        return data;
    } catch (e) {
        console.error("Error fetching Spotify API", e);
        return { error: e.message || 'Network error', status: 0 };
    }
}

async function loadData() {
    const meData = await fetchSpotifyAPI('/me');
    if (meData && meData.id) {
        state.currentUserId = meData.id;
        if (meData.display_name) state.userName = meData.display_name;
    }

    const playlistsData = await fetchSpotifyAPI('/me/playlists?limit=50');
    if (playlistsData && Array.isArray(playlistsData.items)) {
        const validPlaylists = playlistsData.items.filter(p => p && p.id && p.name);
        menus.playlists.items = validPlaylists.length > 0
            ? validPlaylists.map(p => ({
                label: p.name,
                type: 'playlist_folder',
                uri: p.uri,
                id: p.id,
                ownerId: p.owner ? p.owner.id : null,
                collaborative: Boolean(p.collaborative)
            }))
            : [{ label: 'No Playlists', type: 'none' }];
    } else {
        menus.playlists.items = [{ label: 'No Playlists', type: 'none' }];
    }

    const artistsData = await fetchSpotifyAPI('/me/following?type=artist&limit=50');
    if (artistsData && artistsData.artists && Array.isArray(artistsData.artists.items)) {
        const validArtists = artistsData.artists.items.filter(a => a && a.id && a.name);
        menus.artists.items = validArtists.length > 0
            ? validArtists.map(a => ({
                label: a.name,
                type: 'artist_folder',
                uri: a.uri,
                id: a.id
            }))
            : [{ label: 'No Artists', type: 'none' }];
    } else {
        menus.artists.items = [{ label: 'No Artists', type: 'none' }];
    }

    const albumsData = await fetchSpotifyAPI('/me/albums?limit=50');
    if (albumsData && Array.isArray(albumsData.items)) {
        const validAlbums = albumsData.items
            .map(entry => entry && (entry.album || entry.item))
            .filter(alb => alb && alb.id && alb.name);

        menus.albums.items = validAlbums.length > 0
            ? validAlbums.map(alb => {
                const rawAlbumTracks = (alb.tracks && Array.isArray(alb.tracks.items))
                    ? alb.tracks.items
                    : (alb.items && Array.isArray(alb.items.items) ? alb.items.items : []);
                return {
                    label: alb.name,
                    type: 'album_folder',
                    uri: alb.uri,
                    id: alb.id,
                    initialTracks: rawAlbumTracks
                };
            })
            : [{ label: 'No Albums', type: 'none' }];
    } else {
        menus.albums.items = [{ label: 'No Albums', type: 'none' }];
    }

    const songsData = await fetchSpotifyAPI('/me/tracks?limit=50');
    if (songsData && Array.isArray(songsData.items)) {
        const validTracks = songsData.items
            .map(entry => entry && (entry.track || entry.item))
            .filter(track => track && track.uri && track.name && !track.is_local);

        state.savedTracksCache = [...validTracks];

        menus.songs.items = validTracks.map(track => ({
            label: track.name,
            type: 'track',
            uri: track.uri
        }));
        menus.songs.uris = validTracks.map(track => track.uri);

        if (songsData.total > 50) {
            loadRemainingSongsBackground(songsData.total);
        }
    } else {
        menus.songs.items = [{ label: 'No Songs', type: 'none' }];
    }

    if (['playlists', 'artists', 'albums', 'songs'].includes(state.currentMenu)) {
        renderMenu(state.currentMenu);
    }
}

async function loadRemainingSongsBackground(totalTracks) {
    let offset = 50;
    while (offset < totalTracks) {
        try {
            const data = await fetchSpotifyAPI(`/me/tracks?limit=50&offset=${offset}`);
            if (data && Array.isArray(data.items) && data.items.length > 0) {
                const validTracks = data.items
                    .map(entry => entry && (entry.track || entry.item))
                    .filter(track => track && track.uri && track.name && !track.is_local);

                state.savedTracksCache.push(...validTracks);

                const newItems = validTracks.map(track => ({
                    label: track.name,
                    type: 'track',
                    uri: track.uri
                }));
                const newUris = validTracks.map(track => track.uri);

                menus.songs.items = [...menus.songs.items, ...newItems];
                menus.songs.uris = [...menus.songs.uris, ...newUris];

                if (state.currentMenu === 'songs') {
                    const oldIndex = state.selectedIndex;
                    renderMenu('songs');
                    state.selectedIndex = oldIndex;
                    updateActiveItem();
                }
            } else {
                break;
            }
            offset += 50;
        } catch (e) {
            console.error("Error loading background songs", e);
            break;
        }
    }
}

async function loadAlbumTracks(albumId, title, initialTracks = []) {
    const menuId = `album_${albumId}`;
    const contextUri = `spotify:album:${albumId}`;

    if (state.currentMenu !== menuId) {
        menus[menuId] = {
            title: title,
            items: [{ label: 'Loading...', type: 'none' }]
        };
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        state.selectedIndex = 0;
        renderMenu(menuId, 'right');
    }

    let tracks = Array.isArray(initialTracks) ? initialTracks.filter(t => t && t.uri && t.name) : [];

    if (tracks.length === 0) {
        const data = await fetchSpotifyAPI(`/albums/${albumId}/tracks?limit=50`);
        if (data && Array.isArray(data.items)) {
            tracks = data.items.filter(t => t && t.uri && t.name);
        }
    }

    if (tracks.length > 0) {
        menus[menuId].items = tracks.map(t => ({
            label: t.name,
            type: 'track',
            uri: t.uri,
            context_uri: contextUri
        }));
        menus[menuId].uris = tracks.map(t => t.uri);
    } else {
        menus[menuId].items = [
            { label: 'Play Album', type: 'play_context', context_uri: contextUri, menuId: menuId }
        ];
        menus[menuId].uris = [];
    }

    if (state.currentMenu === menuId) renderMenu(menuId);
}

async function probePlaylistTracksViaQueue(playlistId) {
    if (!state.accessToken || !state.deviceId || !state.player) return [];
    if (state.isPlaying) return [];

    const prevVolume = state.volume || 0.5;
    try {
        await state.player.setVolume(0);

        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` })
        });

        await new Promise(r => setTimeout(r, 450));

        const queueData = await fetchSpotifyAPI('/me/player/queue');
        const sdkState = await state.player.getCurrentState();

        await state.player.pause();
        await state.player.setVolume(prevVolume);
        state.isPlaying = false;

        const collected = [];
        const seenUris = new Set();

        const addTrack = (t) => {
            if (t && t.uri && t.name && !seenUris.has(t.uri)) {
                seenUris.add(t.uri);
                collected.push(t);
            }
        };

        if (queueData && !queueData.error) {
            addTrack(queueData.currently_playing);
            if (Array.isArray(queueData.queue)) {
                queueData.queue.forEach(addTrack);
            }
        }

        if (sdkState && sdkState.track_window) {
            addTrack(sdkState.track_window.current_track);
            if (Array.isArray(sdkState.track_window.next_tracks)) {
                sdkState.track_window.next_tracks.forEach(addTrack);
            }
        }

        return collected;
    } catch (e) {
        try { await state.player.setVolume(prevVolume); } catch (_) {}
        return [];
    }
}

async function loadPlaylistTracks(playlistId, title) {
    const menuId = `playlist_${playlistId}`;
    const contextUri = `spotify:playlist:${playlistId}`;

    if (state.currentMenu !== menuId) {
        menus[menuId] = {
            title: title,
            items: [{ label: 'Loading...', type: 'none' }]
        };
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        state.selectedIndex = 0;
        renderMenu(menuId, 'right');
    }

    let data = await fetchSpotifyAPI(`/playlists/${playlistId}/items?limit=50`);

    if (!data || data.error || (!data.items && !data.tracks)) {
        const fallbackData = await fetchSpotifyAPI(`/playlists/${playlistId}`);
        if (fallbackData && !fallbackData.error) {
            data = fallbackData.items || fallbackData.tracks || fallbackData;
        }
    }

    const rawEntries = (data && Array.isArray(data.items))
        ? data.items
        : (data && data.tracks && Array.isArray(data.tracks.items) ? data.tracks.items : []);

    const validTracks = rawEntries
        .map(entry => entry && (entry.item || entry.track || (entry.uri ? entry : null)))
        .filter(track => track && track.uri && track.name && !track.is_local);

    if (validTracks.length > 0) {
        menus[menuId].items = [
            { label: 'Play Playlist', type: 'play_context', context_uri: contextUri, menuId: menuId },
            ...validTracks.map(trackObj => ({
                label: trackObj.name,
                type: 'track',
                uri: trackObj.uri,
                context_uri: contextUri
            }))
        ];
        menus[menuId].uris = validTracks.map(t => t.uri);
    } else {
        const queueTracks = await probePlaylistTracksViaQueue(playlistId);

        if (queueTracks.length > 0) {
            menus[menuId].items = [
                { label: 'Play Playlist', type: 'play_context', context_uri: contextUri, menuId: menuId },
                ...queueTracks.map(trackObj => ({
                    label: trackObj.name,
                    type: 'track',
                    uri: trackObj.uri,
                    context_uri: contextUri
                }))
            ];
            menus[menuId].uris = queueTracks.map(t => t.uri);
        } else {
            menus[menuId].items = [
                { label: 'Play & Load Tracks', type: 'play_context', context_uri: contextUri, menuId: menuId }
            ];
            menus[menuId].uris = [];
        }
    }

    if (state.currentMenu === menuId) renderMenu(menuId);
}

async function loadArtistTracks(artistId, title) {
    const menuId = `artist_${artistId}`;

    if (state.currentMenu !== menuId) {
        menus[menuId] = {
            title: title,
            items: [{ label: 'Loading...', type: 'none' }]
        };
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        state.selectedIndex = 0;
        renderMenu(menuId, 'right');
    }

    const mergedTracksMap = new Map();
    const addTrackIfValid = (track) => {
        if (track && track.uri && track.name && !track.is_local && !mergedTracksMap.has(track.uri)) {
            mergedTracksMap.set(track.uri, track);
        }
    };

    const normalizedTitle = title.trim().toLowerCase();
    state.savedTracksCache.forEach(track => {
        if (Array.isArray(track.artists)) {
            const matchesArtist = track.artists.some(
                a => a.id === artistId || (a.name && a.name.toLowerCase() === normalizedTitle)
            );
            if (matchesArtist) addTrackIfValid(track);
        }
    });

    const exactQuery = encodeURIComponent(`artist:"${title}"`);
    let searchData = await fetchSpotifyAPI(`/search?q=${exactQuery}&type=track&limit=10`);

    if (!searchData || searchData.error || !searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
        searchData = await fetchSpotifyAPI(`/search?q=${encodeURIComponent(title)}&type=track&limit=10`);
    }

    if (searchData && searchData.tracks && Array.isArray(searchData.tracks.items)) {
        searchData.tracks.items.forEach(track => {
            if (track && Array.isArray(track.artists) && track.artists.some(a => a.id === artistId)) {
                addTrackIfValid(track);
            }
        });

        if (mergedTracksMap.size === 0) {
            searchData.tracks.items.forEach(track => {
                if (track && Array.isArray(track.artists) && track.artists.some(a => a.name && a.name.toLowerCase() === normalizedTitle)) {
                    addTrackIfValid(track);
                }
            });
        }
    }

    const finalTracks = Array.from(mergedTracksMap.values());

    if (finalTracks.length > 0) {
        menus[menuId].items = finalTracks.map(t => ({
            label: t.name,
            type: 'track',
            uri: t.uri,
            context_uri: null
        }));
        menus[menuId].uris = finalTracks.map(t => t.uri);
    } else {
        menus[menuId].items = [
            { label: 'Play Artist Radio', type: 'play_context', context_uri: `spotify:artist:${artistId}`, menuId: menuId }
        ];
        menus[menuId].uris = [];
    }

    if (state.currentMenu === menuId) renderMenu(menuId);
}

async function shufflePlayAllSongs() {
    if (!state.accessToken || !state.deviceId) return;
    const allUris = menus.songs.uris || [];
    if (allUris.length === 0) return;

    const shuffled = [...allUris];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    state.shuffle = true;
    const batch = shuffled.slice(0, 100);
    state.queueIndex = 1;
    state.queueTotal = batch.length;

    try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: batch, offset: { position: 0 } })
        });

        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderNowPlaying('right');
    } catch (e) {
        console.error("Error shuffling songs", e);
    }
}

async function playEntireContext(contextUri, menuId = null) {
    if (!state.accessToken || !state.deviceId) return;

    try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ context_uri: contextUri })
        });

        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderNowPlaying('right');

        if (menuId && menus[menuId]) {
            setTimeout(async () => {
                const queueData = await fetchSpotifyAPI('/me/player/queue');
                if (queueData && !queueData.error) {
                    const tracks = [];
                    const seen = new Set();
                    const add = (t) => {
                        if (t && t.uri && t.name && !seen.has(t.uri)) {
                            seen.add(t.uri);
                            tracks.push(t);
                        }
                    };
                    add(queueData.currently_playing);
                    if (Array.isArray(queueData.queue)) queueData.queue.forEach(add);

                    if (tracks.length > 0) {
                        menus[menuId].items = [
                            { label: 'Play Playlist', type: 'play_context', context_uri: contextUri, menuId: menuId },
                            ...tracks.map(t => ({
                                label: t.name,
                                type: 'track',
                                uri: t.uri,
                                context_uri: contextUri
                            }))
                        ];
                        menus[menuId].uris = tracks.map(t => t.uri);
                        state.queueTotal = tracks.length;
                    }
                }
            }, 600);
        }
    } catch (e) {
        console.error("Error playing entire context", e);
    }
}

async function playContext(uri, contextUri = null, allUris = null) {
    if (!state.accessToken || !state.deviceId) return;

    try {
        let body = {};

        if (allUris && allUris.length > 0) {
            const idx = allUris.indexOf(uri);
            state.queueIndex = idx !== -1 ? idx + 1 : 1;
            state.queueTotal = allUris.length;
        } else {
            state.queueIndex = 1;
            state.queueTotal = 1;
        }

        if (contextUri && (contextUri.includes(':playlist:') || contextUri.includes(':album:'))) {
            body = {
                context_uri: contextUri,
                offset: { uri: uri }
            };
        } else if (allUris && allUris.length > 0) {
            const trackIndex = allUris.indexOf(uri);
            const startIndex = trackIndex !== -1 ? trackIndex : 0;
            const slicedUris = allUris.slice(startIndex, startIndex + 100);
            body = {
                uris: slicedUris,
                offset: { position: 0 }
            };
        } else {
            body = { uris: [uri] };
        }

        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderNowPlaying('right');

    } catch (e) {
        console.error("Error playing context", e);
    }
}

// --- Spotify Web Playback SDK Integration ---
window.onSpotifyWebPlaybackSDKReady = () => {
    if (!state.accessToken) return;
    initPlayer();
};

function initPlayer() {
    if (state.player) return;

    const player = new Spotify.Player({
        name: 'iPodify Web Player',
        getOAuthToken: cb => { cb(state.accessToken); },
        volume: 0.5
    });

    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });

    player.addListener('player_state_changed', stateUpdate => {
        if (!stateUpdate) return;

        state.currentTrack = stateUpdate.track_window.current_track;
        if (!state.isScrubbing) {
            state.position = stateUpdate.position;
        }
        state.duration = stateUpdate.duration;
        state.isPlaying = !stateUpdate.paused;
        state.shuffle = Boolean(stateUpdate.shuffle);
        state.repeatMode = stateUpdate.repeat_mode || 0;

        const prevCount = stateUpdate.track_window.previous_tracks ? stateUpdate.track_window.previous_tracks.length : 0;
        const nextCount = stateUpdate.track_window.next_tracks ? stateUpdate.track_window.next_tracks.length : 0;
        if (prevCount + nextCount > 0) {
            state.queueIndex = prevCount + 1;
            state.queueTotal = Math.max(state.queueTotal, prevCount + 1 + nextCount);
        }

        updateStatusPlayIcon();
        updateAmbientArtwork();

        if (state.currentMenu === 'now_playing') {
            renderNowPlaying();
        }
    });

    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        state.deviceId = device_id;
        state.player = player;

        loadData();
    });

    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    player.connect();

    setInterval(() => {
        if (state.isPlaying && !state.isScrubbing) {
            state.position += 1000;
            if (state.position > state.duration) state.position = state.duration;
            if (state.currentMenu === 'now_playing') {
                renderNowPlaying();
            }
        }
    }, 1000);
}

async function checkAuth() {
    await applyTheme(state.theme);
    initBatteryMonitor();

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');

    if (token) {
        state.accessToken = token;
        window.history.replaceState({}, document.title, window.location.pathname);
        renderMenu('main');
        if (window.Spotify) initPlayer();
    } else {
        fetch('/refresh_token')
            .then(res => res.json())
            .then(data => {
                if (data.access_token) {
                    state.accessToken = data.access_token;
                    renderMenu('main');
                    if (window.Spotify) initPlayer();
                } else {
                    renderMenu('auth');
                }
            })
            .catch(() => {
                renderMenu('auth');
            });
    }
}

// Start
checkAuth();
