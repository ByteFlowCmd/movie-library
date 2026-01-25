class MovieLibraryManager {
    constructor() {
        this.apiKey = '';
        this.serverConfigured = false;  // Track if server has API key configured
        this.apiBaseUrl = '/api';
        this.currentView = 'library';  // Changed default to library view
        this.currentLibraryTab = 'movies';
        this.library = { movies: [], tv_shows: [] };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkApiStatus();
        this.loadLibrary();
    }

    // ========== EVENT LISTENERS ==========

    setupEventListeners() {
        // API Modal
        document.getElementById('openApiModal').addEventListener('click', () => this.openApiModal());
        document.getElementById('closeApiModal').addEventListener('click', () => this.closeApiModal());
        document.getElementById('saveApiKey').addEventListener('click', () => this.saveApiKey());

        // Sync Library Button
        document.getElementById('syncLibraryBtn').addEventListener('click', () => this.syncLibrary());

        // Generate Website Button
        document.getElementById('generateSiteBtn').addEventListener('click', () => this.generateSite());

        // View Tabs
        document.getElementById('searchViewBtn').addEventListener('click', () => this.switchView('search'));
        document.getElementById('libraryViewBtn').addEventListener('click', () => this.switchView('library'));

        // Library Tabs
        document.getElementById('moviesLibTab').addEventListener('click', () => this.switchLibraryTab('movies'));
        document.getElementById('tvLibTab').addEventListener('click', () => this.switchLibraryTab('tv'));

        // Search - now with button and Enter key
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');

        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.performSearch(query);
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            }
        });

        // Media type change should clear results
        document.getElementById('mediaTypeSelect').addEventListener('change', () => {
            this.showSearchPlaceholder();
        });

        // Navigation
        document.getElementById('goToSearch')?.addEventListener('click', () => this.switchView('search'));

        // Detail Modal
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') this.closeDetailModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDetailModal();
                this.closeApiModal();
            }
        });
    }

    // ========== API KEY MANAGEMENT ==========

    openApiModal() {
        const modal = document.getElementById('apiKeyModal');
        const input = document.getElementById('apiKeyInput');
        input.value = this.apiKey;
        modal.classList.remove('hidden');
        input.focus();
    }

    closeApiModal() {
        document.getElementById('apiKeyModal').classList.add('hidden');
    }

    saveApiKey() {
        const input = document.getElementById('apiKeyInput');
        const key = input.value.trim();

        if (!key) {
            this.showToast('Please enter an API key', 'error');
            return;
        }

        this.apiKey = key;
        this.closeApiModal();
        this.showToast('API key saved successfully!', 'success');
        this.checkApiStatus();
    }

    async checkApiStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/status`, {
                headers: this.getHeaders()
            });
            const data = await response.json();

            const statusDot = document.getElementById('apiStatus');
            const statusText = document.getElementById('apiStatusText');

            // Update server configuration status
            this.serverConfigured = data.api_key_configured || false;

            if (data.success && data.api_key_configured) {
                statusDot.classList.remove('bg-red-500');
                statusDot.classList.add('bg-green-500');
                statusText.textContent = 'Connected';

                // Update stats
                if (data.library) {
                    document.getElementById('movieCount').textContent = data.library.movies_count || 0;
                    document.getElementById('tvCount').textContent = data.library.tv_shows_count || 0;
                }
            } else {
                statusDot.classList.remove('bg-green-500');
                statusDot.classList.add('bg-red-500');
                statusText.textContent = 'No API Key';

                // Show API modal only if server doesn't have API key configured
                if (!data.api_key_configured) {
                    setTimeout(() => this.openApiModal(), 500);
                }
            }
        } catch (error) {
            console.error('Status check failed:', error);
            document.getElementById('apiStatus').classList.add('bg-red-500');
            document.getElementById('apiStatusText').textContent = 'Error';
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        // Only add API key header if we have one locally
        if (this.apiKey && this.apiKey.trim()) {
            headers['X-TMDB-API-Key'] = this.apiKey;
        }
        return headers;
    }

    // ========== LIBRARY SYNC ==========

    async syncLibrary() {
        if (!this.apiKey && !this.serverConfigured) {
            this.showToast('Please configure your API key first', 'error');
            this.openApiModal();
            return;
        }

        // Show loading overlay
        const overlay = document.getElementById('syncOverlay');
        overlay.classList.remove('hidden');

        try {
            const response = await fetch(`${this.apiBaseUrl}/library/sync`, {
                method: 'POST',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Sync failed');
            }

            const data = await response.json();

            // Hide overlay
            overlay.classList.add('hidden');

            // Show success message - using data.synced instead of data.added
            const moviesSynced = data.synced?.movies || 0;
            const tvSynced = data.synced?.tv_shows || 0;
            const totalSynced = moviesSynced + tvSynced;

            if (totalSynced > 0) {
                this.showToast(
                    `Sync complete! Synced ${moviesSynced} movie${moviesSynced !== 1 ? 's' : ''} and ${tvSynced} TV show${tvSynced !== 1 ? 's' : ''}`,
                    'success'
                );
            } else {
                this.showToast('Sync complete! Library is up to date', 'info');
            }

            // Refresh library and stats
            await this.loadLibrary();
            await this.checkApiStatus();

        } catch (error) {
            // Hide overlay
            overlay.classList.add('hidden');

            console.error('Sync error:', error);
            this.showToast(error.message || 'Failed to sync library', 'error');
        }
    }

    // ========== GENERATE STATIC SITE ==========

    async generateSite() {
        if (!this.apiKey && !this.serverConfigured) {
            this.showToast('Please configure your API key first', 'error');
            this.openApiModal();
            return;
        }

        // Show loading overlay with custom message
        const overlay = document.getElementById('syncOverlay');
        const overlayContent = overlay.querySelector('.text-center');
        const originalHTML = overlayContent.innerHTML;

        overlayContent.innerHTML = `
            <div class="animate-spin rounded-full h-24 w-24 border-b-4 border-purple-500 mx-auto mb-6"></div>
            <h3 class="text-2xl font-bold mb-2 text-purple-400">Generating Static Site</h3>
            <p class="text-gray-400">Creating HTML files... This may take a moment.</p>
        `;
        overlay.classList.remove('hidden');

        try {
            const response = await fetch(`${this.apiBaseUrl}/generate`, {
                method: 'POST',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Generation failed');
            }

            const data = await response.json();

            // Hide overlay and restore original content
            overlay.classList.add('hidden');
            overlayContent.innerHTML = originalHTML;

            // Show success message
            const movieCount = data.stats?.movies || 0;
            const tvCount = data.stats?.tv_shows || 0;

            this.showToast(
                `Website generated successfully! ${movieCount} movies and ${tvCount} TV shows in movie-library/ folder`,
                'success'
            );

        } catch (error) {
            // Hide overlay and restore original content
            overlay.classList.add('hidden');
            overlayContent.innerHTML = originalHTML;

            console.error('Generate site error:', error);
            this.showToast(error.message || 'Failed to generate website', 'error');
        }
    }

    // ========== SEARCH ==========

    async performSearch(query) {
        if (!query || query.trim().length < 2) {
            this.showToast('Please enter at least 2 characters to search', 'info');
            return;
        }

        if (!this.apiKey && !this.serverConfigured) {
            this.showToast('Please configure your API key first', 'error');
            this.openApiModal();
            return;
        }

        const mediaType = document.getElementById('mediaTypeSelect').value;

        // Show loading state
        document.getElementById('searchLoading').classList.remove('hidden');
        document.getElementById('searchPlaceholder').classList.add('hidden');
        document.getElementById('searchResults').classList.add('hidden');

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/search?query=${encodeURIComponent(query)}&type=${mediaType}&limit=18`,
                { headers: this.getHeaders() }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Search failed');
            }

            const data = await response.json();
            this.displaySearchResults(data.results || []);
        } catch (error) {
            console.error('Search error:', error);
            this.showToast(error.message || 'Search failed. Please try again.', 'error');
            this.showSearchPlaceholder();
        }
    }

    displaySearchResults(results) {
        const loading = document.getElementById('searchLoading');
        const placeholder = document.getElementById('searchPlaceholder');
        const resultsContainer = document.getElementById('searchResults');
        const grid = document.getElementById('searchGrid');
        const count = document.getElementById('searchResultCount');

        loading.classList.add('hidden');
        placeholder.classList.add('hidden');

        if (results.length === 0) {
            resultsContainer.classList.add('hidden');
            placeholder.classList.remove('hidden');
            placeholder.innerHTML = `
                <div class="text-8xl mb-6 opacity-20">😢</div>
                <h3 class="text-2xl font-semibold mb-2 text-gray-300">No Results Found</h3>
                <p class="text-gray-500">Try a different search term</p>
            `;
            return;
        }

        count.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
        grid.innerHTML = results.map(item => this.createMediaCard(item, true)).join('');
        resultsContainer.classList.remove('hidden');

        // Add event listeners
        grid.querySelectorAll('.media-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.showDetailModal(results[index]);
                }
            });
        });

        grid.querySelectorAll('.add-to-library').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToLibrary(results[index]);
            });
        });
    }

    showSearchPlaceholder() {
        document.getElementById('searchLoading').classList.add('hidden');
        document.getElementById('searchResults').classList.add('hidden');
        const placeholder = document.getElementById('searchPlaceholder');
        placeholder.classList.remove('hidden');
        // Reset to default placeholder
        placeholder.innerHTML = `
            <div class="text-8xl mb-6 opacity-20">🔍</div>
            <h3 class="text-2xl font-semibold mb-2 text-gray-300">Search for Movies & TV Shows</h3>
            <p class="text-gray-500">Enter a title and click Search or press Enter</p>
        `;
    }

    // ========== LIBRARY ==========

    async loadLibrary() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/library`, {
                headers: this.getHeaders()
            });

            if (!response.ok) throw new Error('Failed to load library');

            const data = await response.json();
            this.library.movies = data.movies || [];
            this.library.tv_shows = data.tv_shows || [];

            this.updateLibraryStats();
            this.displayLibrary();
        } catch (error) {
            console.error('Library load error:', error);
            document.getElementById('libraryLoading').classList.add('hidden');
            document.getElementById('libraryEmpty').classList.remove('hidden');
        }
    }

    displayLibrary() {
        const loading = document.getElementById('libraryLoading');
        const empty = document.getElementById('libraryEmpty');
        const grid = document.getElementById('libraryGrid');

        loading.classList.add('hidden');

        const items = this.currentLibraryTab === 'movies' ? this.library.movies : this.library.tv_shows;

        if (items.length === 0) {
            empty.classList.remove('hidden');
            grid.innerHTML = '';
            return;
        }

        empty.classList.add('hidden');
        grid.innerHTML = items.map(item => this.createMediaCard(item, false)).join('');

        // Add event listeners
        grid.querySelectorAll('.media-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.showDetailModal(items[index]);
                }
            });
        });

        grid.querySelectorAll('.remove-from-library').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromLibrary(items[index]);
            });
        });
    }

    updateLibraryStats() {
        document.getElementById('movieCount').textContent = this.library.movies.length;
        document.getElementById('tvCount').textContent = this.library.tv_shows.length;
        document.getElementById('moviesLibCount').textContent = this.library.movies.length;
        document.getElementById('tvLibCount').textContent = this.library.tv_shows.length;
    }

    async addToLibrary(item) {
        if (!this.apiKey && !this.serverConfigured) {
            this.showToast('Please configure your API key first', 'error');
            this.openApiModal();
            return;
        }

        if (item.in_library) {
            this.showToast('Already in your library', 'info');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/library/add`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    tmdb_id: item.id,
                    type: item.media_type || document.getElementById('mediaTypeSelect').value
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add');
            }

            const data = await response.json();
            this.showToast(`Added "${item.title}" to library!`, 'success');

            // Refresh library
            await this.loadLibrary();

            // Update search results to show "in library" state
            item.in_library = true;
            const query = document.getElementById('searchInput').value;
            if (query) this.performSearch(query);

        } catch (error) {
            console.error('Add error:', error);
            this.showToast(error.message || 'Failed to add to library', 'error');
        }
    }

    async removeFromLibrary(item) {
        if (!confirm(`Remove "${item.title}" from your library?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/library/remove`, {
                method: 'DELETE',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    tmdb_id: item.id,
                    type: item.media_type
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to remove');
            }

            this.showToast(`Removed "${item.title}" from library`, 'success');

            // Immediately refresh library to reflect changes
            await this.loadLibrary();

        } catch (error) {
            console.error('Remove error:', error);
            this.showToast(error.message || 'Failed to remove from library', 'error');
        }
    }

    // ========== UI COMPONENTS ==========

    createMediaCard(item, isSearch) {
        // Fixed poster path logic: check if it's a local asset or TMDB URL
        const posterPath = item.poster || '';
        const poster = posterPath.startsWith('assets/') 
            ? posterPath  // Local poster from library
            : posterPath 
                ? `https://image.tmdb.org/t/p/w500${posterPath}`  // TMDB poster from search
                : '';

        const posterHTML = poster ? 
            `<img src="${poster}" alt="${item.title}" class="poster-image" loading="lazy">` :
            `<div class="poster-placeholder">🎬</div>`;

        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';
        const year = item.year || '';

        const buttonHTML = isSearch ? 
            (item.in_library ? 
                `<button class="action-button in-library w-full">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>In Library</span>
                </button>` :
                `<button class="action-button add add-to-library w-full">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <span>Add to Library</span>
                </button>`) :
            `<button class="action-button remove remove-from-library w-full">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Remove</span>
            </button>`;

        return `
            <div class="media-card">
                ${posterHTML}
                <div class="p-3">
                    <h3 class="font-semibold text-sm mb-1 line-clamp-2">${item.title}</h3>
                    <p class="text-xs text-gray-400 mb-2">${year}</p>
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-1">
                            <span class="text-yellow-400">⭐</span>
                            <span class="text-xs font-medium">${rating}</span>
                        </div>
                    </div>
                    ${buttonHTML}
                </div>
            </div>
        `;
    }

    showDetailModal(item) {
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailModalContent');

        // Fixed poster path logic: check if it's a local asset or TMDB URL
        const posterPath = item.poster || '';
        const poster = posterPath.startsWith('assets/') 
            ? posterPath  // Local poster from library
            : posterPath 
                ? `https://image.tmdb.org/t/p/w500${posterPath}`  // TMDB poster from search
                : '';

        const posterHTML = poster ? 
            `<img src="${poster}" alt="${item.title}" class="w-full h-96 object-cover">` :
            `<div class="w-full h-96 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-8xl">🎬</div>`;

        const genres = item.genres ? item.genres.map(g => `<span class="genre-tag">${g}</span>`).join('') : '';
        const director = item.director || 'N/A';
        const overview = item.overview || 'No overview available.';
        const rating = item.rating ? item.rating.toFixed(1) : 'N/A';

        content.innerHTML = `
            <div class="relative">
                <button onclick="window.app.closeDetailModal()" class="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                ${posterHTML}
            </div>

            <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h2 class="text-3xl font-bold mb-2">${item.title}</h2>
                        <div class="flex items-center space-x-4 text-sm text-gray-400">
                            <span>${item.year || 'N/A'}</span>
                            <span>${item.runtime ? item.runtime + ' min' : ''}</span>
                            <div class="flex items-center space-x-1">
                                <span class="text-yellow-400">⭐</span>
                                <span class="font-medium">${rating}/10</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <h3 class="font-semibold mb-2">Director:</h3>
                    <p class="text-gray-300">${director}</p>
                </div>

                <div class="mb-4">
                    <h3 class="font-semibold mb-2">Genres:</h3>
                    <div class="flex flex-wrap">
                        ${genres}
                    </div>
                </div>

                <div class="mb-6">
                    <h3 class="font-semibold mb-2">Overview:</h3>
                    <p class="text-gray-300 leading-relaxed">${overview}</p>
                </div>

                ${item.cast && item.cast.length > 0 ? `
                <div>
                    <h3 class="font-semibold mb-3">Cast:</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        ${item.cast.slice(0, 8).map(actor => `
                            <div class="flex items-center space-x-3 p-2 bg-netflix-dark rounded-lg">
                                <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium">
                                    ${actor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <div>
                                    <p class="font-medium text-sm">${actor.name}</p>
                                    <p class="text-xs text-gray-400">${actor.character}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeDetailModal() {
        const modal = document.getElementById('detailModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    // ========== VIEW SWITCHING ==========

    switchView(view) {
        this.currentView = view;

        // Update tab buttons
        document.querySelectorAll('.view-tab').forEach(btn => {
            btn.classList.remove('active');
        });

        if (view === 'search') {
            document.getElementById('searchViewBtn').classList.add('active');
            document.getElementById('searchView').classList.remove('hidden');
            document.getElementById('libraryView').classList.add('hidden');
        } else {
            document.getElementById('libraryViewBtn').classList.add('active');
            document.getElementById('searchView').classList.add('hidden');
            document.getElementById('libraryView').classList.remove('hidden');
            this.displayLibrary();
        }
    }

    switchLibraryTab(tab) {
        this.currentLibraryTab = tab;

        // Update tab buttons
        document.querySelectorAll('.library-tab').forEach(btn => {
            btn.classList.remove('active');
        });

        if (tab === 'movies') {
            document.getElementById('moviesLibTab').classList.add('active');
        } else {
            document.getElementById('tvLibTab').classList.add('active');
        }

        this.displayLibrary();
    }

    // ========== TOAST NOTIFICATIONS ==========

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

        toast.innerHTML = `
            <div class="text-2xl">${icon}</div>
            <div class="flex-1">
                <p class="font-medium">${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MovieLibraryManager();
});
