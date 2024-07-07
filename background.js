console.log('Service worker starting...');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  const clientId = 'aitzxubiftictbsri53s7fe77klatu';
  const redirectUri = 'https://hhihnnhihneiplcdlmmeejmaafcappig.chromiumapp.org/';
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=token&scope=user:read:follows`;

  console.log('Authorization URL:', authUrl);

  chrome.identity.launchWebAuthFlow(
      {
          url: authUrl,
          interactive: true
      },
      (redirect_url) => {
          console.log('Redirect URL:', redirect_url);
          if (chrome.runtime.lastError || redirect_url.includes('error')) {
              console.error('OAuth Error:', chrome.runtime.lastError || 'Authorization error');
              return;
          }
          const tokenMatch = redirect_url.match(/access_token=([^&]*)/);
          if (tokenMatch && tokenMatch[1]) {
              const token = tokenMatch[1];
              console.log('Extracted Token:', token);
              chrome.storage.local.set({ twitch_token: token }, () => {
                  console.log('Token stored successfully');
              });
          } else {
              console.error('Token not found in redirect URL');
          }
      }
  );
});

