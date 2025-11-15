document.addEventListener("DOMContentLoaded", function () {
  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let currentSearchQuery = ''; // Keep track of the current search query

  // Initialize search bar
  function initSearchBar() {
    const container = document.getElementById("history");
    const existingSearch = document.querySelector('.search-container');
    if (existingSearch) {
      existingSearch.remove();
    }

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
      <div class="search-box">
        <input type="text" id="search-input" placeholder="Search channels..." value="${currentSearchQuery}">
        <button id="search-clear" class="search-clear-btn">✕</button>
      </div>
    `;
    container.prepend(searchContainer); // Add to the beginning of the container

    // Add event listeners for search functionality
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');

    if (searchInput) {
      searchInput.value = currentSearchQuery;
      searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        currentPage = 1; // Reset to first page

        // Store the input reference for focus restoration
        const inputRef = e.target;

        renderHistoryList(currentSearchQuery, currentPage);

        // Restore focus to the search input after rendering
        setTimeout(() => {
          const currentInput = document.getElementById('search-input');
          if (currentInput) {
            currentInput.focus();
            // Set cursor to the end of the text
            currentInput.setSelectionRange(currentInput.value.length, currentInput.value.length);
          }
        }, 0);
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          currentSearchQuery = e.target.value;
          currentPage = 1; // Reset to first page
          renderHistoryList(currentSearchQuery, currentPage);
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.value = '';
          currentSearchQuery = '';
          currentPage = 1; // Reset to first page
          renderHistoryList(currentSearchQuery, currentPage);

          // Restore focus to the search input after clearing
          setTimeout(() => {
            const currentInput = document.getElementById('search-input');
            if (currentInput) {
              currentInput.focus();
            }
          }, 0);
        }
      });
    }
  }

  function renderHistoryList(searchQuery = '', page = 1) {
    chrome.storage.local.get({ history: {} }, (result) => {
      const history = result.history;
      const container = document.getElementById("history");

      // Keep search bar in place by temporarily storing it
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer) {
        searchContainer.remove();
      }

      // Clear list content but keep search bar
      const paginationElements = container.querySelectorAll('.pagination-container');
      paginationElements.forEach(el => el.remove());

      const channelCards = container.querySelectorAll('.channel-card');
      channelCards.forEach(card => card.remove());

      const noResults = container.querySelector('.no-results');
      if (noResults) {
        noResults.remove();
      }

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

      // Filter channels based on search query if provided
      let filteredChannels = sortedChannels;
      if (searchQuery) {
        filteredChannels = sortedChannels.filter(channel =>
          channel.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Calculate pagination
      const totalPages = Math.ceil(filteredChannels.length / ITEMS_PER_PAGE);
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const channelsToDisplay = filteredChannels.slice(startIndex, endIndex);

      // Add pagination controls at the top if there are multiple pages
      if (totalPages > 1) {
        const topPagination = createPaginationControls(page, totalPages, searchQuery);
        container.insertBefore(topPagination, container.firstChild);
      }

      // Render channel cards for current page
      channelsToDisplay.forEach((channel) => {
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
              .slice(0, 3) // Show only last 3 visits
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

        // Only the channel name/text should open the Twitch channel page
        const channelNameElement = card.querySelector('.channel-name');
        if (channelNameElement) {
          channelNameElement.style.cursor = 'pointer';
          channelNameElement.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling to parent card
            window.open(`https://twitch.tv/${channel}`, '_blank');
          });
        }

        // Show full history in an overlay when clicking on the card (except username)
        card.addEventListener('click', (e) => {
          // If click was not on the channel name, show full history in an overlay
          if (e.target !== channelNameElement && !channelNameElement.contains(e.target)) {
            // Create overlay element
            const overlay = document.createElement('div');
            overlay.className = 'history-overlay';
            overlay.id = `history-overlay-${channel}`;

            // Get full history
            const fullHistory = history[channel].sort((a, b) => b - a);

            // Create visit items HTML for the full history
            const fullHistoryHtml = fullHistory.map((ts) => {
              const date = new Date(ts);
              return `
                <div class="visit-item-full">
                  <svg class="clock-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 00-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                  </svg>
                  <span>${formatDateTime(date)}</span>
                </div>
              `;
            }).join("");

            overlay.innerHTML = `
              <div class="history-modal">
                <div class="modal-header">
                  <div class="modal-title">${channel} - Full History</div>
                  <button class="close-btn">&times;</button>
                </div>
                <div class="modal-content">
                  ${fullHistoryHtml}
                </div>
              </div>
            `;

            // Add overlay to the popup
            document.body.appendChild(overlay);

            // Add close functionality
            const closeBtn = overlay.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
              overlay.remove();
            });

            // Close when clicking on the overlay background
            overlay.addEventListener('click', (event) => {
              if (event.target === overlay) {
                overlay.remove();
              }
            });
          }
        });

        container.appendChild(card);
      });

      // Add "No results" message if search yields no results
      if (searchQuery && channelsToDisplay.length === 0) {
        const noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results';
        noResultsMessage.textContent = `No channels found for "${searchQuery}"`;
        container.appendChild(noResultsMessage);
      }

      // Add pagination controls at the bottom if there are multiple pages
      if (totalPages > 1) {
        const bottomPagination = createPaginationControls(page, totalPages, searchQuery);
        container.appendChild(bottomPagination);
      }

      // Re-add the search bar at the top
      if (searchContainer) {
        container.insertBefore(searchContainer, container.firstChild);
      }
    });
  }

  function renderHistoryPage(page = 1, searchQuery = '') {
    currentSearchQuery = searchQuery;
    currentPage = page;
    // Initialize the search bar if it doesn't exist
    if (!document.querySelector('.search-container')) {
      initSearchBar();
    }
    // Then render the list
    renderHistoryList(searchQuery, page);
  }

  // The search functionality is now handled in initSearchBar and renderHistoryList
  // This function is no longer needed

  function createPaginationControls(currentPage, totalPages, searchQuery = '') {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';

    let paginationHTML = '<div class="pagination">';

    // Previous button with icon
    if (currentPage > 1) {
      paginationHTML += `<button class="pagination-btn prev-btn" data-page="${currentPage - 1}" data-search="${searchQuery}"><i class="material-icons">chevron_left</i></button>`;
    } else {
      paginationHTML += `<button class="pagination-btn prev-btn disabled" disabled data-search="${searchQuery}"><i class="material-icons">chevron_left</i></button>`;
    }

    // Page numbers with smart ellipsis - showing limited pages as per requirements
    if (totalPages <= 4) {
      // If 4 or fewer pages, show all pages
      for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
          paginationHTML += `<button class="pagination-btn active" data-page="${i}" data-search="${searchQuery}">${i}</button>`;
        } else {
          paginationHTML += `<button class="pagination-btn" data-page="${i}" data-search="${searchQuery}">${i}</button>`;
        }
      }
    } else {
      // Show first page
      paginationHTML += currentPage === 1 ?
        `<button class="pagination-btn active" data-page="1" data-search="${searchQuery}">1</button>` :
        `<button class="pagination-btn" data-page="1" data-search="${searchQuery}">1</button>`;

      if (currentPage === 1 || currentPage === 2) {
        // If on page 1 or 2, show 1, 2, 3, then ...
        if (totalPages > 3) {
          paginationHTML += currentPage === 2 ?
            `<button class="pagination-btn active" data-page="2" data-search="${searchQuery}">2</button>` :
            `<button class="pagination-btn" data-page="2" data-search="${searchQuery}">2</button>`;
        }
        if (totalPages > 4) {
          paginationHTML += currentPage === 3 ?
            `<button class="pagination-btn active" data-page="3" data-search="${searchQuery}">3</button>` :
            `<button class="pagination-btn" data-page="3" data-search="${searchQuery}">3</button>`;
        }
        if (totalPages > 4) {
          paginationHTML += '<span class="pagination-ellipsis">...</span>';
          paginationHTML += `<button class="pagination-btn" data-page="${totalPages}" data-search="${searchQuery}">${totalPages}</button>`;
        } else {
          // If only 4 pages total
          paginationHTML += `<button class="pagination-btn" data-page="${totalPages}" data-search="${searchQuery}">${totalPages}</button>`;
        }
      } else if (currentPage === totalPages || currentPage === totalPages - 1) {
        // If on penultimate or last page, show 1, ..., then the last few
        if (totalPages > 4) {
          paginationHTML += '<span class="pagination-ellipsis">...</span>';
        }
        if (totalPages > 3 && currentPage !== totalPages - 1) {
          paginationHTML += `<button class="pagination-btn" data-page="${totalPages - 2}" data-search="${searchQuery}">${totalPages - 2}</button>`;
        }
        if (totalPages > 2) {
          paginationHTML += currentPage === totalPages - 1 ?
            `<button class="pagination-btn active" data-page="${totalPages - 1}" data-search="${searchQuery}">${totalPages - 1}</button>` :
            `<button class="pagination-btn" data-page="${totalPages - 1}" data-search="${searchQuery}">${totalPages - 1}</button>`;
        }
        paginationHTML += currentPage === totalPages ?
          `<button class="pagination-btn active" data-page="${totalPages}" data-search="${searchQuery}">${totalPages}</button>` :
          `<button class="pagination-btn" data-page="${totalPages}" data-search="${searchQuery}">${totalPages}</button>`;
      } else {
        // If current page is somewhere in the middle
        paginationHTML += '<span class="pagination-ellipsis">...</span>';
        paginationHTML += `<button class="pagination-btn active" data-page="${currentPage}" data-search="${searchQuery}">${currentPage}</button>`;
        paginationHTML += '<span class="pagination-ellipsis">...</span>';
        paginationHTML += `<button class="pagination-btn" data-page="${totalPages}" data-search="${searchQuery}">${totalPages}</button>`;
      }
    }

    // Next button with icon
    if (currentPage < totalPages) {
      paginationHTML += `<button class="pagination-btn next-btn" data-page="${currentPage + 1}" data-search="${searchQuery}"><i class="material-icons">chevron_right</i></button>`;
    } else {
      paginationHTML += `<button class="pagination-btn next-btn disabled" disabled data-search="${searchQuery}"><i class="material-icons">chevron_right</i></button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    paginationContainer.querySelectorAll('.pagination-btn:not(.disabled)').forEach(button => {
      button.addEventListener('click', (e) => {
        // Get the button element regardless of whether the click was on the icon or button itself
        let targetButton = e.target;
        if (!targetButton.classList.contains('pagination-btn')) {
          targetButton = e.target.closest('.pagination-btn');
        }

        if (targetButton) {
          const page = parseInt(targetButton.getAttribute('data-page'));
          const searchQuery = targetButton.getAttribute('data-search') || '';
          if (!isNaN(page)) {
            renderHistoryList(searchQuery, page);
          }
        }
      });
    });

    return paginationContainer;
  }

  // Initial render
  renderHistoryPage(currentPage, currentSearchQuery);
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