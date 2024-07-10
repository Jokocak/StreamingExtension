document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['twitch_token'], (result) => {
      console.log('Stored Token:', result.twitch_token);
      if (result.twitch_token) {
          console.log('Meow');
          fetchLiveStreamers(result.twitch_token);
      } else {
          document.getElementById('streamers').textContent = 'No token found!';
      }
  });
});

// Get User ID
async function getUserId(token, clientId) {
  try {
    const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Client-Id': clientId
        }
    });

    // Check for error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data[0].id; // User ID
  } catch (error) {
    console.error('Error fetching User ID:', error);
    document.getElementById('streamers').textContent = 'Error fetching User ID';
  }
}

// 
async function fetchLiveStreamers(token) {
  console.log('Fetching live streamers with token:', token);
  try {
    // Fetch User ID
    const userId = await getUserId(token, 'aitzxubiftictbsri53s7fe77klatu');
    console.log('UserId: ', userId);

    // Fetch streamers
    const response = await fetch(`https://api.twitch.tv/helix/streams/followed?user_id=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-ID': 'aitzxubiftictbsri53s7fe77klatu'
      }
    });

    // Check if fail to grab streamers
    if (!response.ok) {
      throw new Error(`Failed to fetch followed streamers: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Streamers data:', data);
    if (data.data && Array.isArray(data.data)) {
      const streamers = data.data;
      const list = document.getElementById('streamers');
      list.innerHTML = '';
      streamers.forEach(streamer => {
        const listItem = document.createElement('li');
        listItem.textContent = `${streamer.to_name} is followed by ${streamer.from_name}`;
        list.appendChild(listItem);
      });
    } else {
      throw new Error('No streamers data found');
    }
  } catch (error) {
    console.error('Error fetching live streamers:', error);
    document.getElementById('streamers').textContent = 'Error fetching live streamers';
  }
}