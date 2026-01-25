class MovieLibraryManager {
    constructor() {
        this.apiKey = '';
        this.serverConfigured = false;  // Track if server has API key configured
        this.apiBaseUrl = '/api';
        this.currentView = 'library';  // Default to library view
        this.currentLibraryTab = 'movies';
        this.library = { movies: [], tv_shows: [] };
        this.readOnlyMode = false;  // Track if running without backend (static mode)

        this.init();
    }

    async init() {
        // First detect if API is available
        await this.detectMode();

        // Setup event listeners (some may be hidden in read-only mode)
        this.setupEventListeners();

        if (!this.readOnlyMode) {
            // Full manager mode with API
            this.checkApiStatus();
            this.loadLibraryFromAPI();
        } else {
            // Static read-only mode
            this.loadStaticLibrary();
        }
    }

    // ========== MODE DETECTION ==========

    async detectMode() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`${this.apiBaseUrl}/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.readOnlyMode = false;
                    console.log('✅ API backend detected - Manager mode enabled');
                    return;
                }
            }

            // Response not OK or not successful
            this.enableReadOnlyMode();

        } catch (error) {
            // Network error, timeout, or CORS error - no backend available
            console.log('ℹ️ No API backend detected - switching to read-only mode');
            this.enableReadOnlyMode();
        }
    }

    enableReadOnlyMode() {
        this.readOnlyMode = true;
        console.log('📖 Read-only mode enabled (static site)');

        // Hide Sync Library button
        const syncBtn = document.getElementById('syncLibraryBtn');
        if (syncBtn) syncBtn.style.display = 'none';

        // Hide Generate Website button
        const generateBtn = document.getElementById('generateSiteBtn');
        if (generateBtn) generateBtn.style.display = 'none';

        // Hide API Key button
        const apiKeyBtn = document.getElementById('openApiModal');
        if (apiKeyBtn) apiKeyBtn.style.display = 'none';

        // Hide API status indicator
        const apiStatusContainer = document.getElementById('apiStatus')?.parentElement;
        if (apiStatusContainer && apiStatusContainer.classList.contains('flex')) {
            apiStatusContainer.style.display = 'none';
        }

        // Hide Search & Add tab (entire view tab)
        const searchViewBtn = document.getElementById('searchViewBtn');
        if (searchViewBtn) searchViewBtn.style.display = 'none';

        // Hide search view entirely
        const searchView = document.getElementById('searchView');
        if (searchView) searchView.style.display = 'none';

        // Make sure library view is visible
        const libraryView = document.getElementById('libraryView');
        if (libraryView) libraryView.classList.remove('hidden');

        // Update header title to indicate viewer mode
        const headerTitle = document.querySelector('header h1');
        if (headerTitle && headerTitle.textContent.includes('Manager')) {
            headerTitle.innerHTML = headerTitle.innerHTML.replace('Manager', 'Viewer');
        }

        // Hide API Key Modal if it exists
        const apiKeyModal = document.getElementById('apiKeyModal');
        if (apiKeyModal) apiKeyModal.style.display = 'none';

        // Hide Sync Overlay if it exists  
        const syncOverlay = document.getElementById('syncOverlay');
        if (syncOverlay) syncOverlay.style.display = 'none';
    }

    // ========== EVENT LISTENERS ==========

    setupEventListeners() {
        // Only setup management event listeners if not in read-only mode
        if (!this.readOnlyMode) {
            // API Modal
            const openApiModalBtn = document.getElementById('openApiModal');
            const closeApiModalBtn = document.getElementById('closeApiModal');
            const saveApiKeyBtn = document.getElementById('saveApiKey');

            if (openApiModalBtn) openApiModalBtn.addEventListener('click', () => this.openApiModal());
            if (closeApiModalBtn) closeApiModalBtn.addEventListener('click', () => this.closeApiModal());
            if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());

            // Sync Library Button
            const syncLibraryBtn = document.getElementById('syncLibraryBtn');
            if (syncLibraryBtn) syncLibraryBtn.addEventListener('click', () => this.syncLibrary());

            // Generate Website Button
            const generateSiteBtn = document.getElementById('generateSiteBtn');
            if (generateSiteBtn) generateSiteBtn.addEventListener('click', () => this.generateSite());

            // Search View Tab
            const searchViewBtn = document.getElementById('searchViewBtn');
            if (searchViewBtn) searchViewBtn.addEventListener('click', () => this.switchView('search'));

            // Search functionality
            const searchInput = document.getElementById('searchInput');
            const searchButton = document.getElementById('searchButton');

            if (searchButton) {
                searchButton.addEventListener('click', () => {
                    const query = searchInput?.value.trim();
                    if (query) {
                        this.performSearch(query);
                    }
                });
            }

            if (searchInput) {
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const query = searchInput.value.trim();
                        if (query) {
                            this.performSearch(query);
                        }
                    }
                });
            }

            // Media type change should clear results
            const mediaTypeSelect = document.getElementById('mediaTypeSelect');
            if (mediaTypeSelect) {
                mediaTypeSelect.addEventListener('change', () => {
                    this.showSearchPlaceholder();
                });
            }

            // Navigation to search
            const goToSearchBtn = document.getElementById('goToSearch');
            if (goToSearchBtn) goToSearchBtn.addEventListener('click', () => this.switchView('search'));
        }

        // Library View Tab (always available)
        const libraryViewBtn = document.getElementById('libraryViewBtn');
        if (libraryViewBtn) libraryViewBtn.addEventListener('click', () => this.switchView('library'));

        // Library Tabs (always available)
        const moviesLibTab = document.getElementById('moviesLibTab');
        const tvLibTab = document.getElementById('tvLibTab');

        if (moviesLibTab) moviesLibTab.addEventListener('click', () => this.switchLibraryTab('movies'));
        if (tvLibTab) tvLibTab.addEventListener('click', () => this.switchLibraryTab('tv'));

        // Detail Modal (always available, but without edit buttons in read-only mode)
        const detailModal = document.getElementById('detailModal');
        if (detailModal) {
            detailModal.addEventListener('click', (e) => {
                if (e.target.id === 'detailModal') this.closeDetailModal();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDetailModal();
                if (!this.readOnlyMode) {
                    this.closeApiModal();
                }
            }
        });
    }

    // ========== STATIC LIBRARY LOADING ==========

    loadStaticLibrary() {
        const loading = document.getElementById('libraryLoading');
        const empty = document.getElementById('libraryEmpty');

        // Check if libraryData is defined (from data.js)
        if (typeof libraryData !== 'undefined') {
            console.log('📚 Loading library from static data.js');

            this.library.movies = libraryData.movies || [];
            this.library.tv_shows = libraryData.tvShows || [];

            console.log(`   Found ${this.library.movies.length} movies and ${this.library.tv_shows.length} TV shows`);

            this.updateLibraryStats();
            this.displayLibrary();

            if (loading) loading.classList.add('hidden');
        } else {
            console.error('❌ libraryData not found - make sure data.js is loaded before app.js');
            if (loading) loading.classList.add('hidden');
            if (empty) {
                empty.classList.remove('hidden');
                // Update empty state message for static mode
                empty.innerHTML = `
                    <div class="text-8xl mb-6 opacity-20">📚</div>
                    <h3 class="text-2xl font-semibold mb-2 text-gray-300">No Library Data Found</h3>
                    <p class="text-gray-500">Library data file (data.js) is missing or empty.</p>
                `;
            }
        }
    }

    // ========== API LIBRARY LOADING ==========

    async loadLibraryFromAPI() {
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
            document.getElementById('libraryLoading')?.classList.add('hidden');
            document.getElementById('libraryEmpty')?.classList.remove('hidden');
        }
    }

    // Wrapper method for compatibility
    async loadLibrary() {
        if (this.readOnlyMode) {
            this.loadStaticLibrary();
        } else {
            await this.loadLibraryFromAPI();
        }
    }

    // ========== API KEY MANAGEMENT ==========

    openApiModal() {
        if (this.readOnlyMode) return;

        const modal = document.getElementById('apiKeyModal');
        const input = document.getElementById('apiKeyInput');
        if (input) input.value = this.apiKey;
        if (modal) {
            modal.classList.remove('hidden');
            input?.focus();
        }
    }

    closeApiModal() {
        const modal = document.getElementById('apiKeyModal');
        if (modal) modal.classList.add('hidden');
    }

    saveApiKey() {
        if (this.readOnlyMode) return;

        const input = document.getElementById('apiKeyInput');
        const key = input?.value.trim();

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
        if (this.readOnlyMode) return;

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
                if (statusDot) {
                    statusDot.classList.remove('bg-red-500');
                    statusDot.classList.add('bg-green-500');
                }
                if (statusText) statusText.textContent = 'Connected';

                // Update stats
                if (data.library) {
                    const movieCount = document.getElementById('movieCount');
                    const tvCount = document.getElementById('tvCount');
                    if (movieCount) movieCount.textContent = data.library.movies_count || 0;
                    if (tvCount) tvCount.textContent = data.library.tv_shows_count || 0;
                }
            } else {
                if (statusDot) {
                    statusDot.classList.remove('bg-green-500');
                    statusDot.classList.add('bg-red-500');
                }
                if (statusText) statusText.textContent = 'No API Key';

                // Show API modal only if server doesn't have API key configured
                if (!data.api_key_configured) {
                    setTimeout(() => this.openApiModal(), 500);
                }
            }
        } catch (error) {
            console.error('Status check failed:', error);
            const statusDot = document.getElementById('apiStatus');
            const statusText = document.getElementById('apiStatusText');
            if (statusDot) statusDot.classList.add('bg-red-500');
            if (statusText) statusText.textContent = 'Error';
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
        if (this.readOnlyMode) {
            this.showToast('Sync is not available in read-only mode', 'info');
            return;
        }

        if (!this.apiKey && !this.serverConfigured) {
            this.showToast('Please configure your API key first', 'error');
            this.openApiModal();
            return;
        }

        // Show loading overlay
        const overlay = document.getElementById('syncOverlay');
        if (overlay) overlay.classList.remove('hidden');

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
            if (overlay) overlay.classList.add('hidden');

            // Show success message
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
            if (overlay) overlay.classList.add('hidden');
            console.error('Sync error:', error);
            this.showToast(error.message || 'Failed to sync library', 'error');
        }
    }

    // ========== GENERATE STATIC SITE ==========

    async generateSite() {
        if (this.readOnlyMode) {
            this.showToast('Generate is not available in read-only mode', 'info');
            return;
        }

        if (!this.apiKey && !this.serverConfigured) {
            this.showToast('Please configure your API key first', 'error');
            this.openApiModal();
            return;
        }

        // Show loading overlay with custom message
        const overlay = document.getElementById('syncOverlay');
        const overlayContent = overlay?.querySelector('.text-center');
        let originalHTML = '';

        if (overlayContent) {
            originalHTML = overlayContent.innerHTML;
            overlayContent.innerHTML = `
                <div class="animate-spin rounded-full h-24 w-24 border-b-4 border-purple-500 mx-auto mb-6"></div>
                <h3 class="text-2xl font-bold mb-2 text-purple-400">Generating Static Site</h3>
                <p class="text-gray-400">Creating HTML files... This may take a moment.</p>
            `;
        }
        if (overlay) overlay.classList.remove('hidden');

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
            if (overlay) overlay.classList.add('hidden');
            if (overlayContent) overlayContent.innerHTML = originalHTML;

            // Show success message
            const movieCount = data.stats?.movies || 0;
            const tvCount = data.stats?.tv_shows || 0;

            this.showToast(
                `Website generated successfully! ${movieCount} movies and ${tvCount} TV shows in movie-library/ folder`,
                'success'
            );

        } catch (error) {
            if (overlay) overlay.classList.add('hidden');
            if (overlayContent) overlayContent.innerHTML = originalHTML;
            console.error('Generate site error:', error);
            this.showToast(error.message || 'Failed to generate website', 'error');
        }
    }

    // ========== SEARCH ==========

    async performSearch(query) {
        if (this.readOnlyMode) {
            this.showToast('Search is not available in read-only mode', 'info');
            return;
        }

        if (!query || query.trim().length < 2) {
            this.showToast('Please enter at least 2 characters to search', 'info');
            return;
        }

        if (!this.apiKey && !this.serverConfigured) {
            this.showToast('Please configure your API key first', 'error');
            this.openApiModal();
            return;
        }

        const mediaType = document.getElementById('mediaTypeSelect')?.value || 'movie';

        // Show loading state
        document.getElementById('searchLoading')?.classList.remove('hidden');
        document.getElementById('searchPlaceholder')?.classList.add('hidden');
        document.getElementById('searchResults')?.classList.add('hidden');

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

        if (loading) loading.classList.add('hidden');
        if (placeholder) placeholder.classList.add('hidden');

        if (results.length === 0) {
            if (resultsContainer) resultsContainer.classList.add('hidden');
            if (placeholder) {
                placeholder.classList.remove('hidden');
                placeholder.innerHTML = `
                    <div class="text-8xl mb-6 opacity-20">😢</div>
                    <h3 class="text-2xl font-semibold mb-2 text-gray-300">No Results Found</h3>
                    <p class="text-gray-500">Try a different search term</p>
                `;
            }
            return;
        }

        if (count) count.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
        if (grid) grid.innerHTML = results.map(item => this.createMediaCard(item, true)).join('');
        if (resultsContainer) resultsContainer.classList.remove('hidden');

        // Add event listeners
        grid?.querySelectorAll('.media-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.showDetailModal(results[index]);
                }
            });
        });

        grid?.querySelectorAll('.add-to-library').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToLibrary(results[index]);
            });
        });
    }

    showSearchPlaceholder() {
        document.getElementById('searchLoading')?.classList.add('hidden');
        document.getElementById('searchResults')?.classList.add('hidden');
        const placeholder = document.getElementById('searchPlaceholder');
        if (placeholder) {
            placeholder.classList.remove('hidden');
            placeholder.innerHTML = `
                <div class="text-8xl mb-6 opacity-20">🔍</div>
                <h3 class="text-2xl font-semibold mb-2 text-gray-300">Search for Movies & TV Shows</h3>
                <p class="text-gray-500">Enter a title and click Search or press Enter</p>
            `;
        }
    }

    // ========== LIBRARY DISPLAY ==========

    displayLibrary() {
        const loading = document.getElementById('libraryLoading');
        const empty = document.getElementById('libraryEmpty');
        const grid = document.getElementById('libraryGrid');

        if (loading) loading.classList.add('hidden');

        const items = this.currentLibraryTab === 'movies' ? this.library.movies : this.library.tv_shows;

        if (items.length === 0) {
            if (empty) {
                empty.classList.remove('hidden');
                // Customize empty state based on mode
                if (this.readOnlyMode) {
                    empty.innerHTML = `
                        <div class="text-8xl mb-6 opacity-20">📚</div>
                        <h3 class="text-2xl font-semibold mb-2 text-gray-300">No ${this.currentLibraryTab === 'movies' ? 'Movies' : 'TV Shows'}</h3>
                        <p class="text-gray-500">This collection is empty.</p>
                    `;
                }
            }
            if (grid) grid.innerHTML = '';
            return;
        }

        if (empty) empty.classList.add('hidden');
        if (grid) {
            grid.innerHTML = items.map(item => this.createMediaCard(item, false)).join('');

            // Add event listeners
            grid.querySelectorAll('.media-card').forEach((card, index) => {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) {
                        this.showDetailModal(items[index]);
                    }
                });
            });

            // Only add remove button listeners if not in read-only mode
            if (!this.readOnlyMode) {
                grid.querySelectorAll('.remove-from-library').forEach((btn, index) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.removeFromLibrary(items[index]);
                    });
                });
            }
        }
    }

    updateLibraryStats() {
        const movieCount = document.getElementById('movieCount');
        const tvCount = document.getElementById('tvCount');
        const moviesLibCount = document.getElementById('moviesLibCount');
        const tvLibCount = document.getElementById('tvLibCount');

        if (movieCount) movieCount.textContent = this.library.movies.length;
        if (tvCount) tvCount.textContent = this.library.tv_shows.length;
        if (moviesLibCount) moviesLibCount.textContent = this.library.movies.length;
        if (tvLibCount) tvLibCount.textContent = this.library.tv_shows.length;
    }

    async addToLibrary(item) {
        if (this.readOnlyMode) {
            this.showToast('Adding items is not available in read-only mode', 'info');
            return;
        }

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
                    type: item.media_type || document.getElementById('mediaTypeSelect')?.value || 'movie'
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
            const query = document.getElementById('searchInput')?.value;
            if (query) this.performSearch(query);

        } catch (error) {
            console.error('Add error:', error);
            this.showToast(error.message || 'Failed to add to library', 'error');
        }
    }

    async removeFromLibrary(item) {
        if (this.readOnlyMode) {
            this.showToast('Removing items is not available in read-only mode', 'info');
            return;
        }

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
        // Handle different data formats (API vs static data.js)
        const title = item.title || item.name || 'Unknown Title';
        const year = item.year || (item.release_date ? item.release_date.split('-')[0] : '') || 
                     (item.first_air_date ? item.first_air_date.split('-')[0] : '');
        const rating = item.rating || item.vote_average;
        const ratingDisplay = rating ? parseFloat(rating).toFixed(1) : 'N/A';

        // Fixed poster path logic: check if it's a local asset, full URL, or TMDB path
        let posterPath = item.poster || item.poster_path || '';
        let poster = '';

        if (posterPath) {
            if (posterPath.startsWith('assets/') || posterPath.startsWith('http')) {
                poster = posterPath;
            } else if (posterPath.startsWith('/')) {
                poster = `https://image.tmdb.org/t/p/w500${posterPath}`;
            } else {
                poster = `https://image.tmdb.org/t/p/w500/${posterPath}`;
            }
        }

        const posterHTML = poster ? 
            `<img src="${poster}" alt="${title}" class="poster-image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'poster-placeholder\'>🎬</div>'">` :
            `<div class="poster-placeholder">🎬</div>`;

        // Determine button HTML based on mode
        let buttonHTML = '';

        if (this.readOnlyMode) {
            // No buttons in read-only mode
            buttonHTML = '';
        } else if (isSearch) {
            // Search results - Add button
            buttonHTML = item.in_library ? 
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
                </button>`;
        } else {
            // Library items - Remove button
            buttonHTML = `<button class="action-button remove remove-from-library w-full">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Remove</span>
            </button>`;
        }

        return `
            <div class="media-card">
                ${posterHTML}
                <div class="p-3">
                    <h3 class="font-semibold text-sm mb-1 line-clamp-2">${title}</h3>
                    <p class="text-xs text-gray-400 mb-2">${year}</p>
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-1">
                            <span class="text-yellow-400">⭐</span>
                            <span class="text-xs font-medium">${ratingDisplay}</span>
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

        if (!modal || !content) return;

        // Handle different data formats
        const title = item.title || item.name || 'Unknown Title';
        const year = item.year || (item.release_date ? item.release_date.split('-')[0] : '') || 
                     (item.first_air_date ? item.first_air_date.split('-')[0] : '');
        const rating = item.rating || item.vote_average;
        const ratingDisplay = rating ? parseFloat(rating).toFixed(1) : 'N/A';
        const overview = item.overview || 'No overview available.';
        const director = item.director || 'N/A';

        // Handle poster path
        let posterPath = item.poster || item.poster_path || '';
        let poster = '';

        if (posterPath) {
            if (posterPath.startsWith('assets/') || posterPath.startsWith('http')) {
                poster = posterPath;
            } else if (posterPath.startsWith('/')) {
                poster = `https://image.tmdb.org/t/p/w500${posterPath}`;
            } else {
                poster = `https://image.tmdb.org/t/p/w500/${posterPath}`;
            }
        }

        const posterHTML = poster ? 
            `<img src="${poster}" alt="${title}" class="w-full h-96 object-cover">` :
            `<div class="w-full h-96 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-8xl">🎬</div>`;

        // Handle genres (can be array of strings or array of objects)
        let genres = '';
        if (item.genres && Array.isArray(item.genres)) {
            genres = item.genres.map(g => {
                const genreName = typeof g === 'object' ? g.name : g;
                return `<span class="genre-tag">${genreName}</span>`;
            }).join('');
        }

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
                        <h2 class="text-3xl font-bold mb-2">${title}</h2>
                        <div class="flex items-center space-x-4 text-sm text-gray-400">
                            <span>${year || 'N/A'}</span>
                            <span>${item.runtime ? item.runtime + ' min' : ''}</span>
                            <div class="flex items-center space-x-1">
                                <span class="text-yellow-400">⭐</span>
                                <span class="font-medium">${ratingDisplay}/10</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${director !== 'N/A' ? `
                <div class="mb-4">
                    <h3 class="font-semibold mb-2">Director:</h3>
                    <p class="text-gray-300">${director}</p>
                </div>
                ` : ''}

                ${genres ? `
                <div class="mb-4">
                    <h3 class="font-semibold mb-2">Genres:</h3>
                    <div class="flex flex-wrap">${genres}</div>
                </div>
                ` : ''}

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
                                    <p class="text-xs text-gray-400">${actor.character || ''}</p>
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
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    // ========== VIEW SWITCHING ==========

    switchView(view) {
        if (this.readOnlyMode && view === 'search') {
            // Don't allow switching to search in read-only mode
            return;
        }

        this.currentView = view;

        // Update tab buttons
        document.querySelectorAll('.view-tab').forEach(btn => {
            btn.classList.remove('active');
        });

        if (view === 'search') {
            document.getElementById('searchViewBtn')?.classList.add('active');
            document.getElementById('searchView')?.classList.remove('hidden');
            document.getElementById('libraryView')?.classList.add('hidden');
        } else {
            document.getElementById('libraryViewBtn')?.classList.add('active');
            document.getElementById('searchView')?.classList.add('hidden');
            document.getElementById('libraryView')?.classList.remove('hidden');
            this.displayLibrary();
        }
    }

    switchLibraryTab(tab) {
        this.currentLibraryTab = tab;

        // Update tab buttons
        const moviesTab = document.getElementById('moviesLibTab');
        const tvTab = document.getElementById('tvLibTab');

        if (moviesTab) moviesTab.classList.remove('active');
        if (tvTab) tvTab.classList.remove('active');

        if (tab === 'movies') {
            if (moviesTab) moviesTab.classList.add('active');
        } else {
            if (tvTab) tvTab.classList.add('active');
        }

        this.displayLibrary();
    }

    // ========== TOAST NOTIFICATIONS ==========

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

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
