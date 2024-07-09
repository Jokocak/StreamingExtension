document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['twitch_token'], (result) => {
      console.log('Stored Token:', result.twitch_token);
      if (result.twitch_token) {
          fetchLiveStreamers(result.twitch_token);
      } else {
          document.getElementById('streamers').textContent = 'No token found!';
      }
  });
});

function fetchLiveStreamers(token) {
  console.log('Fetching live streamers with token:', token);
  fetch('https://api.twitch.tv/helix/streams', {
      headers: {
          'Client-ID': 'aitzxubiftictbsri53s7fe77klatu',
          'Authorization': `Bearer ${token}`
      }
  })
  .then(response => response.json())
  .then(data => {
      console.log('Streamers data:', data);
      const streamers = data.data;
      const list = document.getElementById('streamers');
      list.innerHTML = '';
      streamers.forEach(streamer => {
          const listItem = document.createElement('li');
          listItem.textContent = `${streamer.user_name} is live with ${streamer.viewer_count} viewers`;
          list.appendChild(listItem);
      });
  })
  .catch(error => {
      console.error('Error fetching live streamers:', error);
      document.getElementById('streamers').textContent = 'Error fetching live streamers';
  });
}
