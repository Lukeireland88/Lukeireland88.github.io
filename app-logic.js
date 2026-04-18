// Cached merged pools: keys "A", "B", "AB" (sorted by song number)
const poolCache = {};
let queue = [];

/** Lowercase, drop spaces & punctuation so "simplyred" matches "Simply Red - ….mp3" */
function normalizeForSearch(s) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

document.addEventListener('DOMContentLoaded', function () {
  const songTable = document.getElementById('songTable');
  const loadingIndicator = document.getElementById('loading');
  const searchInput = document.getElementById('searchInput');
  const driveFilterA = document.getElementById('driveFilterA');
  const driveFilterB = document.getElementById('driveFilterB');
  const libraryMenuSummary = document.getElementById('libraryMenuSummary');
  const batchSize = 1000;
  let currentIndex = 0;
  let loading = false;
  let filteredSongs = [];
  let searchDebounceTimer = null;

  function setSongTableBusy(busy) {
    songTable.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  /**
   * Merges selected libraries (numbers are unique across A/B), sorted by song number.
   * Empty array when neither library is checked.
   */
  function getSongPool() {
    const useA = driveFilterA.checked;
    const useB = driveFilterB.checked;
    if (!useA && !useB) {
      return [];
    }
    const key = `${useA ? 'A' : ''}${useB ? 'B' : ''}`;
    if (poolCache[key]) {
      return poolCache[key];
    }
    const parts = [];
    if (useA) parts.push(...songList['A']);
    if (useB) parts.push(...songList['B']);
    parts.sort((x, y) =>
      String(x.number).localeCompare(String(y.number), undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    );
    poolCache[key] = parts;
    return parts;
  }

  function updateLibrarySummary() {
    if (!libraryMenuSummary) return;
    const useA = driveFilterA.checked;
    const useB = driveFilterB.checked;
    if (useA && !useB) {
      libraryMenuSummary.textContent = 'Memory card';
    } else if (!useA && useB) {
      libraryMenuSummary.textContent = 'Main database';
    } else if (useA && useB) {
      libraryMenuSummary.textContent = 'Both libraries';
    } else {
      libraryMenuSummary.textContent = 'None selected';
    }
  }

  function renderBatch(startIndex, endIndex) {
    setSongTableBusy(true);
    const fragment = document.createDocumentFragment();
    const songsToRender = filteredSongs.slice(startIndex, endIndex);

    songsToRender.forEach((song) => {
      const card = document.createElement('div');
      card.className = 'song-card';

      const num = document.createElement('div');
      num.className = 'song-number';
      num.textContent = song.number;

      const nameEl = document.createElement('div');
      nameEl.className = 'song-name';
      nameEl.textContent = song.name;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-add';
      btn.setAttribute('aria-label', `Add ${song.name} to your list`);
      btn.dataset.number = song.number;
      btn.dataset.name = song.name;
      const icon = document.createElement('i');
      icon.className = 'fas fa-plus';
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);

      card.appendChild(num);
      card.appendChild(nameEl);
      card.appendChild(btn);
      fragment.appendChild(card);
    });

    songTable.appendChild(fragment);
    loading = false;
    loadingIndicator.hidden = true;
    setSongTableBusy(false);
  }

  function loadMoreSongs() {
    if (loading) return;
    const totalSongs = filteredSongs.length;

    if (currentIndex < totalSongs) {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        loading = true;
        loadingIndicator.hidden = false;

        window.setTimeout(() => {
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
      loadingIndicator.hidden = true;
    }
  }

  window.searchSongs = function () {
    const raw = searchInput.value.trim();
    const lower = raw.toLowerCase();
    const pool = getSongPool();
    songTable.innerHTML = '';
    updateLibrarySummary();

    if (pool.length === 0) {
      filteredSongs = [];
      currentIndex = 0;
      loadingIndicator.hidden = true;
      const empty = document.createElement('div');
      empty.className = 'empty-libraries';
      empty.textContent =
        'No library selected. Open the libraries menu and choose Memory card, Main database, or both.';
      songTable.appendChild(empty);
      setSongTableBusy(false);
      return;
    }

    if (lower.length === 0) {
      filteredSongs = pool;
    } else if (lower.length === 1 && /^[a-z]$/.test(lower)) {
      filteredSongs = pool.filter((song) => song.name.toLowerCase().startsWith(lower));
    } else {
      const qNorm = normalizeForSearch(raw);
      if (qNorm.length === 0) {
        filteredSongs = pool;
      } else {
        filteredSongs = pool.filter((song) =>
          normalizeForSearch(song.name).includes(qNorm)
        );
      }
    }

    currentIndex = 0;
    renderBatch(currentIndex, currentIndex + batchSize);
    currentIndex += batchSize;
  };

  songTable.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add');
    if (!btn || !songTable.contains(btn)) return;
    const number = btn.dataset.number;
    const name = btn.dataset.name;
    if (number != null && name != null) {
      addToQueueWithAnimation(e, number, name);
    }
  });

  searchInput.addEventListener('input', () => {
    window.clearTimeout(searchDebounceTimer);
    searchDebounceTimer = window.setTimeout(() => searchSongs(), 200);
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      window.clearTimeout(searchDebounceTimer);
      searchSongs();
    }
  });

  document.getElementById('searchBtn').addEventListener('click', () => searchSongs());

  driveFilterA.addEventListener('change', () => searchSongs());
  driveFilterB.addEventListener('change', () => searchSongs());

  document.querySelectorAll('[data-share]').forEach((el) => {
    el.addEventListener('click', () => {
      const method = el.getAttribute('data-share');
      if (method) shareQueue(method);
    });
  });

  document.getElementById('clearQueueBtn').addEventListener('click', () => {
    clearQueue();
  });

  const queueModalEl = document.getElementById('queueModal');
  const openQueueBtn = document.getElementById('openQueueModal');

  /* Avoid focused controls staying inside the dialog when it gains aria-hidden (Bootstrap hide timing). */
  if (queueModalEl) {
    queueModalEl.addEventListener('hide.bs.modal', () => {
      const ae = document.activeElement;
      if (ae && queueModalEl.contains(ae) && typeof ae.blur === 'function') {
        ae.blur();
      }
    });
  }

  openQueueBtn.addEventListener('click', () => {
    if (queueModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(queueModalEl).show();
    }
  });

  try {
    const raw = localStorage.getItem('karaokeQueue');
    if (raw) {
      const savedQueue = JSON.parse(raw);
      if (Array.isArray(savedQueue)) {
        queue = savedQueue;
        renderQueue();
      }
    }
  } catch (_) {
    queue = [];
  }

  searchSongs();

  window.addEventListener('scroll', loadMoreSongs, { passive: true });
});

if ('serviceWorker' in navigator) {
  const hadControllerAtPageLoad = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadControllerAtPageLoad) {
      window.location.reload();
    }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update();
      })
      .catch(() => {});
  });
}

function addToQueueWithAnimation(event, number, name) {
  const button = event.target.closest('.btn-add');
  if (!button) return;

  button.classList.add('added');
  window.setTimeout(() => {
    button.classList.remove('added');
  }, 400);

  addToQueue(number, name);
}

function addToQueue(number, name) {
  if (queue.some((song) => song.number === number)) {
    showToast('This song is already in your list.', 'warning');
    return;
  }

  queue.push({ number, name });
  renderQueue();
  showToast('Song added to your list.', 'success');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  toastMessage.textContent = message;
  toast.classList.remove('toast--warning', 'toast--success');

  if (type === 'warning') {
    toast.classList.add('toast--warning');
  } else {
    toast.classList.add('toast--success');
  }

  toast.classList.add('show');

  window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function renderQueue() {
  const queueContainer = document.getElementById('queueTable');
  queueContainer.innerHTML = '';

  if (queue.length === 0) {
    queueContainer.innerHTML =
      '<div class="empty-queue">Your list is empty. Add songs from the list.</div>';
    return;
  }

  queue.forEach((song, index) => {
    const card = document.createElement('div');
    card.className = 'queue-card';

    const num = document.createElement('div');
    num.className = 'queue-number';
    num.textContent = song.number;

    const nameEl = document.createElement('div');
    nameEl.className = 'queue-name';
    nameEl.textContent = song.name;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-remove';
    btn.setAttribute('aria-label', `Remove ${song.name}`);
    btn.dataset.index = String(index);
    const icon = document.createElement('i');
    icon.className = 'fas fa-times';
    icon.setAttribute('aria-hidden', 'true');
    btn.appendChild(icon);

    card.appendChild(num);
    card.appendChild(nameEl);
    card.appendChild(btn);
    queueContainer.appendChild(card);
  });

  queueContainer.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.index, 10);
      if (!Number.isNaN(i)) removeFromQueue(i);
    });
  });

  try {
    localStorage.setItem('karaokeQueue', JSON.stringify(queue));
  } catch (_) {
    /* ignore quota / private mode */
  }
}

function removeFromQueue(index) {
  queue.splice(index, 1);
  renderQueue();
}

function clearQueue() {
  queue = [];
  try {
    localStorage.removeItem('karaokeQueue');
  } catch (_) {
    /* ignore */
  }
  renderQueue();
  showToast('List cleared.', 'success');
}

function shareQueue(method) {
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem('karaokeQueue')) || [];
    } catch (_) {
      return [];
    }
  })();
  const list = stored.length ? stored : queue;

  if (list.length === 0) {
    window.alert('Your list is empty.');
    return;
  }

  const queueText = list
    .map((song, index) => `${index + 1}. [${song.number}] ${song.name}`)
    .join('\n');

  if (method === 'whatsapp') {
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent('My karaoke list:\n' + queueText)}`;
    window.open(whatsappLink, '_blank', 'noopener,noreferrer');
  } else if (method === 'email') {
    const emailLink = `mailto:?subject=${encodeURIComponent('My karaoke list')}&body=${encodeURIComponent('My karaoke list:\n' + queueText)}`;
    window.location.href = emailLink;
  }
}
