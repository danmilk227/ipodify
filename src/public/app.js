// State
const state = {
    accessToken: null,
    menuStack: [], // Array to keep track of navigation history
    currentMenu: null,
    selectedIndex: 0,
    hapticsEnabled: true,
    player: null,
    deviceId: null,
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0
};

// DOM Elements
const screenContent = document.getElementById('screen-content');
const statusTitle = document.getElementById('status-title');
const wheel = document.getElementById('click-wheel');
const btnCenter = document.getElementById('btn-center');
const btnMenu = document.getElementById('btn-menu');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnPlayPause = document.getElementById('btn-play-pause');

// --- Haptics ---
function vibrate(duration = 10) {
    if (state.hapticsEnabled && 'vibrate' in navigator) {
        navigator.vibrate(duration);
    }
}

// --- Click Wheel Logic ---
// Used to differentiate between a tap and a drag
let totalDragAngle = 0;
let isDragging = false;
let startAngle = 0;
let lastAngle = 0;
let angleAccumulator = 0;
const ANGLE_THRESHOLD = 15; // Degrees needed to register a scroll tick

function getAngle(x, y) {
    const rect = wheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Calculate angle in degrees (0 is right, 90 is bottom)
    let angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
}

function handleStart(e) {
    totalDragAngle = 0; // Reset drag amount on every touch start

    // We don't ignore buttons anymore so dragging can start anywhere on the wheel
    if (e.target.id === 'btn-center') return;

    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startAngle = getAngle(clientX, clientY);
    lastAngle = startAngle;
    angleAccumulator = 0;

    // We don't preventDefault here to allow clicks to register naturally if not dragging
}

function handleMove(e) {
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentAngle = getAngle(clientX, clientY);

    let deltaAngle = currentAngle - lastAngle;

    // Handle wrap around (e.g., 359 to 0)
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    angleAccumulator += deltaAngle;
    totalDragAngle += Math.abs(deltaAngle); // Track total movement distance

    if (Math.abs(angleAccumulator) >= ANGLE_THRESHOLD) {
        const ticks = Math.trunc(angleAccumulator / ANGLE_THRESHOLD);

        if (ticks > 0) {
            // Scroll down / Clockwise
            handleScroll(1);
            angleAccumulator -= ticks * ANGLE_THRESHOLD;
        } else if (ticks < 0) {
            // Scroll up / Counter-clockwise
            handleScroll(-1);
            angleAccumulator -= ticks * ANGLE_THRESHOLD;
        }
    }

    lastAngle = currentAngle;

    // If we've dragged significantly, prevent default to stop scrolling the page/clicking
    if (totalDragAngle > 5) {
        if (e.cancelable) e.preventDefault();
    }
}

function handleEnd() {
    isDragging = false;
}

// Wheel Event Listeners
wheel.addEventListener('mousedown', handleStart);
document.addEventListener('mousemove', handleMove);
document.addEventListener('mouseup', handleEnd);

wheel.addEventListener('touchstart', handleStart, { passive: true });
wheel.addEventListener('touchmove', handleMove, { passive: false });
wheel.addEventListener('touchend', handleEnd);

// --- Button Clicks ---

// Helper to detect if click is exactly on a button or its area
function setupButton(element, callback) {
    element.addEventListener('click', (e) => {
        // If the user rotated the wheel, cancel the button click
        if (totalDragAngle > 5) {
            return;
        }

        vibrate(20);
        callback();
        e.stopPropagation();
    });
}

setupButton(btnCenter, () => {
    handleSelect();
});

setupButton(btnMenu, () => {
    handleMenuBack();
});

setupButton(btnPrev, () => {
    if (state.player) {
        state.player.previousTrack();
    }
});

setupButton(btnNext, () => {
    if (state.player) {
        state.player.nextTrack();
    }
});

setupButton(btnPlayPause, () => {
    if (state.player) {
        state.player.togglePlay();
    }
});


// --- UI Rendering & Menu Logic ---

// Menu definitions
const menus = {
    main: {
        title: 'iPod',
        items: [
            { label: 'Playlists', type: 'menu', target: 'playlists' },
            { label: 'Artists', type: 'menu', target: 'artists' },
            { label: 'Songs', type: 'menu', target: 'songs' },
            { label: 'Now Playing', type: 'now_playing' },
            { label: 'Settings', type: 'menu', target: 'settings' }
        ]
    },
    settings: {
        title: 'Settings',
        items: [
            { label: 'Vibration', type: 'toggle', action: 'toggleHaptics', getValue: () => state.hapticsEnabled ? 'On' : 'Off' },
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
    songs: { title: 'Songs', items: [{ label: 'Loading...', type: 'none' }] }
};

function renderMenu(menuId, animateDir = null) {
    const menu = menus[menuId];
    if (!menu) return;

    state.currentMenu = menuId;
    statusTitle.innerText = menu.title;

    let html = '<ul class="menu-list">';
    menu.items.forEach((item, index) => {
        const isActive = index === state.selectedIndex ? 'active' : '';
        const arrow = item.type === 'menu' ? '<span class="menu-arrow">></span>' : '';
        const value = item.getValue ? `<span>${item.getValue()}</span>` : '';

        html += `
            <li class="menu-item ${isActive}" data-index="${index}">
                <span>${item.label}</span>
                ${value}
                ${arrow}
            </li>
        `;
    });
    html += '</ul>';

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
        }, 200);
    } else {
        screenContent.innerHTML = html;
    }
}

function renderNowPlaying(animateDir = null) {
    state.currentMenu = 'now_playing';
    statusTitle.innerText = 'Now Playing';

    const title = state.currentTrack ? state.currentTrack.name : 'Not Playing';
    const artist = state.currentTrack ? state.currentTrack.artists.map(a => a.name).join(', ') : '';
    const album = state.currentTrack ? state.currentTrack.album.name : '';

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progressPercent = state.duration ? (state.position / state.duration) * 100 : 0;

    const html = `
        <div class="now-playing">
            <div class="np-header">
                <span>${state.selectedIndex + 1} of 1</span>
            </div>
            <div class="np-info">
                <div class="np-title">${title}</div>
                <div class="np-artist">${artist}</div>
                <div class="np-album">${album}</div>
            </div>
            <div class="np-progress-container">
                <div class="np-progress-bar">
                    <div class="np-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="np-time">
                    <span>${formatTime(state.position)}</span>
                    <span>-${formatTime(state.duration - state.position)}</span>
                </div>
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
        }, 200);
    } else {
        screenContent.innerHTML = html;
    }
}

function updateActiveItem() {
    if (state.currentMenu === 'now_playing') return;

    const items = screenContent.querySelectorAll('.menu-item');
    items.forEach((item, index) => {
        if (index === state.selectedIndex) {
            item.classList.add('active');
            // Basic scrolling to keep active item in view
            const scrollOffset = item.offsetTop - (screenContent.clientHeight / 2) + (item.clientHeight / 2);
            screenContent.scrollTo({ top: scrollOffset, behavior: 'smooth' });
        } else {
            item.classList.remove('active');
        }
    });
}

function handleScroll(direction) {
    if (state.currentMenu === 'now_playing') return;

    const menu = menus[state.currentMenu];
    if (!menu || !menu.items || menu.items.length === 0) return;

    let newIndex = state.selectedIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= menu.items.length) newIndex = menu.items.length - 1;

    if (newIndex !== state.selectedIndex) {
        state.selectedIndex = newIndex;
        vibrate(5); // Small tick
        updateActiveItem();
    }
}

function handleSelect() {
    if (state.currentMenu === 'now_playing') {
        if (state.player) state.player.togglePlay();
        return;
    }

    const menu = menus[state.currentMenu];
    if (!menu || !menu.items) return;

    const item = menu.items[state.selectedIndex];

    if (item.type === 'menu') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        state.selectedIndex = 0;
        renderMenu(item.target, 'right');
    } else if (item.type === 'now_playing') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderNowPlaying('right');
    } else if (item.type === 'toggle') {
        if (item.action === 'toggleHaptics') {
            state.hapticsEnabled = !state.hapticsEnabled;
            renderMenu(state.currentMenu); // re-render to update text
        }
    } else if (item.type === 'action') {
        if (item.action === 'login') {
            window.location.href = '/login';
        } else if (item.action === 'logout') {
            fetch('/logout').then(() => {
                window.location.hash = '';
                state.accessToken = null;
                state.menuStack = [];
                state.selectedIndex = 0;
                renderMenu('auth');
            });
        }
    } else if (item.type === 'track') {
        // Play track via Spotify API
        if (state.accessToken && item.uri) {
            playTrack(item.uri);
        }
    }
}

function handleMenuBack() {
    if (state.menuStack.length > 0) {
        const prev = state.menuStack.pop();
        state.selectedIndex = prev.index;
        renderMenu(prev.id, 'left');
    }
}

// Check for hash parameters (auth)
function checkAuth() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    const error = params.get('error');

    if (token) {
        state.accessToken = token;
        window.history.replaceState({}, document.title, window.location.pathname);
        renderMenu('main');
        // Will initialize Spotify SDK and fetch data in next steps
    } else {
        // Try to refresh token if it exists
        fetch('/refresh_token')
            .then(res => res.json())
            .then(data => {
                if (data.access_token) {
                    state.accessToken = data.access_token;
                    renderMenu('main');
                    // init app
                } else {
                    renderMenu('auth');
                }
            })
            .catch(() => {
                renderMenu('auth');
            });
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
            // Token expired, let's trigger a reload to try refreshing
            window.location.reload();
            return null;
        }

        return await response.json();
    } catch (e) {
        console.error("Error fetching Spotify API", e);
        return null;
    }
}

async function loadData() {
    // Load Playlists
    const playlistsData = await fetchSpotifyAPI('/me/playlists?limit=20');
    if (playlistsData && playlistsData.items) {
        menus.playlists.items = playlistsData.items.map(p => ({
            label: p.name,
            type: 'playlist',
            uri: p.uri
        }));
    } else {
        menus.playlists.items = [{ label: 'No Playlists', type: 'none' }];
    }

    // Load Artists (Top Artists)
    const artistsData = await fetchSpotifyAPI('/me/top/artists?limit=20');
    if (artistsData && artistsData.items) {
        menus.artists.items = artistsData.items.map(a => ({
            label: a.name,
            type: 'artist',
            uri: a.uri
        }));
    } else {
        menus.artists.items = [{ label: 'No Artists', type: 'none' }];
    }

    // Load Songs (Saved Tracks)
    const songsData = await fetchSpotifyAPI('/me/tracks?limit=50');
    if (songsData && songsData.items) {
        menus.songs.items = songsData.items.map(t => ({
            label: t.track.name,
            type: 'track',
            uri: t.track.uri
        }));
    } else {
        menus.songs.items = [{ label: 'No Songs', type: 'none' }];
    }

    // If currently on one of these menus, re-render
    if (['playlists', 'artists', 'songs'].includes(state.currentMenu)) {
        renderMenu(state.currentMenu);
    }
}

async function playContext(uri) {
    if (!state.accessToken || !state.deviceId) return;

    try {
        const isTrack = uri.includes(':track:');
        const body = isTrack ? { uris: [uri] } : { context_uri: uri };

        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        // Go to now playing screen
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderNowPlaying('right');

    } catch (e) {
        console.error("Error playing context", e);
    }
}

// Modify handleSelect to support playing contexts
const originalHandleSelect = handleSelect;
handleSelect = function() {
    if (state.currentMenu === 'now_playing') {
        if (state.player) state.player.togglePlay();
        return;
    }

    const menu = menus[state.currentMenu];
    if (!menu || !menu.items) return;

    const item = menu.items[state.selectedIndex];

    if (['playlist', 'artist', 'track'].includes(item.type)) {
        playContext(item.uri);
    } else {
        originalHandleSelect(); // Call original for navigation
    }
}

// --- Spotify Web Playback SDK Integration ---
window.onSpotifyWebPlaybackSDKReady = () => {
    if (!state.accessToken) return;

    initPlayer();
};

function initPlayer() {
    if (state.player) return; // Already initialized

    const player = new Spotify.Player({
        name: 'iPodify Web Player',
        getOAuthToken: cb => { cb(state.accessToken); },
        volume: 0.5
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });

    // Playback status updates
    player.addListener('player_state_changed', stateUpdate => {
        if (!stateUpdate) return;

        state.currentTrack = stateUpdate.track_window.current_track;
        state.position = stateUpdate.position;
        state.duration = stateUpdate.duration;
        state.isPlaying = !stateUpdate.paused;

        if (state.currentMenu === 'now_playing') {
            renderNowPlaying(); // Re-render to update UI without animation
        }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        state.deviceId = device_id;
        state.player = player;

        // Load library data once ready
        loadData();
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    player.connect();

    // Start interval to update progress bar if playing
    setInterval(() => {
        if (state.isPlaying && state.currentMenu === 'now_playing') {
            state.position += 1000;
            if (state.position > state.duration) state.position = state.duration;
            renderNowPlaying(); // Basic re-render for progress
        }
    }, 1000);
}

// Modify checkAuth to init player if token exists and SDK is already loaded
const originalCheckAuth = checkAuth;
checkAuth = function() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');

    if (token) {
        state.accessToken = token;
        window.history.replaceState({}, document.title, window.location.pathname);
        renderMenu('main');
        if (window.Spotify) initPlayer();
    } else {
        // Try to refresh token if it exists
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
