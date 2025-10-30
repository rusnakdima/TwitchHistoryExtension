(function () {
  "use strict";

  const VIEW_HISTORY_KEY = "history";

  function logViewed(channel) {
    if (!channel) return;

    chrome.storage.local.get([VIEW_HISTORY_KEY], (result) => {
      const history = result[VIEW_HISTORY_KEY] || {};

      if (!history[channel]) {
        history[channel] = [];
      }

      const now = Date.now();
      const lastTimestamp = history[channel][history[channel].length - 1];

      if (!lastTimestamp || now - lastTimestamp > 60000) {
        history[channel].push(now);

        if (history[channel].length > 100) {
          history[channel] = history[channel].slice(-100);
        }

        chrome.storage.local.set({ [VIEW_HISTORY_KEY]: history });
        console.log(`[Twitch History] Logged view for: ${channel}`);
      }
    });
  }

  function getCurrentChannel() {
    const path = window.location.pathname;
    if (path.startsWith("/") && path.split("/").length === 2) {
      const potentialChannel = path.split("/")[1].toLowerCase();

      const excludedPages = [
        "directory",
        "videos",
        "downloads",
        "settings",
        "subscriptions",
        "inventory",
        "drops",
        "following",
        "search",
        "moderator",
        "dashboard",
        "team",
        "event",
        "prime",
        "turbo",
      ];

      if (potentialChannel && !excludedPages.includes(potentialChannel)) {
        const mainContent = document.querySelector("main");
        if (mainContent) {
          return potentialChannel;
        }
      }
    }

    const channelElement = document.querySelector(
      ".persistent-player .channel-info a, .metadata-layout__support a, [data-a-target='stream-title']"
    );
    if (channelElement && channelElement.textContent) {
      return channelElement.textContent.trim().toLowerCase();
    }

    const iframe = document.querySelector('iframe[src*="player.twitch.tv"]');
    if (iframe && iframe.src) {
      try {
        const url = new URL(iframe.src);
        const channel = url.searchParams.get("channel");
        if (channel) return channel.toLowerCase();
      } catch (e) {
        console.error("[Twitch History] Error parsing iframe URL:", e);
      }
    }

    return null;
  }

  function getChannelFromIframe(iframe) {
    if (iframe && iframe.src) {
      try {
        const url = new URL(iframe.src);
        const channel = url.searchParams.get("channel");
        if (channel) return channel.toLowerCase();
      } catch (e) {
        console.error("[Twitch History] Error parsing preview iframe:", e);
      }
    }
    return null;
  }

  const urlParts = window.location.pathname.split("/");
  const pageChannel = urlParts[1];
  if (pageChannel && pageChannel.match(/^[a-zA-Z0-9_]+$/)) {
    const excludedPages = [
      "directory",
      "videos",
      "downloads",
      "settings",
      "subscriptions",
      "inventory",
      "drops",
      "following",
      "search",
      "moderator",
      "dashboard",
      "team",
      "event",
      "prime",
      "turbo",
    ];

    if (!excludedPages.includes(pageChannel.toLowerCase())) {
      setTimeout(() => {
        const currentChan = getCurrentChannel();
        if (currentChan) {
          logViewed(currentChan);
        }
      }, 2000);
    }
  }

  document.addEventListener(
    "play",
    (e) => {
      if (e.target.tagName === "VIDEO") {
        setTimeout(() => {
          const channel = getCurrentChannel();
          logViewed(channel);
        }, 1000);
      }
    },
    true
  );

  setTimeout(() => {
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      if (!video.paused) {
        const channel = getCurrentChannel();
        logViewed(channel);
      }
    });
  }, 3000);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.id === "twitch-preview-container") {
            const checkPreview = setInterval(() => {
              if (node.style.display === "block") {
                const iframe = node.querySelector("iframe");
                const channel = getChannelFromIframe(iframe);
                if (channel) {
                  setTimeout(() => {
                    if (node.style.display === "block") {
                      logViewed(channel);
                      clearInterval(checkPreview);
                    }
                  }, 3000);
                }
              } else {
                clearInterval(checkPreview);
              }
            }, 500);
          }
        });
      }

      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "style"
      ) {
        const target = mutation.target;
        if (
          target.id === "twitch-preview-container" &&
          target.style.display === "block"
        ) {
          const iframe = target.querySelector("iframe");
          const channel = getChannelFromIframe(iframe);
          if (channel) {
            setTimeout(() => {
              if (target.style.display === "block") {
                logViewed(channel);
              }
            }, 3000);
          }
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
  });

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;

      setTimeout(() => {
        const channel = getCurrentChannel();
        if (channel) {
          logViewed(channel);
        }
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });

  console.log("[Twitch History] Content script loaded");
})();
