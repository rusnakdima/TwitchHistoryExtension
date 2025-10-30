document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get({ history: {} }, (result) => {
    const history = result.history;
    const container = document.getElementById("history");

    if (Object.keys(history).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="empty-title">No history yet</p>
          <p class="empty-subtitle">Visit some Twitch channels to see them here</p>
        </div>
      `;
      return;
    }

    const sortedChannels = Object.keys(history).sort((a, b) => {
      const latestA = Math.max(...history[a]);
      const latestB = Math.max(...history[b]);
      return latestB - latestA;
    });

    sortedChannels.forEach((channel) => {
      const visitCount = history[channel].length;
      const latestVisit = Math.max(...history[channel]);
      const timeAgo = getTimeAgo(latestVisit);

      const card = document.createElement("div");
      card.className = "channel-card";

      card.innerHTML = `
        <div class="card-header">
          <div class="card-main">
            <div class="avatar">${channel[0].toUpperCase()}</div>
            <div class="channel-info">
              <h3 class="channel-name">${channel}</h3>
              <p class="time-ago">${timeAgo}</p>
            </div>
          </div>
          <span class="badge">${visitCount}</span>
        </div>
        
        <div class="visits-list">
          ${history[channel]
            .sort((a, b) => b - a)
            .slice(0, 5)
            .map((ts) => {
              const date = new Date(ts);
              return `
                <div class="visit-item">
                  <svg class="clock-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                  </svg>
                  <span>${formatDateTime(date)}</span>
                </div>
              `;
            })
            .join("")}
        </div>
      `;

      card.addEventListener("click", () => {
        window.open(`https://twitch.tv/${channel}`, "_blank");
      });

      container.appendChild(card);
    });
  });
});

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";
  return Math.floor(seconds / 604800) + "w ago";
}

function formatDateTime(date) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    return (
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " at " +
      date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  }
}
