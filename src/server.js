require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const path = require('path');
const querystring = require('querystring');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Generate a random string for state verification
const generateRandomString = (length) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// State cookie name
const stateKey = 'spotify_auth_state';

// 1. Redirect to Spotify Login
app.get('/login', (req, res) => {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    // Requested scopes
    const scope = 'user-read-private user-read-email user-library-read user-top-read user-follow-read streaming user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
            state: state,
            show_dialog: true
        })
    );
});

// 2. Handle Callback from Spotify
app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
    } else {
        res.clearCookie(stateKey);

        try {
            const authOptions = {
                method: 'post',
                url: 'https://accounts.spotify.com/api/token',
                data: querystring.stringify({
                    code: code,
                    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
                    grant_type: 'authorization_code'
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
                }
            };

            const response = await axios(authOptions);
            const { access_token, refresh_token, expires_in } = response.data;

            // Store refresh token securely in an HttpOnly cookie
            res.cookie('refresh_token', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });

            // Redirect back to frontend with the access token (short lived)
            res.redirect('/#' + querystring.stringify({
                access_token: access_token,
                expires_in: expires_in
            }));

        } catch (error) {
            console.error('Error fetching token:', error.response?.data || error.message);
            res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
        }
    }
});

// 3. Endpoint to refresh the access token using the HttpOnly refresh token
app.get('/refresh_token', async (req, res) => {
    const refresh_token = req.cookies.refresh_token;

    if (!refresh_token) {
        return res.status(401).json({ error: 'No refresh token available' });
    }

    try {
        const authOptions = {
            method: 'post',
            url: 'https://accounts.spotify.com/api/token',
            data: querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
            }
        };

        const response = await axios(authOptions);
        const { access_token, expires_in } = response.data;

        // If Spotify returns a new refresh token, update the cookie
        if (response.data.refresh_token) {
             res.cookie('refresh_token', response.data.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
        }

        res.json({
            access_token: access_token,
            expires_in: expires_in
        });
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        res.clearCookie('refresh_token'); // Clear invalid token
        res.status(401).json({ error: 'Failed to refresh token' });
    }
});

// 4. Endpoint to clear cookies on logout
app.get('/logout', (req, res) => {
    res.clearCookie('refresh_token');
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
