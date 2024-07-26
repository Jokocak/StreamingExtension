document.addEventListener('DOMContentLoaded', () => {
    // Setup the login button event listeners
    setupLoginButton('twitch-login-button', authenticateUserTwitch);
    setupLoginButton('youtube-login-button', authenticateUserYoutube);
    setupLoginButton('kick-login-button', placeholderFunction);
    
    // Sets up different tabs for Twitch, Youtube, and Kick
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    switchTab('twitch'); // Default to Twitch tab
    checkAuthenticationStatus(); // Check if the user is already authenticated
});

// Displays login button if not logged in on the current tab
function setupLoginButton(buttonId, callback) {
    const loginButton = document.getElementById(buttonId);
    if (loginButton) {
        loginButton.style.display = 'block';
        loginButton.addEventListener('click', callback);
    }
}

// Implements tab switching functionality
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        content.classList.remove('active');
        const loginButton = content.querySelector('button');
        if (loginButton) {
            loginButton.style.display = 'none';
        }
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    const activeTabContent = document.getElementById(tabName);
    const loginButton = activeTabContent.querySelector('button');
    if (loginButton) {
        loginButton.style.display = 'block';
    }
}

// Authenticates user for Twitch account
function authenticateUserTwitch() {
    const clientId = 'aitzxubiftictbsri53s7fe77klatu';
    const redirectUri = chrome.identity.getRedirectURL();
    const encodedRedirectUri = encodeURIComponent(redirectUri);

    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=token&scope=user:read:follows`;

    chrome.identity.launchWebAuthFlow(
        {
            url: authUrl,
            interactive: true
        },
        (redirect_url) => {
            if (chrome.runtime.lastError || redirect_url.includes('error')) {
                document.getElementById('twitch-streamers').textContent = 'User did not login';
                return;
            }
            const tokenMatch = redirect_url.match(/access_token=([^&]*)/);
            if (tokenMatch && tokenMatch[1]) {
                const token = tokenMatch[1];
                chrome.storage.local.set({ twitch_token: token }, () => {
                    fetchUserDetails(token).then(userName => {
                        chrome.storage.local.set({ twitch_user_name: userName }, () => {
                            fetchTwitchLiveStreamers(token);
                            updateUIAfterLogin(userName);
                        });
                    });
                });
            } else {
                document.getElementById('twitch-streamers').textContent = 'Token not found in redirect URL';
            }
        }
    );
}

// This function updates the UI after the user logs in
function updateUIAfterLogin(userName) {
    fetchTwitchLiveStreamers();

    const loginContainer = document.querySelector('.login-container');
    loginContainer.innerHTML = ''; // Clear the login container

    const streamersContainer = document.querySelector('#twitch');
    streamersContainer.insertAdjacentHTML('afterbegin', 
        `<div id="logout-container">
            <span id="signed-in-message">Signed in as ${userName}</span>
            <button id="logout-button">Logout</button>
        </div>`
    );

    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', logoutUser);
}

// This function ensures that the user is authenticated
function checkAuthenticationStatus() {
    chrome.storage.local.get(['twitch_token', 'twitch_user_name'], (data) => {
        if (data.twitch_token) {
            updateUIAfterLogin(data.twitch_user_name);
        }
    });
}

// This function logs out the user and clears the cookies related to Twitch so
// the previous account is not remembered
async function logoutUser() {
    const tokenData = await chrome.storage.local.get('twitch_token');
    const token = tokenData.twitch_token;

    if (token) {
        // Revoke the token
        await revokeToken(token);

        // Clear Twitch cookies
        clearTwitchCookies();

        // Remove the token and user information from local storage
        chrome.storage.local.remove(['twitch_token', 'twitch_user_name'], () => {
            location.reload(); // Reload the popup to reset the UI
        });
    }
}

// Function to revoke the token
async function revokeToken(token) {
    const clientId = 'aitzxubiftictbsri53s7fe77klatu';
    const url = 'https://id.twitch.tv/oauth2/revoke';
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('token', token);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`Failed to revoke token: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error revoking token:', error);
    }
}

// Function to clear Twitch cookies
function clearTwitchCookies() {
    const domains = ['.twitch.tv', 'twitch.tv'];
    const cookieStore = chrome.cookies;

    domains.forEach(domain => {
        cookieStore.getAll({ domain }, (cookies) => {
            cookies.forEach(cookie => {
                cookieStore.remove({ url: `https://${domain}${cookie.path}`, name: cookie.name });
            });
        });
    });
}

// Placeholder function for Kick login button
function placeholderFunction() {
    alert('Login functionality for Kick is not yet implemented.');
}

// Method fetches the current user's details
async function fetchUserDetails(token) {
    const clientId = 'aitzxubiftictbsri53s7fe77klatu';
    try {
        const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': clientId
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].display_name;
    } catch (error) {
        console.error('Error fetching user details:', error);
        document.getElementById('twitch-streamers').textContent = 'Error fetching user details';
    }
}

// Method fetches the current user's id
async function getUserId(token, clientId) {
    try {
        const response = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': clientId
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data[0].id;
    } catch (error) {
        console.error('Error fetching User ID:', error);
        document.getElementById('twitch-streamers').textContent = 'Error fetching User ID';
    }
}

// This method fetches the Twitch live streamers and prints their data
async function fetchTwitchLiveStreamers() {
    try {
        const tokenData = await chrome.storage.local.get('twitch_token');
        const token = tokenData.twitch_token;
        const userId = await getUserId(token, 'aitzxubiftictbsri53s7fe77klatu');
        const response = await fetch(`https://api.twitch.tv/helix/streams/followed?user_id=${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-ID': 'aitzxubiftictbsri53s7fe77klatu'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch followed streamers: ${response.statusText}`);
        }

        const data = await response.json();
        const list = document.getElementById('twitch-streamers');
        list.innerHTML = '';
        list.style.display = 'block';
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            data.data.forEach(streamer => {
                const thumbnailUrl = streamer.thumbnail_url.replace('{width}', '100').replace('{height}', '56');
                const listItem = document.createElement('li');
                listItem.dataset.startedAt = streamer.started_at; // Store start time in a data attribute
                listItem.innerHTML = 
                    `<a href="https://www.twitch.tv/${streamer.user_name}" target="_blank" class="stream-link">
                        <div class="thumbnail-container">
                            <img src="${thumbnailUrl}" alt="${streamer.user_name} thumbnail" class="stream-thumbnail">
                            <span class="stream-time">${calculateElapsedTime(streamer.started_at)}</span>
                        </div>
                        <span class="streamer-name">${streamer.user_name}</span>
                    </a>`;
                list.appendChild(listItem);
            });
        } else {
            list.innerHTML = '<li>No live streamers found</li>';
        }
    } catch (error) {
        console.error('Error fetching followed streamers:', error);
        document.getElementById('twitch-streamers').textContent = 'Error fetching followed streamers';
    }
}

// This function calculates the elapsed time since the streamer started
function calculateElapsedTime(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now - start) / 1000);

    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
}



// Authenticates user for YouTube account
function authenticateUserYoutube() {
    const clientId = '321381782965-c82hpc02gof5vemrqkrlia82irspsijb.apps.googleusercontent.com';
    const redirectUri = chrome.identity.getRedirectURL();
    const encodedRedirectUri = encodeURIComponent(redirectUri);

    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=token&scope=https://www.googleapis.com/auth/youtube`;

    chrome.identity.launchWebAuthFlow(
        {
            url: authUrl,
            interactive: true
        },
        (redirect_url) => {
            if (chrome.runtime.lastError || redirect_url.includes('error')) {
                document.getElementById('youtube-streamers').textContent = 'User did not login';
                return;
            }
            const tokenMatch = redirect_url.match(/access_token=([^&]*)/);
            if (tokenMatch && tokenMatch[1]) {
                const token = tokenMatch[1];
                chrome.storage.local.set({ youtube_token: token }, () => {
                    fetchYoutubeLiveStreamers(token);
                });
            } else {
                document.getElementById('youtube-streamers').textContent = 'Token not found in redirect URL';
            }
        }
    );
}

// Fetches live streamers from YouTube
async function fetchYoutubeLiveStreamers(token) {
    try {
        // Get logged in channel ID
        const responseId = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Check if response is ok
        if (!responseId.ok) {
            throw new Error(`Failed to fetch User channel ID: ${responseId.statusText}`);
        }

        // Record channel ID
        const responseIdData = await responseId.json();
        const channelId = responseIdData.items[0].id;

        // Debug Message
        console.log('Grabbed user\'s channel id!');

        // ** FIX OR ENCRYPT IN SOME WAY **
        const API_KEY = 'AIzaSyAfTyBeQEeFq_7lrUdDdCJJlWUy0YvQ_PA';

        // Get Subscriptions using grabbed logged in user's channel id
        const response = await fetch(`https://youtube.googleapis.com/youtube/v3/subscriptions?part=snippet%2CcontentDetails&channelId=${channelId}&key=${API_KEY}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Check if response is ok
        if (!response.ok) {
            throw new Error(`Failed to fetch User's subscribed channels: ${responseSubs.statusText}`);
        }

        // Debug Message
        console.log('Grabbed subscribed accounts!');

        // ** Grab Live Broadcasts - TODO **
        // Format for grabbing live broadcasts api endpoint
        // const responseLive = await fetch(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&maxResults=1`, {
        //     headers: {
        //         'Authorization': `Bearer ${token}`
        //     }
        // });

        // Check if response is ok
        // if (!response.ok) {
        //     throw new Error(`Failed to fetch YouTube live streamers: ${responseLive.statusText}`);
        // }

        // Debug Message
        // console.log('Grabbed streaming accounts!');

        const data = await response.json();
        const list = document.getElementById('youtube-streamers');
        list.innerHTML = '';
        list.style.display = 'block';
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            data.items.forEach(stream => {
                const thumbnailUrl = stream.snippet.thumbnails.default.url;
                const listItem = document.createElement('li');
                listItem.innerHTML = 
                    `<a href="https://www.youtube.com/watch?v=${stream.id}" target="_blank" class="stream-link">
                        <div class="thumbnail-container">
                            <img src="${thumbnailUrl}" alt="${stream.snippet.channelTitle} thumbnail" class="stream-thumbnail">
                        </div>
                        <span class="streamer-name">${stream.snippet.channelTitle}</span>
                    </a>`;
                list.appendChild(listItem);
            });
        } else {
            list.innerHTML = '<li>No live streamers found</li>';
        }
    } catch (error) {
        console.error('Error fetching YouTube live streamers:', error);
        document.getElementById('youtube-streamers').textContent = 'Error fetching YouTube live streamers';
    }
}
