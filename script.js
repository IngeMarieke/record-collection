// Global state
let allAlbums = [];
let currentIndex = 0;
let currentSortOrder = 'alphabetical';
let currentSortBy = 'artist';
let scrollTimeout = null;
let lastScrollY = 0;
const SCROLL_SENSITIVITY = 100; // pixels needed to scroll to next album

// DOM elements
const vinylCard = document.getElementById('vinyl-card');
const albumCover = document.getElementById('album-cover');
const albumTitleBack = document.getElementById('album-title-back');
const albumArtistBack = document.getElementById('album-artist-back');
const tracksContainer = document.getElementById('tracks-container');
const albumCounter = document.getElementById('album-counter');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const sortOrderSelect = document.getElementById('sort-order');
const sortBySelect = document.getElementById('sort-by');
const controlsToggle = document.getElementById('controls-toggle');
const sortMenu = document.getElementById('sort-menu');
const closeMenuBtn = document.getElementById('close-menu');

// Event listeners
sortOrderSelect.addEventListener('change', (e) => {
    currentSortOrder = e.target.value;
    resortAndReset();
});

sortBySelect.addEventListener('change', (e) => {
    currentSortBy = e.target.value;
    resortAndReset();
});

vinylCard.addEventListener('click', toggleFlip);
controlsToggle.addEventListener('click', () => sortMenu.classList.add('open'));
closeMenuBtn.addEventListener('click', () => sortMenu.classList.remove('open'));

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-menu') && !e.target.closest('.controls-toggle')) {
        sortMenu.classList.remove('open');
    }
});

// Scroll handling with throttling
window.addEventListener('scroll', handleScroll, { passive: true });

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
        resortAndReset();
    } catch (error) {
        console.error('Error loading collection:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.classList.add('active');
    }
}

// Sort albums and reset to first
function resortAndReset() {
    allAlbums = sortAlbums(allAlbums);
    currentIndex = 0;
    vinylCard.classList.remove('flipped');
    displayAlbum();
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

// Display album at current index
function displayAlbum() {
    if (allAlbums.length === 0) return;
    
    const album = allAlbums[currentIndex];
    
    // Update cover
    albumCover.innerHTML = '';
    if (album.cover) {
        const img = document.createElement('img');
        img.src = album.cover;
        img.alt = `${album.title} cover`;
        img.onerror = () => {
            albumCover.innerHTML = '<div class="album-cover-placeholder">🎵</div>';
        };
        albumCover.appendChild(img);
    } else {
        albumCover.innerHTML = '<div class="album-cover-placeholder">🎵</div>';
    }
    
    // Update back side
    albumTitleBack.textContent = escapeHtml(album.title);
    albumArtistBack.textContent = escapeHtml(album.artist);
    
    // Update track list
    tracksContainer.innerHTML = '';
    if (album.tracks && album.tracks.length > 0) {
        album.tracks.forEach((track, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            trackItem.innerHTML = `
                <span class="track-number">${index + 1}.</span>
                <span class="track-name">${escapeHtml(track.name)}</span>
                <span class="track-duration">${track.duration || '--:--'}</span>
            `;
            tracksContainer.appendChild(trackItem);
        });
    } else {
        tracksContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No track information available</p>';
    }
    
    // Update counter
    albumCounter.textContent = `${currentIndex + 1} of ${allAlbums.length}`;
}

// Toggle flip animation
function toggleFlip(e) {
    // Don't flip if clicking on scrollbar or outside the card
    vinylCard.classList.toggle('flipped');
}

// Handle scroll to navigate albums
function handleScroll() {
    if (allAlbums.length <= 1) return;
    
    clearTimeout(scrollTimeout);
    
    const scrollDelta = window.scrollY - lastScrollY;
    
    // Scroll down - next album
    if (scrollDelta > SCROLL_SENSITIVITY) {
        if (currentIndex < allAlbums.length - 1) {
            currentIndex++;
            vinylCard.classList.remove('flipped');
            displayAlbum();
        }
        lastScrollY = window.scrollY;
    }
    // Scroll up - previous album
    else if (scrollDelta < -SCROLL_SENSITIVITY) {
        if (currentIndex > 0) {
            currentIndex--;
            vinylCard.classList.remove('flipped');
            displayAlbum();
        }
        lastScrollY = window.scrollY;
    }
    
    // Reset scroll tracking after a timeout
    scrollTimeout = setTimeout(() => {
        lastScrollY = window.scrollY;
    }, 500);
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
