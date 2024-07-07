chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
  });
  
  chrome.action.onClicked.addListener((tab) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: `https://id.twitch.tv/oauth2/authorize?client_id=YOUR_TWITCH_CLIENT_ID&redirect_uri=https://YOUR_EXTENSION_ID.chromiumapp.org&response_type=token&scope=user:read:follows`,
        interactive: true
      },
      (redirect_url) => {
        if (chrome.runtime.lastError || redirect_url.includes('error')) {
          console.error(chrome.runtime.lastError);
          return;
        }
        const token = redirect_url.split('access_token=')[1].split('&')[0];
        chrome.storage.local.set({ twitch_token: token });
      }
    );
  });
  