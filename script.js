// Global state
let allAlbums = [];

// DOM elements
const grid = document.getElementById('album-grid');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');

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
        renderGrid();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading collection:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.classList.add('active');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal close handlers
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
}

// Render the grid of album cards
function renderGrid() {
    grid.innerHTML = '';
    
    // Create a card for each album
    allAlbums.forEach((album) => {
        const albumCard = createAlbumCard(album);
        grid.appendChild(albumCard);
    });
}

// Create an album card element
function createAlbumCard(album) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'album-card';
    
    if (album.cover) {
        const img = document.createElement('img');
        img.src = album.cover;
        img.alt = `${album.title} cover`;
        img.onerror = () => {
            cardDiv.classList.add('placeholder');
            cardDiv.innerHTML = '🎵';
        };
        cardDiv.appendChild(img);
    } else {
        cardDiv.classList.add('placeholder');
        cardDiv.innerHTML = '🎵';
    }
    
    // Add click handler to open modal
    cardDiv.addEventListener('click', () => {
        openModal(album);
    });
    
    return cardDiv;
}

// Open modal with album details
function openModal(album) {
    const modalTitle = document.getElementById('modal-title');
    const modalArtist = document.getElementById('modal-artist');
    const modalCoverImg = document.getElementById('modal-cover-img');
    const modalTracklist = document.getElementById('modal-tracklist');
    
    // Set album info (use textContent - no need to escape)
    modalTitle.textContent = album.title;
    modalArtist.textContent = album.artist;
    modalCoverImg.src = album.cover || '';
    modalCoverImg.onerror = () => {
        const cover = document.getElementById('modal-cover');
        cover.classList.add('placeholder');
        cover.innerHTML = '🎵';
    };
    
    // Populate tracklist
    modalTracklist.innerHTML = '';
    if (album.tracks && album.tracks.length > 0) {
        album.tracks.forEach((track, index) => {
            const trackDiv = document.createElement('div');
            trackDiv.className = 'track-item';
            
            const trackNumber = document.createElement('span');
            trackNumber.className = 'track-number';
            trackNumber.textContent = index + 1;
            
            const trackName = document.createElement('span');
            trackName.className = 'track-name';
            trackName.textContent = track.name;
            
            const trackDuration = document.createElement('span');
            trackDuration.className = 'track-duration';
            trackDuration.textContent = track.duration || '--:--';
            
            trackDiv.appendChild(trackNumber);
            trackDiv.appendChild(trackName);
            trackDiv.appendChild(trackDuration);
            modalTracklist.appendChild(trackDiv);
        });
    }
    
    // Show modal
    modalBackdrop.style.display = 'flex';
}

// Close modal
function closeModal() {
    modalBackdrop.style.display = 'none';
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
