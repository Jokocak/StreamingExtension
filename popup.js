document.addEventListener('DOMContentLoaded', () => {
    // Clear the stored token on load
    chrome.storage.local.remove('twitch_token', () => {
        console.log('Stored token cleared');
        const loginContainer = document.querySelector('.login-container');
        const loginButton = document.getElementById('login-button');
        
        loginButton.style.display = 'block';
        loginContainer.style.display = 'flex';
        
        loginButton.addEventListener('click', () => {
            authenticateUser();
        });
    });
});

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
                document.getElementById('streamers').textContent = 'User did not login';
                return;
            }
            const tokenMatch = redirect_url.match(/access_token=([^&]*)/);
            if (tokenMatch && tokenMatch[1]) {
                const token = tokenMatch[1];
                chrome.storage.local.set({ twitch_token: token }, () => {
                    const loginContainer = document.querySelector('.login-container');
                    loginContainer.style.display = 'none';
                    fetchLiveStreamers(token);
                });
            } else {
                document.getElementById('streamers').textContent = 'Token not found in redirect URL';
            }
        }
    );
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
        document.getElementById('streamers').textContent = 'Error fetching User ID';
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
        const list = document.getElementById('streamers');
        list.innerHTML = '';
        list.style.display = 'block';
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            data.data.forEach(streamer => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span class="streamer-name">${streamer.user_name}</span><span class="viewer-count">${streamer.viewer_count} viewers</span>`;
                list.appendChild(listItem);
            });
        } else {
            list.textContent = 'There are currently no streamers live.';
        }
    } catch (error) {
        console.error('Error fetching live streamers:', error);
        document.getElementById('streamers').textContent = 'Error fetching live streamers';
    }
}
