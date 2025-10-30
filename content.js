(function () {
  const urlParts = window.location.pathname.split("/");
  const channel = urlParts[1];

  if (channel) {
    const timestamp = Date.now();

    chrome.storage.local.get({ history: {} }, (result) => {
      const history = result.history;
      if (!history[channel]) {
        history[channel] = [];
      }
      history[channel].push(timestamp);

      if (history[channel].length > 50) {
        history[channel] = history[channel].slice(-50);
      }

      chrome.storage.local.set({ history: history });
    });
  }
})();
