// Global state
let allAlbums = [];
let currentIndex = 0;
let isScrolling = false;
let scrollTimeout;

// DOM elements
const stack = document.getElementById('stack');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalClose = document.getElementById('modal-close');

// Stack configuration
const STACK_DEPTH = 3;
const ANIMATION_DURATION = 300;

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
        renderStack();
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
    // Scroll event with debounce - only prevent if not in modal
    document.addEventListener('wheel', (e) => {
        // Allow scrolling inside modal
        if (e.target.closest('.modal')) {
            return;
        }
        e.preventDefault();
        handleScroll(e.deltaY);
    }, { passive: false });

    // Touch support for mobile
    let touchStart = null;
    document.addEventListener('touchstart', (e) => {
        touchStart = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        // Allow scrolling inside modal
        if (e.target.closest('.modal')) {
            return;
        }
        if (!touchStart) return;
        const touchEnd = e.touches[0].clientY;
        const diff = touchStart - touchEnd;
        
        if (Math.abs(diff) > 30) {
            e.preventDefault();
            handleScroll(diff * 2);
            touchStart = null;
        }
    }, { passive: false });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleScroll(50);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleScroll(-50);
        }
    });

    // Modal close handlers
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
}

// Handle scroll events
function handleScroll(delta) {
    if (isScrolling) return;
    
    isScrolling = true;
    clearTimeout(scrollTimeout);
    
    if (delta > 0) {
        // Scroll down - next album
        currentIndex = (currentIndex + 1) % allAlbums.length;
    } else {
        // Scroll up - previous album
        currentIndex = (currentIndex - 1 + allAlbums.length) % allAlbums.length;
    }
    
    renderStack();
    
    scrollTimeout = setTimeout(() => {
        isScrolling = false;
    }, ANIMATION_DURATION);
}

// Render the stack of albums
function renderStack() {
    stack.innerHTML = '';
    
    // Render visible albums (current + depth)
    for (let i = 0; i < STACK_DEPTH; i++) {
        const albumIndex = (currentIndex + i) % allAlbums.length;
        const album = allAlbums[albumIndex];
        
        const albumElement = createStackAlbum(album, i);
        stack.appendChild(albumElement);
    }
}

// Create a stack album element
function createStackAlbum(album, depth) {
    const albumDiv = document.createElement('div');
    albumDiv.className = 'stack-album';
    
    if (depth === 0) {
        // Front album - no offset
        albumDiv.style.transform = 'translateY(0px) rotateZ(0deg) scale(1)';
        albumDiv.style.zIndex = 100 - depth;
    } else if (depth === 1) {
        // Second album - slight offset and rotation
        albumDiv.style.transform = 'translateY(35px) rotateZ(3deg) scale(0.97)';
        albumDiv.style.zIndex = 100 - depth;
    } else {
        // Third album - more offset and rotation
        albumDiv.style.transform = 'translateY(70px) rotateZ(6deg) scale(0.94)';
        albumDiv.style.zIndex = 100 - depth;
    }
    
    if (album.cover) {
        const img = document.createElement('img');
        img.src = album.cover;
        img.alt = `${album.title} cover`;
        img.onerror = () => {
            albumDiv.classList.add('placeholder');
            albumDiv.innerHTML = '🎵';
        };
        albumDiv.appendChild(img);
    } else {
        albumDiv.classList.add('placeholder');
        albumDiv.innerHTML = '🎵';
    }
    
    // Add click handler to open modal
    albumDiv.addEventListener('click', () => {
        openModal(album);
    });
    
    return albumDiv;
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
