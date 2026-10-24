// State
const state = {
    accessToken: null,
    currentUserId: null,
    savedTracksCache: [], // Кэш сохраненных треков для быстрого поиска по артистам
    menuStack: [], // Array to keep track of navigation history
    currentMenu: null,
    selectedIndex: 0,
    hapticsEnabled: true,
    player: null,
    deviceId: null,
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.5,
    showVolume: false
};
let volumeTimeout = null;

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
    let angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
}

function handleStart(e) {
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

// Wheel Event Listeners
wheel.addEventListener('mousedown', handleStart);
document.addEventListener('mousemove', handleMove);
document.addEventListener('mouseup', handleEnd);

wheel.addEventListener('touchstart', handleStart, { passive: true });
wheel.addEventListener('touchmove', handleMove, { passive: false });
wheel.addEventListener('touchend', handleEnd);

// --- Button Clicks ---
function setupButton(element, callback) {
    element.addEventListener('click', (e) => {
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
        const hasSubmenu = ['menu', 'playlist_folder', 'artist_folder'].includes(item.type);
        const arrow = hasSubmenu ? '<span class="menu-arrow">></span>' : '';
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
            updateActiveItem();
        }, 200);
    } else {
        screenContent.innerHTML = html;
        updateActiveItem();
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
                <span>Now Playing</span>
            </div>
            <div class="np-info">
                <div class="np-title">${title}</div>
                <div class="np-artist">${artist}</div>
                <div class="np-album">${album}</div>
            </div>

            <div class="np-progress-container" style="display: ${state.showVolume ? 'none' : 'block'}">
                <div class="np-progress-bar">
                    <div class="np-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="np-time">
                    <span>${formatTime(state.position)}</span>
                    <span>-${formatTime(Math.max(0, state.duration - state.position))}</span>
                </div>
            </div>

            <div class="np-volume-container" style="display: ${state.showVolume ? 'flex' : 'none'}">
                <div class="np-volume-bar-wrapper">
                    <div class="np-volume-fill" style="width: ${state.volume * 100}%"></div>
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
            const scrollOffset = item.offsetTop - (screenContent.clientHeight / 2) + (item.clientHeight / 2);
            screenContent.scrollTo({ top: scrollOffset, behavior: 'smooth' });
        } else {
            item.classList.remove('active');
        }
    });
}

function handleScroll(direction) {
    if (state.currentMenu === 'now_playing') {
        if (state.player) {
            state.player.getVolume().then(volume => {
                let newVolume = volume + (direction * 0.05);
                if (newVolume > 1) newVolume = 1;
                if (newVolume < 0) newVolume = 0;

                state.player.setVolume(newVolume).then(() => {
                    state.volume = newVolume;
                    state.showVolume = true;
                    renderNowPlaying();
                    vibrate(5);

                    if (volumeTimeout) clearTimeout(volumeTimeout);
                    volumeTimeout = setTimeout(() => {
                        state.showVolume = false;
                        if (state.currentMenu === 'now_playing') {
                            renderNowPlaying();
                        }
                    }, 2000);
                });
            });
        }
        return;
    }

    const menu = menus[state.currentMenu];
    if (!menu || !menu.items || menu.items.length === 0) return;

    let newIndex = state.selectedIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= menu.items.length) newIndex = menu.items.length - 1;

    if (newIndex !== state.selectedIndex) {
        state.selectedIndex = newIndex;
        vibrate(5);
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
    if (!item) return;

    if (item.type === 'menu') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        state.selectedIndex = 0;
        renderMenu(item.target, 'right');
    } else if (item.type === 'playlist_folder') {
        loadPlaylistTracks(item.id, item.label, item.ownerId, item.collaborative);
    } else if (item.type === 'artist_folder') {
        loadArtistTracks(item.id, item.label);
    } else if (item.type === 'play_context') {
        playEntireContext(item.context_uri, item.menuId);
    } else if (item.type === 'track') {
        playContext(item.uri, item.context_uri, menu.uris);
    } else if (item.type === 'now_playing') {
        state.menuStack.push({ id: state.currentMenu, index: state.selectedIndex });
        renderNowPlaying('right');
    } else if (item.type === 'toggle') {
        if (item.action === 'toggleHaptics') {
            state.hapticsEnabled = !state.hapticsEnabled;
            renderMenu(state.currentMenu);
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
    }
}

function handleMenuBack() {
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

        // Безопасное чтение тела ответа (Spotify может вернуть plain-text "Forbidden" или пустое тело)
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
    // 0. Загружаем профиль текущего пользователя, чтобы знать свой user.id
    const meData = await fetchSpotifyAPI('/me');
    if (meData && meData.id) {
        state.currentUserId = meData.id;
    }

    // 1. Load Playlists (фильтруем null-элементы, которые Spotify иногда возвращает)
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

    // 2. Load Artists (Followed Artists)
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

    // 3. Load Songs (Saved Tracks) + индексация для раздела Artists
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

    if (['playlists', 'artists', 'songs'].includes(state.currentMenu)) {
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

// Вспомогательная функция: извлечение треков чужого плейлиста через очередь плеера (обход ограничения Dev Mode)
async function probePlaylistTracksViaQueue(playlistId) {
    if (!state.accessToken || !state.deviceId || !state.player) return [];

    // Чтобы не прерывать уже играющую у пользователя музыку, делаем тихий пробник только если плеер на паузе
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
        console.error("Queue probe failed", e);
        try { await state.player.setVolume(prevVolume); } catch (_) {}
        return [];
    }
}

async function loadPlaylistTracks(playlistId, title, ownerId = null, collaborative = false) {
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

    // 1. Пробуем новый эндпоинт 2026 года /items
    let data = await fetchSpotifyAPI(`/playlists/${playlistId}/items?limit=50`);

    // 2. Если вернулась ошибка, пробуем классический /playlists/{id}
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
        // В Dev Mode (февраль 2026) Spotify скрывает треки чужих сохраненных плейлистов.
        // Пробуем подтянуть треки через очередь Web Playback SDK:
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
            // Если музыка уже играет, не прерываем её — даем кнопку запуска плейлиста, которая сама подгрузит очередь
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

    // 1. Сначала берем все сохраненные треки этого исполнителя из медиатеки пользователя
    const normalizedTitle = title.trim().toLowerCase();
    state.savedTracksCache.forEach(track => {
        if (Array.isArray(track.artists)) {
            const matchesArtist = track.artists.some(
                a => a.id === artistId || (a.name && a.name.toLowerCase() === normalizedTitle)
            );
            if (matchesArtist) addTrackIfValid(track);
        }
    });

    // 2. Так как GET /artists/{id}/top-tracks удален в феврале 2026 года,
    // используем GET /search с новым максимальным лимитом Dev Mode (limit=10)
    const exactQuery = encodeURIComponent(`artist:"${title}"`);
    let searchData = await fetchSpotifyAPI(`/search?q=${exactQuery}&type=track&limit=10`);

    // Если точный фильтр в кавычках ничего не дал или вернул ошибку, делаем общий поиск по имени
    if (!searchData || searchData.error || !searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
        searchData = await fetchSpotifyAPI(`/search?q=${encodeURIComponent(title)}&type=track&limit=10`);
    }

    if (searchData && searchData.tracks && Array.isArray(searchData.tracks.items)) {
        // Сначала добавляем треки со строгим совпадением artist.id
        searchData.tracks.items.forEach(track => {
            if (track && Array.isArray(track.artists) && track.artists.some(a => a.id === artistId)) {
                addTrackIfValid(track);
            }
        });

        // Если по ID ничего не нашлось, проверяем совпадение по имени исполнителя
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
        // ВАЖНО: Не передаем context_uri: spotify:artist:{id} вместе с offset,
        // так как Spotify API запрещает offset для контекста артиста. Передаем массив uris!
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

// Запуск всего контекста (например, чужого плейлиста) с автоматической подгрузкой очереди в меню
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

        // В фоне подтягиваем треки из очереди плеера в меню плейлиста
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

        // Spotify разрешает offset: { uri } только для playlist и album контекстов (не для artist!)
        if (contextUri && (contextUri.includes(':playlist:') || contextUri.includes(':album:'))) {
            body = {
                context_uri: contextUri,
                offset: { uri: uri }
            };
        } else if (allUris && allUris.length > 0) {
            const trackIndex = allUris.indexOf(uri);
            const startIndex = trackIndex !== -1 ? trackIndex : 0;
            // Ограничиваем окно до 100 URI, чтобы не превысить лимит размера тела запроса Spotify
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
        state.position = stateUpdate.position;
        state.duration = stateUpdate.duration;
        state.isPlaying = !stateUpdate.paused;

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
        if (state.isPlaying && state.currentMenu === 'now_playing') {
            state.position += 1000;
            if (state.position > state.duration) state.position = state.duration;
            renderNowPlaying();
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
