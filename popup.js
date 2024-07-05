document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['twitch_token'], (result) => {
      if (result.twitch_token) {
        fetchLiveStreamers(result.twitch_token);
      }
    });
  });
  
  function fetchLiveStreamers(token) {
    fetch('https://api.twitch.tv/helix/streams/followed', {
      headers: {
        'Client-ID': 'YOUR_TWITCH_CLIENT_ID',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        const streamers = data.data;
        const list = document.getElementById('streamers');
        streamers.forEach(streamer => {
          const listItem = document.createElement('li');
          listItem.textContent = `${streamer.user_name} is live with ${streamer.viewer_count} viewers`;
          list.appendChild(listItem);
        });
      })
      .catch(error => console.error('Error fetching live streamers:', error));
  }
  