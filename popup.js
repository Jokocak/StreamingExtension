document.getElementById('loginButton').addEventListener('click', function() {
  chrome.identity.launchWebAuthFlow({
    'url': `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=aitzxubiftictbsri53s7fe77klatu&redirect_uri=https://hhihnnhihneiplcdlmmeejmaafcappig.chromiumapp.org&scope=user:read:follows`,
    'interactive': true
  }, function(redirect_url) {
    console.log('Redirect URL:', redirect_url);
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    } else if (redirect_url) {
      try {
        const url = new URL(redirect_url);
        const token = url.hash.match(/access_token=([^&]*)/)[1];
        console.log('Access Token:', token);
        // You can now use the token to make API calls to Twitch
      } catch (error) {
        console.error('Failed to extract access token:', error);
      }
    }
  });
});
