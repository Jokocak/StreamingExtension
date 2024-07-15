document.addEventListener('DOMContentLoaded', () => {
    // Setup the login button event listeners
    setupLoginButton('twitch-login-button', authenticateUser);
    setupLoginButton('kick-login-button', placeholderFunction);
    setupLoginButton('youtube-login-button', placeholderFunction);

    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    switchTab('twitch'); // Default to Twitch tab
    checkAuthenticationStatus(); // Check if the user is already authenticated
});

function setupLoginButton(buttonId, callback) {
    const loginButton = document.getElementById(buttonId);
    if (loginButton) {
        loginButton.style.display = 'block';
        loginButton.addEventListener('click', callback);
    }
}

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

function authenticateUser() {
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
                            fetchLiveStreamers(token);
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

function updateUIAfterLogin(userName) {
    fetchLiveStreamers();

    const loginContainer = document.querySelector('.login-container');
    loginContainer.innerHTML = ''; // Clear the login container

    const streamersContainer = document.querySelector('#twitch');
    streamersContainer.insertAdjacentHTML('afterbegin', `
        <div id="logout-container">
            <span id="signed-in-message">Signed in as ${userName}</span>
            <button id="logout-button">Logout</button>
        </div>
    `);

    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', logoutUser);
}

function checkAuthenticationStatus() {
    chrome.storage.local.get(['twitch_token', 'twitch_user_name'], (data) => {
        if (data.twitch_token) {
            updateUIAfterLogin(data.twitch_user_name);
        }
    });
}

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

// Placeholder function for Kick and YouTube login buttons
function placeholderFunction() {
    alert('Login functionality for Kick and YouTube is not yet implemented.');
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

// Method fetches live streamers and prints their data
async function fetchLiveStreamers() {
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
                listItem.innerHTML = `
                    <a href="https://www.twitch.tv/${streamer.user_name}" target="_blank" class="stream-link">
                        <div class="thumbnail-container">
                            <img src="${thumbnailUrl}" alt="${streamer.user_name} thumbnail" class="stream-thumbnail">
                            <span class="stream-time">${calculateElapsedTime(streamer.started_at)}</span>
                        </div>
                        <div class="stream-info">
                            <span class="streamer-name">${streamer.user_name}</span>
                            <span class="viewer-count twitch-viewer-count">${streamer.viewer_count} viewers</span>
                        </div>
                    </a>`;
                list.appendChild(listItem);
            });
            startUpdatingElapsedTime();
        } else {
            const noStreamersMessage = document.createElement('li');
            noStreamersMessage.className = 'no-streamers-message';
            noStreamersMessage.textContent = 'There are currently no streamers live.';
            list.appendChild(noStreamersMessage);
        }
    } catch (error) {
        console.error('Error fetching live streamers:', error);
        const errorMessage = document.createElement('li');
        errorMessage.className = 'no-streamers-message';
        errorMessage.textContent = 'Error fetching live streamers';
        document.getElementById('twitch-streamers').appendChild(errorMessage);
    }
}

function calculateElapsedTime(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startUpdatingElapsedTime() {
    setInterval(() => {
        const listItems = document.querySelectorAll('#twitch-streamers li');
        listItems.forEach(listItem => {
            const startedAt = listItem.dataset.startedAt;
            const streamTimeElement = listItem.querySelector('.stream-time');
            streamTimeElement.textContent = calculateElapsedTime(startedAt);
        });
    }, 1000); // Update every second
}
