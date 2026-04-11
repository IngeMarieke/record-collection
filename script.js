// Global state
let allAlbums = [];
let currentSortOrder = 'alphabetical';
let currentSortBy = 'artist';

// DOM elements
const albumList = document.getElementById('album-list');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const sortOrderSelect = document.getElementById('sort-order');
const sortBySelect = document.getElementById('sort-by');

// Event listeners
sortOrderSelect.addEventListener('change', (e) => {
    currentSortOrder = e.target.value;
    renderAlbums();
});

sortBySelect.addEventListener('change', (e) => {
    currentSortBy = e.target.value;
    renderAlbums();
});

// Initialize the app
async function init() {
    try {
        loadingDiv.style.display = 'block';
        errorDiv.className = 'error';
        
        const response = await fetch('data/collection.json');
        if (!response.ok) throw new Error('Failed to load collection');
        
        allAlbums = await response.json();
        
        if (!Array.isArray(allAlbums) || allAlbums.length === 0) {
            throw new Error('No albums found in collection');
        }
        
        loadingDiv.style.display = 'none';
        renderAlbums();
    } catch (error) {
        console.error('Error loading collection:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.classList.add('active');
    }
}

// Sort albums based on current state
function sortAlbums(albums) {
    const sorted = [...albums];
    
    if (currentSortOrder === 'alphabetical') {
        sorted.sort((a, b) => {
            const aValue = currentSortBy === 'artist' ? a.artist : a.title;
            const bValue = currentSortBy === 'artist' ? b.artist : b.title;
            return aValue.localeCompare(bValue, undefined, { sensitivity: 'base' });
        });
    } else if (currentSortOrder === 'random') {
        // Fisher-Yates shuffle
        for (let i = sorted.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
        }
    }
    
    return sorted;
}

// Render albums to the DOM
function renderAlbums() {
    albumList.innerHTML = '';
    const sorted = sortAlbums(allAlbums);
    
    sorted.forEach((album) => {
        const albumCard = createAlbumCard(album);
        albumList.appendChild(albumCard);
    });
}

// Create an album card element
function createAlbumCard(album) {
    const card = document.createElement('div');
    card.className = 'album-card';
    
    // Album cover
    const cover = document.createElement('div');
    cover.className = 'album-cover';
    if (album.cover) {
        const img = document.createElement('img');
        img.src = album.cover;
        img.alt = `${album.title} cover`;
        img.onerror = () => {
            img.style.display = 'none';
            cover.innerHTML = '<div class="album-cover-placeholder">🎵</div>';
        };
        cover.appendChild(img);
    } else {
        cover.innerHTML = '<div class="album-cover-placeholder">🎵</div>';
    }
    
    // Album info
    const info = document.createElement('div');
    info.className = 'album-info';
    info.innerHTML = `
        <div class="album-title">${escapeHtml(album.title)}</div>
        <div class="album-artist">${escapeHtml(album.artist)}</div>
        <div class="album-details">${album.tracks ? album.tracks.length + ' tracks' : 'Track list unavailable'}</div>
    `;
    
    // Track list container
    const trackListContainer = document.createElement('div');
    trackListContainer.className = 'track-list';
    
    if (album.tracks && album.tracks.length > 0) {
        const trackListTitle = document.createElement('h3');
        trackListTitle.textContent = 'Track List';
        trackListContainer.appendChild(trackListTitle);
        
        const trackList = document.createElement('div');
        album.tracks.forEach((track, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            trackItem.innerHTML = `
                <span class="track-number">${index + 1}.</span>
                <span class="track-name">${escapeHtml(track.name)}</span>
                <span class="track-duration">${track.duration || '--:--'}</span>
            `;
            trackList.appendChild(trackItem);
        });
        trackListContainer.appendChild(trackList);
    }
    
    // Add click handler to toggle track list
    const clickableArea = document.createElement('div');
    clickableArea.style.cursor = 'pointer';
    clickableArea.appendChild(cover);
    clickableArea.appendChild(info);
    
    clickableArea.addEventListener('click', () => {
        trackListContainer.classList.toggle('active');
    });
    
    card.appendChild(clickableArea);
    card.appendChild(trackListContainer);
    
    return card;
}

// Utility function to escape HTML special characters
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
