/**
 * Movie Library Viewer - Read-only gallery for GitHub Pages
 * This script loads data from data.js and displays the library
 */

class LibraryViewer {
    constructor() {
        this.movies = [];
        this.tvShows = [];
        this.currentLibraryType = 'movies';
        
        this.init();
    }

    init() {
        // Load data from data.js (must be loaded before this script)
        if (typeof libraryData !== 'undefined') {
            this.movies = libraryData.movies || [];
            this.tvShows = libraryData.tvShows || [];
        }

        this.bindEvents();
        this.updateStats();
        this.renderLibrary();
    }

    bindEvents() {
        // Library tabs
        document.getElementById('moviesLibTab')?.addEventListener('click', () => {
            this.currentLibraryType = 'movies';
            this.updateLibraryTabs();
            this.renderLibrary();
        });

        document.getElementById('tvLibTab')?.addEventListener('click', () => {
            this.currentLibraryType = 'tv';
            this.updateLibraryTabs();
            this.renderLibrary();
        });

        // Close modal on background click
        document.getElementById('detailModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') {
                this.closeModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    updateStats() {
        document.getElementById('movieCount').textContent = this.movies.length;
        document.getElementById('tvCount').textContent = this.tvShows.length;
        document.getElementById('moviesLibCount').textContent = this.movies.length;
        document.getElementById('tvLibCount').textContent = this.tvShows.length;
    }

    updateLibraryTabs() {
        const moviesTab = document.getElementById('moviesLibTab');
        const tvTab = document.getElementById('tvLibTab');

        if (this.currentLibraryType === 'movies') {
            moviesTab.classList.add('active');
            tvTab.classList.remove('active');
            moviesTab.querySelector('span').classList.remove('bg-gray-600');
            moviesTab.querySelector('span').classList.add('bg-netflix-red');
            tvTab.querySelector('span').classList.add('bg-gray-600');
            tvTab.querySelector('span').classList.remove('bg-netflix-red');
        } else {
            tvTab.classList.add('active');
            moviesTab.classList.remove('active');
            tvTab.querySelector('span').classList.remove('bg-gray-600');
            tvTab.querySelector('span').classList.add('bg-netflix-red');
            moviesTab.querySelector('span').classList.add('bg-gray-600');
            moviesTab.querySelector('span').classList.remove('bg-netflix-red');
        }
    }

    renderLibrary() {
        const grid = document.getElementById('libraryGrid');
        const loading = document.getElementById('libraryLoading');
        const empty = document.getElementById('libraryEmpty');

        loading.classList.add('hidden');

        const items = this.currentLibraryType === 'movies' ? this.movies : this.tvShows;

        if (items.length === 0) {
            grid.classList.add('hidden');
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        grid.classList.remove('hidden');

        grid.innerHTML = items.map(item => this.createMediaCard(item, this.currentLibraryType === 'movies' ? 'movie' : 'tv')).join('');

        // Bind click events
        grid.querySelectorAll('.media-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                const type = card.dataset.type;
                this.showDetail(id, type);
            });
        });
    }

    createMediaCard(item, type) {
        const title = type === 'movie' ? item.title : item.name;
        const year = type === 'movie' 
            ? (item.release_date ? item.release_date.split('-')[0] : 'N/A')
            : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A');
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : null;

        return `
            <div class="media-card" data-id="${item.id}" data-type="${type}">
                ${posterUrl 
                    ? `<img src="${posterUrl}" alt="${title}" class="poster-image" loading="lazy">`
                    : `<div class="poster-placeholder">🎬</div>`
                }
                <div class="p-3">
                    <h3 class="font-semibold text-sm truncate">${title}</h3>
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-xs text-gray-400">${year}</span>
                        <div class="flex items-center space-x-1">
                            <span class="text-yellow-400 text-xs">⭐</span>
                            <span class="text-xs">${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showDetail(id, type) {
        const items = type === 'movie' ? this.movies : this.tvShows;
        const item = items.find(i => i.id === id);

        if (!item) return;

        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailModalContent');

        const title = type === 'movie' ? item.title : item.name;
        const year = type === 'movie'
            ? (item.release_date ? item.release_date.split('-')[0] : 'N/A')
            : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A');
        const backdropUrl = item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
            : null;
        const posterUrl = item.poster_path
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : null;

        content.innerHTML = `
            <div class="relative">
                ${backdropUrl 
                    ? `<div class="h-64 md:h-80 bg-cover bg-center relative" style="background-image: url('${backdropUrl}')">
                        <div class="absolute inset-0 bg-gradient-to-t from-netflix-gray via-netflix-gray/50 to-transparent"></div>
                       </div>`
                    : `<div class="h-32 bg-gradient-to-r from-netflix-red to-red-800"></div>`
                }
                
                <button onclick="viewer.closeModal()" class="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-all">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="p-6 -mt-20 relative">
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="flex-shrink-0">
                        ${posterUrl
                            ? `<img src="${posterUrl}" alt="${title}" class="w-32 md:w-48 rounded-lg shadow-2xl">`
                            : `<div class="w-32 md:w-48 aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-6xl">🎬</div>`
                        }
                    </div>

                    <div class="flex-1">
                        <h2 class="text-2xl md:text-3xl font-bold mb-2">${title}</h2>
                        
                        <div class="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-400">
                            <span class="flex items-center space-x-1">
                                <span class="text-yellow-400">⭐</span>
                                <span>${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
                            </span>
                            <span>${year}</span>
                            <span class="px-2 py-1 bg-netflix-dark rounded text-xs uppercase">${type === 'movie' ? 'Movie' : 'TV Show'}</span>
                        </div>

                        ${item.genres && item.genres.length > 0 
                            ? `<div class="mb-4">
                                ${item.genres.map(g => `<span class="genre-tag">${typeof g === 'object' ? g.name : g}</span>`).join('')}
                               </div>`
                            : ''
                        }

                        <p class="text-gray-300 leading-relaxed">${item.overview || 'No description available.'}</p>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.getElementById('detailModal').classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Initialize viewer
const viewer = new LibraryViewer();
