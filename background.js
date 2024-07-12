console.log('Service worker starting...');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});



