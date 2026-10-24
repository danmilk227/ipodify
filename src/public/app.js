// --- Saved Preferences ---
const savedPrefs = JSON.parse(localStorage.getItem('ipodify_prefs') || '{}');

// State
const state = {
    accessToken: null,
    currentUserId: null,
    userName: 'iPod User',
    savedTracksCache: [],
    menuStack: [],
    currentMenu: null,
    selectedIndex: 0,
    // Режимы отклика: 'both' (звук + вибро), 'sound' (только щелчок), 'vibe' (только вибро), 'off'
    feedbackMode: savedPrefs.feedbackMode || 'both',
    backlight: savedPrefs.backlight || false,
    shuffle: false,
    repeatMode: 0, // 0: Off, 1: All (context), 2: One (track)
    player: null,
    deviceId: null,
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.5,
    showVolume: false,
    isScrubbing: false, // Режим перемотки трека колесом в Now Playing
    scrubPosition: 0,
    queueIndex: 1,
    queueTotal: 1
};

let volumeTimeout = null;
let scrubTimeout = null;
let audioCtx = null;

function savePreferences() {
    localStorage.setItem('ipodify_prefs', JSON.stringify({
        feedbackMode: state.feedbackMode,
        backlight: state.backlight
    }));
}

// DOM Elements
const screenEl = document.getElementById('screen');
const screenContent = document.getElementById('screen-content');
const statusTitle = document.getElementById('status-title');
const statusPlayIcon = document.getElementById('status-play-icon');
const wheel = document.getElementById('click-wheel');
const btnCenter = document.getElementById('btn-center');
const btnMenu = document.getElementById('btn-menu');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnPlayPause = document.getElementById('btn-play-pause');

// Применяем сохраненную подсветку при старте
if (state.backlight) {
    screenEl.classList.add('backlight-on');
}

// --- Haptics & Authentic 1st Gen Piezo Clicker ---
function unlockFeedback() {
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

// Синтез аутентичного механического пьезо-щелчка iPod 1st Gen
function playPiezoClick(isButton = false) {
    try {
        unlockFeedback();
        if (!audioCtx) return;

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        // Короткий импульс высокой частоты имитирует пьезодинамик внутри корпуса iPod
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

function triggerFeedback(type = 'tick') {
    if (state.feedbackMode === 'off') return;

    const useVibe = state.feedbackMode === 'both' || state.feedbackMode === 'vibe';
    const useSound = state.feedbackMode === 'both' || state.feedbackMode === 'sound';

    if (useVibe && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
            // На некоторых мобильных браузерах требуется сначала сбросить очередь вибрации
            navigator.vibrate(type === 'button' ? 18 : 8);
        } catch (_) {}
    }

    if (useSound) {
        playPiezoClick(type === 'button');
    }
}

// --- Click Wheel Logic ---
let totalDragAngle = 0;
let isDragging = false;
let startAngle = 0;
let lastAngle = 0;
let angleAccumulator = 0;
const ANGLE_THRESHOLD = 14; // Чуть более отзывчивый шаг прокрутки

function getAngle(x, y) {
    const rect = wheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
}

function handleStart(e) {
    unlockFeedback();
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
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentAngle = getAngle(clientX, clientY);

    let deltaAngle = currentAngle - lastAngle;

    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    angleAccumulator += deltaAngle;
    totalDragAngle += Math.abs(deltaAngle);

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

// Wheel Event Listeners (passive: false на touchstart гарантирует разблокировку виброотклика!)
wheel.addEventListener('mousedown', handleStart);
document.addEventListener('mousemove', handleMove);
document.addEventListener('mouseup', handleEnd);

wheel.addEventListener('touchstart', handleStart, { passive: false });
wheel.addEventListener('touchmove', handleMove, { passive: false });
wheel.addEventListener('touchend', handleEnd);

// --- Button Clicks & Keyboard Support ---
function setupButton(element, callback) {
    element.addEventListener('click', (e) => {
        unlockFeedback();
        if (totalDragAngle > 5) return;

        triggerFeedback('button');
        callback();
        e.stopPropagation();
    });
}

setupButton(btnCenter, () => handleSelect());
setupButton(btnMenu, () => handleMenuBack());
setupButton(btnPrev, () => {
    if (state.player) state.player.previousTrack();
});
setupButton(btnNext, () => {
    if (state.player) state.player.nextTrack();
});
setupButton(btnPlayPause, () => {
    if (state.player) state.player.togglePlay();
});

// Управление с клавиатуры для удобства на ПК/ноутбуке
document.addEventListener('keydown', (e) => {
    unlockFeedback();
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleScroll(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleScroll(-1);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerFeedback('button');
        handleSelect();
    } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        triggerFeedback('button');
        handleMenuBack();
    } else if (e.key === ' ') {
        e.preventDefault();
        triggerFeedback('button');
        if (state.player) state.player.togglePlay();
    }
});

// --- UI Rendering & Menu Logic (Authentic iPod 1st Gen Structure) ---
const VISIBLE_MENU_ROWS = 6;

const menus = {
    main: {
        title: 'iPod',
        items: [
            { label: 'Playlists', type: 'menu', target: 'playlists' },
            { label: 'Artists', type: 'menu', target: 'artists' },
            { label: 'Albums', type: 'menu', target: 'albums' },
            { label: 'Songs', type: 'menu', target: 'songs' },
            { label: 'Shuffle Songs', type: 'action', action: 'shuffleAllSongs' },
            { label: 'Backlight', type: 'action', action: 'toggleBacklightQuick' },
            { label: 'Settings', type: 'menu', target: 'settings' },
            { label: 'Now Playing', type: 'now_playing' }
        ]
    },
    settings: {
        title: 'Settings',
        items: [
            { label: 'About', type: 'about' },
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
                action: 'cycleFeedback',
                getValue: () => ({
                    both: 'Both',
                    sound: 'Sound',
                    vibe: 'Vibe',
                    off: 'Off'
                }[state.feedbackMode] || 'Both')
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
        statusPlayIcon.innerText = '▶';
    } else if (state.currentTrack) {
        statusPlayIcon.innerText = '❚❚';
    } else {
        statusPlayIcon.innerText = '';
    }
}

function buildMenuHTML(menu) {
    const total = menu.items.length;
    const showScrollbar = total > VISIBLE_MENU_ROWS;

    let html = '<div class="menu-wrapper"><div class="menu-list-viewport"><ul class="menu-list">';
    menu.items.forEach((item, index) => {
        const isActive = index === state.selectedIndex ? 'active' : '';
        const hasSubmenu = ['menu', 'playlist_folder', 'artist_folder', 'album_folder', 'about', 'now_playing'].includes(item.type);
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
    if (!menu) return;

    state.currentMenu = menuId;
    state.isScrubbing = false;
    statusTitle.innerText = menu.title;
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
            screenContent.innerHTML = html;
            updateActiveItem();
        }, 180);
    } else {
        screenContent.innerHTML = html;
        updateActiveItem();
    }
}

function renderAbout(animateDir = null) {
    state.currentMenu = 'about';
    statusTitle.innerText = 'About';

    const songsCount = state.savedTracksCache.length;
    const playlistsCount = menus.playlists.items.filter(i => i.type === 'playlist_folder').length;
    const albumsCount = menus.albums.items.filter(i => i.type === 'album_folder').length;

    const html = `
        <div class="about-view">
            <div class="about-title">${state.userName}'s iPod</div>
            <div class="about-row"><span>Songs</span><span>${songsCount}</span></div>
            <div class="about-row"><span>Albums</span><span>${albumsCount}</span></div>
            <div class="about-row"><span>Playlists</span><span>${playlistsCount}</span></div>
            <div class="about-row"><span>Version</span><span>1.1 (2026)</span></div>
            <div class="about-row"><span>S/N</span><span>M8541LL/A</span></div>
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
            screenContent.innerHTML = html;
        }, 180);
    } else {
        screenContent.innerHTML = html;
    }
}

function renderNowPlaying(animateDir = null) {
    state.currentMenu = 'now_playing';
    statusTitle.innerText = 'Now Playing';
    updateStatusPlayIcon();

    const title = state.currentTrack ? state.currentTrack.name : 'Not Playing';
    const artist = state.currentTrack ? state.currentTrack.artists.map(a => a.name).join(', ') : '';
    const album = state.currentTrack ? state.currentTrack.album.name : '';

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const activePos = state.isScrubbing ? state.scrubPosition : state.position;
    const progressPercent = state.duration ? Math.min(100, Math.max(0, (activePos / state.duration) * 100)) : 0;

    const trackIndexText = state.currentTrack ? `${state.queueIndex} of ${state.queueTotal}` : '';
    const shuffleBadge = state.shuffle ? '🔀' : '';
    const repeatBadge = state.repeatMode === 1 ? '🔁' : (state.repeatMode === 2 ? '🔂' : '');

    const html = `
        <div class="now-playing">
            <div class="np-header">
                <span>${trackIndexText}</span>
                <span class="np-modes">${ state.isScrubbing ? '[Scrubbing]' : '' } ${shuffleBadge} ${repeatBadge}</span>
            </div>
            <div class="np-info">
                <div class="np-title">${title}</div>
                <div class="np-artist">${artist}</div>
                <div class="np-album">${album}</div>
            </div>

            <div class="np-progress-container" style="display: ${state.showVolume ? 'none' : 'block'}">
                <div class="np-progress-bar">
                    <div class="np-progress-fill" style="width: ${ state.isScrubbing ? 0 : progressPercent }%"></div>
                    ${ state.isScrubbing ? `<div class="np-scrub-diamond" style="left: ${progressPercent}%"></div>` : '' }
                </div>
                <div class="np-time">
                    <span>${formatTime(activePos)}</span>
                    <span>-${formatTime(Math.max(0, state.duration - activePos))}</span>
                </div>
            </div>

            <div class="np-volume-container" style="display: ${state.showVolume ? 'flex' : 'none'}">
                <span class="np-vol-icon">🔈</span>
                <div class="np-volume-bar-wrapper">
                    <div class="np-volume-fill" style="width: ${state.volume * 100}%"></div>
                </div>
                <span class="np-vol-icon">🔊</span>
            </div>
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
            screenContent.innerHTML = html;
        }, 180);
    } else {
        screenContent.innerHTML = html;
    }
}

function updateActiveItem() {
    if (state.currentMenu === 'now_playing' || state.currentMenu === 'about') return;

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

    // Обновляем классический ползунок скроллбара справа
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
    if (state.currentMenu === 'about') return;

    if (state.currentMenu === 'now_playing') {
        if (!state.player) return;

        // Если активен режим перемотки (Scrubbing) — крутим позицию трека по 5 секунд за тик
        if (state.isScrubbing && state.duration > 0) {
            state.scrubPosition = Math.max(0, Math.min(state.duration, state.scrubPosition + direction * 5000));
            triggerFeedback('tick');
            renderNowPlaying();

            if (scrubTimeout) clearTimeout(scrubTimeout);
            scrubTimeout = setTimeout(() => {
                commitScrub();
            }, 1200);
            return;
        }

        // Обычный режим в Now Playing — регулировка громкости
        let newVolume = Math.min(1, Math.max(0, state.volume + direction * 0.05));
        state.volume = newVolume;
        state.showVolume = true;
        triggerFeedback('tick');
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
        triggerFeedback('tick');
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
    screenEl.classList.toggle('backlight-on', state.backlight);
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

function handleSelect() {
    // В Now Playing центральная кнопка включает/фиксирует режим перемотки трека колесом (как на классическом iPod!)
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

    if (state.currentMenu === 'about') {
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
    } else if (item.type === 'playlist_folder') {
        loadPlaylistTracks(item.id, item.label, item.ownerId, item.collaborative);
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
        if (item.action === 'cycleFeedback') {
            const order = ['both', 'sound', 'vibe', 'off'];
            const nextIdx = (order.indexOf(state.feedbackMode) + 1) % order.length;
            state.feedbackMode = order[nextIdx];
            savePreferences();
            triggerFeedback('button');
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
        }
    } else if (item.type === 'action') {
        if (item.action === 'login') {
            window.location.href = '/login';
        } else if (item.action === 'toggleBacklightQuick') {
            toggleBacklightState();
        } else if (item.action === 'shuffleAllSongs') {
            shufflePlayAllSongs();
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
    // 0. Профиль пользователя
    const meData = await fetchSpotifyAPI('/me');
    if (meData && meData.id) {
        state.currentUserId = meData.id;
        if (meData.display_name) state.userName = meData.display_name;
    }

    // 1. Плейлисты
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

    // 2. Исполнители из подписок
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

    // 3. Сохраненные альбомы (Новое меню Albums в стиле 1st Gen iPod!)
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

    // 4. Сохраненные треки (Songs)
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

// Загрузка треков выбранного альбома
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
            { label: '▶ Play Album', type: 'play_context', context_uri: contextUri, menuId: menuId }
        ];
        menus[menuId].uris = [];
    }

    if (state.currentMenu === menuId) renderMenu(menuId);
}

// Пробник очереди для чужих сохраненных плейлистов в Dev Mode
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
            { label: '▶ Play Playlist', type: 'play_context', context_uri: contextUri, menuId: menuId },
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
                { label: '▶ Play Playlist', type: 'play_context', context_uri: contextUri, menuId: menuId },
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
                { label: '▶ Play & Load Tracks', type: 'play_context', context_uri: contextUri, menuId: menuId }
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
            { label: '▶ Play Artist Radio', type: 'play_context', context_uri: `spotify:artist:${artistId}`, menuId: menuId }
        ];
        menus[menuId].uris = [];
    }

    if (state.currentMenu === menuId) renderMenu(menuId);
}

// Shuffle Songs с главного экрана (классическая фича первого iPod)
async function shufflePlayAllSongs() {
    if (!state.accessToken || !state.deviceId) return;
    const allUris = menus.songs.uris || [];
    if (allUris.length === 0) return;

    // Перемешиваем копию массива алгоритмом Фишера-Йейтса
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
                            { label: '▶ Play Playlist', type: 'play_context', context_uri: contextUri, menuId: menuId },
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

function checkAuth() {
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
