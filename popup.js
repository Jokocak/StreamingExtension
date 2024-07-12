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
                    const loginContainer = document.querySelector('.login-container');
                    loginContainer.style.height = '0';
                    loginContainer.style.marginBottom = '0';
                    loginContainer.innerHTML = ''; // Remove the login button from the DOM
                    fetchLiveStreamers(token);
                });
            } else {
                document.getElementById('twitch-streamers').textContent = 'Token not found in redirect URL';
            }
        }
    );
}

// Placeholder function for Kick and YouTube login buttons
function placeholderFunction() {
    alert('Login functionality for Kick and YouTube is not yet implemented.');
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
async function fetchLiveStreamers(token) {
    try {
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
            list.textContent = 'There are currently no streamers live.';
        }
    } catch (error) {
        console.error('Error fetching live streamers:', error);
        document.getElementById('twitch-streamers').textContent = 'Error fetching live streamers';
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
