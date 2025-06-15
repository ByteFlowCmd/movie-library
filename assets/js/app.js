class MovieLibraryApp {
    constructor() {
        this.currentTab = 'movies';
        this.currentData = window.LIBRARY_DATA.movies;
        this.filteredData = [...this.currentData];
        this.filters = {
            search: '',
            genre: '',
            year: '',
            rating: '',
            sort: 'title'
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.populateFilters();
        this.renderContent();
        this.updateStats();
    }

    setupEventListeners() {
        // Tab switching
        document.getElementById('moviesTab').addEventListener('click', () => this.switchTab('movies'));
        document.getElementById('tvShowsTab').addEventListener('click', () => this.switchTab('tvShows'));
        document.getElementById('moviesTabMobile').addEventListener('click', () => this.switchTab('movies'));
        document.getElementById('tvShowsTabMobile').addEventListener('click', () => this.switchTab('tvShows'));

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Filters
        document.getElementById('genreFilter').addEventListener('change', (e) => {
            this.filters.genre = e.target.value;
            this.applyFilters();
        });

        document.getElementById('yearFilter').addEventListener('change', (e) => {
            this.filters.year = e.target.value;
            this.applyFilters();
        });

        document.getElementById('ratingFilter').addEventListener('change', (e) => {
            this.filters.rating = parseFloat(e.target.value) || '';
            this.applyFilters();
        });

        document.getElementById('sortFilter').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.applyFilters();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Modal
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.getElementById('sunIcon').classList.remove('hidden');
            document.getElementById('moonIcon').classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            document.getElementById('sunIcon').classList.add('hidden');
            document.getElementById('moonIcon').classList.remove('hidden');
        }
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            document.getElementById('sunIcon').classList.add('hidden');
            document.getElementById('moonIcon').classList.remove('hidden');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            document.getElementById('sunIcon').classList.remove('hidden');
            document.getElementById('moonIcon').classList.add('hidden');
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        this.currentData = tab === 'movies' ? window.LIBRARY_DATA.movies : window.LIBRARY_DATA.tvShows;

        // Update tab buttons
        document.querySelectorAll('.tab-button, .tab-button-mobile').forEach(btn => {
            btn.classList.remove('active');
        });

        if (tab === 'movies') {
            document.getElementById('moviesTab').classList.add('active');
            document.getElementById('moviesTabMobile').classList.add('active');
        } else {
            document.getElementById('tvShowsTab').classList.add('active');
            document.getElementById('tvShowsTabMobile').classList.add('active');
        }

        this.populateFilters();
        this.applyFilters();
    }

    populateFilters() {
        const genres = new Set();
        const years = new Set();

        this.currentData.forEach(item => {
            item.genres.forEach(genre => genres.add(genre));
            years.add(item.year);
        });

        // Populate genre filter
        const genreFilter = document.getElementById('genreFilter');
        genreFilter.innerHTML = '<option value="">All Genres</option>';
        [...genres].sort().forEach(genre => {
            genreFilter.innerHTML += `<option value="${genre}">${genre}</option>`;
        });

        // Populate year filter
        const yearFilter = document.getElementById('yearFilter');
        yearFilter.innerHTML = '<option value="">All Years</option>';
        [...years].sort((a, b) => b - a).forEach(year => {
            yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
        });
    }

    applyFilters() {
        let filtered = [...this.currentData];

        // Search filter
        if (this.filters.search) {
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(this.filters.search) ||
                item.director.toLowerCase().includes(this.filters.search) ||
                item.genres.some(genre => genre.toLowerCase().includes(this.filters.search))
            );
        }

        // Genre filter
        if (this.filters.genre) {
            filtered = filtered.filter(item => item.genres.includes(this.filters.genre));
        }

        // Year filter
        if (this.filters.year) {
            filtered = filtered.filter(item => item.year === this.filters.year);
        }

        // Rating filter
        if (this.filters.rating) {
            filtered = filtered.filter(item => item.rating >= this.filters.rating);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.filters.sort) {
                case 'year':
                    return b.year - a.year;
                case 'rating':
                    return b.rating - a.rating;
                case 'title':
                default:
                    return a.title.localeCompare(b.title);
            }
        });

        this.filteredData = filtered;
        this.renderContent();
        this.updateStats();
    }

    clearFilters() {
        this.filters = {
            search: '',
            genre: '',
            year: '',
            rating: '',
            sort: 'title'
        };

        document.getElementById('searchInput').value = '';
        document.getElementById('genreFilter').value = '';
        document.getElementById('yearFilter').value = '';
        document.getElementById('ratingFilter').value = '';
        document.getElementById('sortFilter').value = 'title';

        this.applyFilters();
    }

    renderContent() {
        const grid = document.getElementById('contentGrid');
        const loading = document.getElementById('loadingState');
        const noResults = document.getElementById('noResults');

        loading.classList.add('hidden');

        if (this.filteredData.length === 0) {
            grid.innerHTML = '';
            noResults.classList.remove('hidden');
            return;
        }

        noResults.classList.add('hidden');

        grid.innerHTML = this.filteredData.map(item => this.createItemCard(item)).join('');

        // Add click listeners to cards
        grid.querySelectorAll('.poster-card').forEach((card, index) => {
            card.addEventListener('click', () => this.showModal(this.filteredData[index]));
        });
    }

    createItemCard(item) {
        const posterSrc = item.poster ? item.poster : '';
        const posterContent = posterSrc ? 
            `<img src="${posterSrc}" alt="${item.title}" class="poster-image" loading="lazy">` :
            `<div class="poster-placeholder">🎬</div>`;

        return `
            <div class="poster-card animate-fade-in">
                ${posterContent}
                <div class="p-3">
                    <h3 class="font-semibold text-sm mb-1 line-clamp-2">${item.title}</h3>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">${item.year}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-1">
                            <span class="star">⭐</span>
                            <span class="text-xs font-medium">${item.rating.toFixed(1)}</span>
                        </div>
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                            ${item.runtime ? item.runtime + 'min' : ''}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    showModal(item) {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');

        const posterSrc = item.poster ? item.poster : '';
        const posterContent = posterSrc ? 
            `<img src="${posterSrc}" alt="${item.title}" class="w-full h-96 object-cover">` :
            `<div class="w-full h-96 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-6xl text-gray-500 dark:text-gray-400">🎬</div>`;

        modalContent.innerHTML = `
            <div class="relative">
                <button onclick="app.closeModal()" class="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                ${posterContent}
            </div>

            <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h2 class="text-2xl font-bold mb-2">${item.title}</h2>
                        <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>${item.year}</span>
                            <span>${item.runtime ? item.runtime + ' min' : ''}</span>
                            <div class="flex items-center space-x-1">
                                <span class="star">⭐</span>
                                <span class="font-medium">${item.rating.toFixed(1)}/10</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <h3 class="font-semibold mb-2">Director:</h3>
                    <p class="text-gray-700 dark:text-gray-300">${item.director}</p>
                </div>

                <div class="mb-4">
                    <h3 class="font-semibold mb-2">Genres:</h3>
                    <div class="flex flex-wrap">
                        ${item.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>
                </div>

                <div class="mb-6">
                    <h3 class="font-semibold mb-2">Plot:</h3>
                    <p class="text-gray-700 dark:text-gray-300 leading-relaxed">${item.overview || 'No plot summary available.'}</p>
                </div>

                ${item.cast && item.cast.length > 0 ? `
                <div>
                    <h3 class="font-semibold mb-3">Cast:</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        ${item.cast.slice(0, 8).map(actor => `
                            <div class="cast-member">
                                <div class="cast-avatar">
                                    ${actor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <div>
                                    <p class="font-medium text-sm">${actor.name}</p>
                                    <p class="text-xs text-gray-600 dark:text-gray-400">${actor.character}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('modal-enter');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('modal');
        modal.classList.add('hidden');
        modal.classList.remove('modal-enter');
        document.body.style.overflow = 'auto';
    }

    updateStats() {
        document.getElementById('resultCount').textContent = this.filteredData.length;
        document.getElementById('totalCount').textContent = this.currentData.length;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieLibraryApp();
});