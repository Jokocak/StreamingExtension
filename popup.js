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

// async function getUserId(accessToken, clientId) {
//     const response = await fetch('https://api.twitch.tv/helix/users', {
//         headers: {
//             'Authorization': `Bearer ${accessToken}`,
//             'Client-Id': clientId
//         }
//     });
//     const data = await response.json();
//     return data.data[0].id; // User ID
// }

// const userId = getUserId(`Bearer ${token}`, 'aitzxubiftictbsri53s7fe77klatu');

// function fetchLiveStreamers(token) {
//   console.log('Fetching live streamers with token:', token);
//   fetch('https://api.twitch.tv/helix/users/follows?from_id=${userId}', {
//       headers: {
//           'Client-ID': 'aitzxubiftictbsri53s7fe77klatu',
//           'Authorization': `Bearer ${token}`
//       }
//   })
//   .then(response => response.json())
//   .then(data => {
//       console.log('Streamers data:', data);
//       const streamers = data.data;
//       const list = document.getElementById('streamers');
//       list.innerHTML = '';
//       streamers.forEach(streamer => {
//           const listItem = document.createElement('li');
//           listItem.textContent = `${streamer.user_name} is live with ${streamer.viewer_count} viewers`;
//           list.appendChild(listItem);
//       });
//   })
//   .catch(error => {
//       console.error('Error fetching live streamers:', error);
//       document.getElementById('streamers').textContent = 'Error fetching live streamers';
//   });
// }

// document.addEventListener('DOMContentLoaded', () => {
//   chrome.storage.local.get(['twitch_token'], async (result) => {
//     console.log('Stored Token:', result.twitch_token);
//     if (result.twitch_token) {
//       const token = result.twitch_token;
//       const clientId = 'aitzxubiftictbsri53s7fe77klatu';
//       try {
//         const userId = await getUserId(token, clientId);
//         if (userId) {
//           await fetchLiveStreamers(token, clientId, userId);
//         } else {
//           document.getElementById('streamers').textContent = 'Failed to get user ID';
//         }
//       } catch (error) {
//         console.error('Error fetching user ID:', error);
//         document.getElementById('streamers').textContent = 'Error fetching user ID';
//       }
//     } else {
//       document.getElementById('streamers').textContent = 'No token found!';
//     }
//   });
// });

// async function getUserId(accessToken, clientId) {
//   try {
//     const response = await fetch('https://api.twitch.tv/helix/users', {
//       headers: {
//         'Authorization': `Bearer ${accessToken}`,
//         'Client-Id': clientId
//       }
//     });
//     if (!response.ok) {
//       throw new Error(`Failed to fetch user ID: ${response.statusText}`);
//     }
//     const data = await response.json();
//     if (data.data && data.data.length > 0) {
//       return data.data[0].id; // User ID
//     } else {
//       throw new Error('No user data found');
//     }
//   } catch (error) {
//     console.error('Error in getUserId:', error);
//     return null;
//   }
// }

async function fetchLiveStreamers(token) {
  console.log('Fetching live streamers with token:', token);
  try {
    console.log('The id: ', token.getUserId);
    const response = await fetch(`https://api.twitch.tv/helix/streams/followed?user_id=${token.getUserId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-ID': 'aitzxubiftictbsri53s7fe77klatu'
      }
    });
    
    //document.getElementById('streamers').textContent = response.json();

    // This is the error
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
    //document.getElementById('streamers').textContent = 'Error fetching live streamers';
  }
}