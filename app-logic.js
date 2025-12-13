let cache = {};
let searchTimeout;

document.addEventListener('DOMContentLoaded', function () {
  const songTable = document.getElementById('songTable');
  const loadingIndicator = document.getElementById('loading');
  const searchInput = document.getElementById('searchInput');
  const resultCountEl = document.getElementById('resultCount');
  const batchSize = 1000;
  let currentIndex = 0;
  let loading = false;
  let filteredSongs = songList['A'];
  let currentDrive = 'A';
  let isSearchActive = false;

  window.selectDrive = function (drive) {
    currentDrive = drive;
    document.getElementById('driveName').textContent = drive === 'A' ? 'Memory Card' : 'Main DB';
    changeDrive();
  };

  window.changeDrive = function () {
    if (cache[currentDrive]) {
      filteredSongs = cache[currentDrive];
    } else {
      filteredSongs = songList[currentDrive];
      cache[currentDrive] = filteredSongs;
    }
    currentIndex = 0;
    songTable.innerHTML = '';
    resultCountEl.style.display = 'none';
    isSearchActive = false;
    renderBatch(currentIndex, currentIndex + batchSize);
    currentIndex += batchSize;
  };

  function renderBatch(startIndex, endIndex) {
    const fragment = document.createDocumentFragment();
    const songsToRender = filteredSongs.slice(startIndex, endIndex);

    songsToRender.forEach(song => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${song.number}</td>
        <td>${song.name}</td>
        <td class="text-center">
          <button class="btn btn-success btn-sm add-to-queue-btn" data-number="${song.number}" data-name="${song.name.replace(/"/g, '&quot;')}">
            <i class="fas fa-plus"></i>
          </button>
        </td>
      `;
      fragment.appendChild(row);
    });

    songTable.appendChild(fragment);
    loading = false;
    loadingIndicator.style.display = 'none';
  }

  function loadMoreSongs() {
    if (loading) return;
    const totalSongs = filteredSongs.length;

    if (currentIndex < totalSongs) {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
        loading = true;
        loadingIndicator.style.display = 'block';

        setTimeout(() => {
          const nextIndex = currentIndex + batchSize;
          if (nextIndex > totalSongs) {
            renderBatch(currentIndex, totalSongs);
          } else {
            renderBatch(currentIndex, nextIndex);
          }
          currentIndex = nextIndex;
        }, 300);
      }
    } else {
      loadingIndicator.style.display = 'none';
    }
  }

  function updateResultCount(count) {
    if (count === 0 && isSearchActive) {
      resultCountEl.innerHTML = '<i class="fas fa-search"></i> No songs found. Try a different search.';
      resultCountEl.style.display = 'block';
    } else if (isSearchActive) {
      resultCountEl.innerHTML = `<i class="fas fa-search"></i> Found ${count} song${count !== 1 ? 's' : ''}`;
      resultCountEl.style.display = 'block';
    } else {
      resultCountEl.style.display = 'none';
    }
  }

  window.searchSongs = function () {
    const input = searchInput.value.trim().toLowerCase();
    songTable.innerHTML = '';

    if (!input) {
      isSearchActive = false;
      resultCountEl.style.display = 'none';
      filteredSongs = songList[currentDrive];
    } else {
      isSearchActive = true;
      if (input.length === 1 && /^[a-z]$/.test(input)) {
        filteredSongs = songList[currentDrive].filter(song => song.name.toLowerCase().startsWith(input));
      } else {
        filteredSongs = songList[currentDrive].filter(song => song.name.toLowerCase().includes(input));
      }
      updateResultCount(filteredSongs.length);
    }

    currentIndex = 0;
    if (filteredSongs.length > 0) {
      renderBatch(currentIndex, Math.min(currentIndex + batchSize, filteredSongs.length));
      currentIndex += batchSize;
    }
  };

  window.clearSearch = function () {
    searchInput.value = '';
    isSearchActive = false;
    resultCountEl.style.display = 'none';
    filteredSongs = songList[currentDrive];
    currentIndex = 0;
    songTable.innerHTML = '';
    renderBatch(currentIndex, currentIndex + batchSize);
    currentIndex += batchSize;
  };

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchSongs, 200);
  });

  songTable.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-queue-btn');
    if (btn) {
      const number = btn.dataset.number;
      const name = btn.dataset.name;
      addToQueue(number, name);
    }
  });

  renderBatch(currentIndex, currentIndex + batchSize);
  currentIndex += batchSize;

  window.addEventListener('scroll', loadMoreSongs);
});

let queue = [];

function updateQueueBadge() {
  const badge = document.getElementById('queueBadge');
  if (queue.length > 0) {
    badge.textContent = queue.length;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function updateQueueStats() {
  const statsEl = document.getElementById('queueStats');
  if (statsEl) {
    statsEl.textContent = `Songs queued: ${queue.length}`;
  }
}

function addToQueue(number, name) {
  if (queue.some(song => song.number === number)) {
    showNotification('This song is already in the queue!', 'warning');
    return;
  }

  queue.push({ number, name });
  saveQueue();
  showNotification('Added to queue!', 'success');
}

function showNotification(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.maxWidth = '300px';
  alertDiv.style.zIndex = '2000';

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

function renderQueue() {
  const queueTable = document.getElementById('queueTable');
  const queueEmpty = document.getElementById('queueEmpty');
  const queueTableBody = queueTable.querySelector('tbody');

  if (queue.length === 0) {
    queueTable.style.display = 'none';
    queueEmpty.style.display = 'block';
  } else {
    queueTable.style.display = 'table';
    queueEmpty.style.display = 'none';

    queueTableBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    queue.forEach((song, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align: center; font-weight: 600; color: var(--text-secondary);">${index + 1}</td>
        <td><strong>${song.number}</strong> - ${song.name}</td>
        <td style="text-align: center;">
          <div class="queue-item-actions">
            <button class="btn btn-sm btn-outline-danger" onclick="removeFromQueue(${index})" title="Remove from queue">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      fragment.appendChild(row);
    });

    queueTableBody.appendChild(fragment);
  }

  updateQueueBadge();
  updateQueueStats();
  saveQueue();
}

function removeFromQueue(index) {
  const removedSong = queue[index];
  queue.splice(index, 1);
  renderQueue();
  showNotification(`Removed "${removedSong.name}" from queue`, 'info');
}

window.clearQueue = function() {
  if (queue.length === 0) return;
  if (confirm('Are you sure you want to clear the entire queue?')) {
    queue = [];
    renderQueue();
    showNotification('Queue cleared', 'info');
  }
};

function saveQueue() {
  localStorage.setItem('karaokeQueue', JSON.stringify(queue));
}

function loadQueue() {
  const savedQueue = JSON.parse(localStorage.getItem('karaokeQueue'));
  if (savedQueue && Array.isArray(savedQueue)) {
    queue = savedQueue;
    renderQueue();
  }
}

function shareQueue(method) {
  if (queue.length === 0) {
    showNotification('Your queue is empty!', 'warning');
    return;
  }

  const queueText = queue.map((song, index) => `${index + 1}. [${song.number}] ${song.name}`).join('\n');

  if (method === 'whatsapp') {
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent('My Karaoke Queue:\n\n' + queueText)}`;
    window.open(whatsappLink, '_blank');
  } else if (method === 'email') {
    const emailLink = `mailto:?subject=My Karaoke Queue&body=${encodeURIComponent('My Karaoke Queue:\n\n' + queueText)}`;
    window.location.href = emailLink;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadQueue();

  document.getElementById('openQueueModal').addEventListener('click', () => {
    const queueModal = new bootstrap.Modal(document.getElementById('queueModal'));
    queueModal.show();
  });
});
