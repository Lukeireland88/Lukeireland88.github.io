

// Cache to store filtered song lists per drive
let cache = {};

document.addEventListener('DOMContentLoaded', function () {
  const songTable = document.getElementById('songTable');
  const loadingIndicator = document.getElementById('loading');
  const batchSize = 1000;
  let currentIndex = 0;
  let loading = false;
  let filteredSongs = songList['A'];
  let currentDrive = 'A';

function renderBatch(startIndex, endIndex) {
  const fragment = document.createDocumentFragment();
  const songsToRender = filteredSongs.slice(startIndex, endIndex);

  songsToRender.forEach(song => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${song.number}</td>
      <td>${song.name}</td>
      <td class="text-center">
        <button class="btn btn-success btn-sm" onclick="addToQueue('${song.number}', '${song.name.replace(/'/g, "\\'")}')">
          <i class="fas fa-plus"></i> <!-- Font Awesome + icon -->
        </button>
      </td>
    `;
    fragment.appendChild(row);
  });

  songTable.appendChild(fragment);
  loading = false;
  loadingIndicator.style.display = 'none';
}


  // Function to handle drive selection from the dropdown
  window.selectDrive = function (drive) {
    currentDrive = drive;
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
    renderBatch(currentIndex, currentIndex + batchSize);
    currentIndex += batchSize;
  };

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
        }, 500);
      }
    } else {
      loadingIndicator.style.display = 'none';
    }
  }

 window.searchSongs = function () {
  const input = document.getElementById('searchInput').value.trim().toLowerCase();
  const songTable = document.getElementById('songTable');
  songTable.innerHTML = ''; // Clear the table

  if (input.length === 1 && /^[a-z]$/.test(input)) {
    // Filter by first letter
    filteredSongs = songList[currentDrive].filter(song => song.name.toLowerCase().startsWith(input));
  } else {
    // General search
    filteredSongs = songList[currentDrive].filter(song => song.name.toLowerCase().includes(input));
  }

  currentIndex = 0;
  renderBatch(currentIndex, currentIndex + batchSize);
  currentIndex += batchSize;
};

  
  function searchSongs() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const table = document.getElementById('songTable');
    const rows = table.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        let songName = rows[i].getElementsByTagName('td')[1]; // Assuming 2nd column is song name
        if (songName) {
            let textValue = songName.textContent || songName.innerText;
            if (textValue.toLowerCase().indexOf(input) > -1) {
                rows[i].style.display = ""; // Show the row if it matches
            } else {
                rows[i].style.display = "none"; // Hide the row if it doesn't match
            }
        }
    }
}

let debounceTimeout;
function searchSongs() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const input = document.getElementById('searchInput').value.toLowerCase();
        const table = document.getElementById('songTable');
        const rows = table.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            let songName = rows[i].getElementsByTagName('td')[1];
            if (songName) {
                let textValue = songName.textContent || songName.innerText;
                if (textValue.toLowerCase().indexOf(input) > -1) {
                    rows[i].style.display = "";
                } else {
                    rows[i].style.display = "none";
                }
            }
        }
    }, 300); // 300ms delay to avoid excessive searches
}


  window.clearSearch = function () {
    document.getElementById("searchInput").value = '';
    filteredSongs = songList[currentDrive];
    currentIndex = 0;
    songTable.innerHTML = '';
    renderBatch(currentIndex, currentIndex + batchSize);
    currentIndex += batchSize;
  };

  window.handleKeydown = function (event) {
    if (event.key === 'Enter') {
      searchSongs();
    }
  };

  renderBatch(currentIndex, currentIndex + batchSize);
  currentIndex += batchSize;

  window.addEventListener('scroll', loadMoreSongs);
});

let queue = []; // Holds the list of queued songs

// Add a song to the queue
function addToQueue(number, name) {
  // Prevent duplicates
  if (queue.some(song => song.number === number)) {
    alert('This song is already in the queue!');
    return;
  }

  // Add the song to the queue
  queue.push({ number, name });
  renderQueue();
}

// Render the queue to the table
function renderQueue() {
  const queueTable = document.getElementById('queueTable').querySelector('tbody');
  queueTable.innerHTML = ''; // Clear the current queue

  queue.forEach((song, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${song.number}</td>
      <td>${song.name}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="removeFromQueue(${index})">Remove</button>
      </td>
    `;
    queueTable.appendChild(row);
  });

  // Save to localStorage
  localStorage.setItem('karaokeQueue', JSON.stringify(queue));
}


// Remove a song from the queue
function removeFromQueue(index) {
  queue.splice(index, 1); // Remove the song by index
  renderQueue();
}

// Load the queue from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedQueue = JSON.parse(localStorage.getItem('karaokeQueue'));
  if (savedQueue) {
    queue = savedQueue;
    renderQueue();
  }
});

function shareQueue(method) {
  const queue = JSON.parse(localStorage.getItem('karaokeQueue')) || [];
  if (queue.length === 0) {
    alert('Your queue is empty!');
    return;
  }

  // Include both song number and name in the shared list
  const queueText = queue.map((song, index) => `${index + 1}. [${song.number}] ${song.name}`).join('\n');

  if (method === 'whatsapp') {
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent('My Karaoke Queue:\n' + queueText)}`;
    window.open(whatsappLink, '_blank');
  } else if (method === 'email') {
    const emailLink = `mailto:?subject=My Karaoke Queue&body=${encodeURIComponent('My Karaoke Queue:\n' + queueText)}`;
    window.location.href = emailLink;
  }
}



function clearQueue() {
  queue = [];
  renderQueue();
}

document.getElementById('openQueueModal').addEventListener('click', () => {
  const queueModal = new bootstrap.Modal(document.getElementById('queueModal'));
  queueModal.show();
});
