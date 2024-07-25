// Start up script
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
    streamersContainer.insertAdjacentHTML('afterbegin', `
        <div id="logout-container">
            <span id="signed-in-message">Signed in as ${userName}</span>
            <button id="logout-button">Logout</button>
        </div>
    `);

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


// ** YOUTUBE CODE START **

// *** TEST

// function authenticateUserYoutube() {
//     const CLIENT_ID = '321381782965-il338g5uvfo9b5uls732r6aupu6jd5l5.apps.googleusercontent.com';
//     const DISCOVERY_DOCS = 'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest';
//     const SCOPES = 'https://www.google.apis.com/auth/youtube';

//     alert('I WAS HERE.');

//     handleClientLoad();

//     alert('I WAS HERE TOO.');
// }

// // function myAuthentication() {
// //     const CLIENT_ID = '321381782965-il338g5uvfo9b5uls732r6aupu6jd5l5.apps.googleusercontent.com';
// //     const DISCOVERY_DOCS = 'https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest';
// //     const SCOPES = 'https://www.google.apis.com/auth/youtube';

// //     const authorizeButton = document.getElementById('authorize-button');
// //     const signoutButton = document.getElementById('signout-button');
// //     const content = document.getElementById('content');

// // }

// // Load auth2 library
// function handleClientLoad() {
//     gapi.load('client:auth2', initClient);
//     gapi.auth2.getAuthInstance().signIn();
// }

// // Initialize API client library and set up sign in listeners
// function initClient() {
//     gapi.client.init({
//         discoverDocs: DISCOVERY_DOCS,
//         clientId: CLIENT_ID,
//         scope: SCOPES
//     }).then(() => {
//         // // Listen for sign in state changes
//         // gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

//         // // Handle initial sign in state
//         // updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

//         // 
//         // authorizeButton.onclick = handleAuthClick;
//         // signoutButton.onclick = handleSignoutClick;
//     });
// }

// // Update UI Sign in state changes
// function updateSigninStatus(isSignedIn) {
//     if (isSignedIn) {
//         // ...
//     } else {
//         // ...
//     }
// }

// // Handle login
// function handleAuthClick() {
//     gapi.auth2.getAuthInstance().signIn();
// }

// // Handle logout
// function handleSignoutClick() {
//     gapi.auth2.getAuthInstance().signOut();
// }

// // Get Streamers
// function getChannel(channel) {

// }

// *** TEST

// Authenticates user for Youtube Account
function authenticateUserYoutube() {
    const clientId = '321381782965-il338g5uvfo9b5uls732r6aupu6jd5l5.apps.googleusercontent.com'; // ** YOUTUBE / GOOGLE CLIENT ID **
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = 'https://www.googleapis.com/auth/youtube.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;

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
                    fetchYouTubeUserDetails(token).then(userName => {
                        chrome.storage.local.set({ youtube_user_name: userName }, () => {
                            fetchYouTubeLiveStreamers(token);
                            updateYouTubeUIAfterLogin(userName);
                        });
                    });
                });
            } else {
                document.getElementById('youtube-streamers').textContent = 'Token not found in redirect URL';
            }
        }
    );
}

// Gets Youtuber Details
async function fetchYouTubeUserDetails(token) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.name; // You can also use data.email or other fields as needed
    } catch (error) {
        console.error('Error fetching user details:', error);
        document.getElementById('youtube-streamers').textContent = 'Error fetching user details';
    }
}

// Fetches Live Streamers on Youtube
async function fetchYouTubeLiveStreamers(token) {
    try {
        const response = await fetch('https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch subscriptions: ${response.statusText}`);
        }

        const data = await response.json();
        const subscriptions = data.items;
        const liveStreamers = await getLiveStreamers(subscriptions, token);
        displayYouTubeLiveStreamers(liveStreamers);
    } catch (error) {
        console.error('Error fetching live streamers:', error);
        const errorMessage = document.createElement('li');
        errorMessage.className = 'no-streamers-message';
        errorMessage.textContent = 'Error fetching live streamers';
        document.getElementById('youtube-streamers').appendChild(errorMessage);
    }
}

// Gets the subscriptions and checks if they are live streaming
async function getLiveStreamers(subscriptions, token) {
    const liveStreamers = [];
    for (const sub of subscriptions) {
        const channelId = sub.snippet.resourceId.channelId;
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            continue;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            liveStreamers.push({
                channelName: sub.snippet.title,
                liveStreamTitle: data.items[0].snippet.title,
                liveStreamId: data.items[0].id.videoId
            });
        }
    }
    return liveStreamers;
}

// Displays the Youtube Live Streamers in a list
function displayYouTubeLiveStreamers(liveStreamers) {
    const list = document.getElementById('youtube-streamers');
    list.innerHTML = '';
    if (liveStreamers.length > 0) {
        liveStreamers.forEach(streamer => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${streamer.liveStreamId}" target="_blank" class="stream-link">
                    <div class="stream-info">
                        <span class="streamer-name">${streamer.channelName}</span>
                        <span class="stream-title">${streamer.liveStreamTitle}</span>
                    </div>
                </a>`;
            list.appendChild(listItem);
        });
    } else {
        const noStreamersMessage = document.createElement('li');
        noStreamersMessage.className = 'no-streamers-message';
        noStreamersMessage.textContent = 'There are currently no live streams.';
        list.appendChild(noStreamersMessage);
    }
}

// ** YOUTUBE CODE END **

// ** KICK CODE START **

// TODO

// ** KICK CODE END **

// ** MISCELLANEOUS CODE **

// Debug Function
function calculateElapsedTime(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Debug Function
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
