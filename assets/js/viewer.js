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
                console.log(`📚 Loaded ${this.movies.length} movies and ${this.tvShows.length} TV shows`);
            } else {
                console.error('❌ libraryData not found - make sure data.js is loaded before viewer.js');
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
            const movieCountEl = document.getElementById('movieCount');
            const tvCountEl = document.getElementById('tvCount');
            const moviesLibCountEl = document.getElementById('moviesLibCount');
            const tvLibCountEl = document.getElementById('tvLibCount');

            if (movieCountEl) movieCountEl.textContent = this.movies.length;
            if (tvCountEl) tvCountEl.textContent = this.tvShows.length;
            if (moviesLibCountEl) moviesLibCountEl.textContent = this.movies.length;
            if (tvLibCountEl) tvLibCountEl.textContent = this.tvShows.length;
        }

        updateLibraryTabs() {
            const moviesTab = document.getElementById('moviesLibTab');
            const tvTab = document.getElementById('tvLibTab');

            if (!moviesTab || !tvTab) return;

            const moviesSpan = moviesTab.querySelector('span');
            const tvSpan = tvTab.querySelector('span');

            if (this.currentLibraryType === 'movies') {
                moviesTab.classList.add('active');
                tvTab.classList.remove('active');
                if (moviesSpan) {
                    moviesSpan.classList.remove('bg-gray-600');
                    moviesSpan.classList.add('bg-netflix-red');
                }
                if (tvSpan) {
                    tvSpan.classList.add('bg-gray-600');
                    tvSpan.classList.remove('bg-netflix-red');
                }
            } else {
                tvTab.classList.add('active');
                moviesTab.classList.remove('active');
                if (tvSpan) {
                    tvSpan.classList.remove('bg-gray-600');
                    tvSpan.classList.add('bg-netflix-red');
                }
                if (moviesSpan) {
                    moviesSpan.classList.add('bg-gray-600');
                    moviesSpan.classList.remove('bg-netflix-red');
                }
            }
        }

        renderLibrary() {
            const grid = document.getElementById('libraryGrid');
            const loading = document.getElementById('libraryLoading');
            const empty = document.getElementById('libraryEmpty');

            if (!grid) return;

            if (loading) loading.classList.add('hidden');

            const items = this.currentLibraryType === 'movies' ? this.movies : this.tvShows;

            if (items.length === 0) {
                grid.classList.add('hidden');
                if (empty) empty.classList.remove('hidden');
                return;
            }

            if (empty) empty.classList.add('hidden');
            grid.classList.remove('hidden');

            grid.innerHTML = items.map((item, index) => this.createMediaCard(item, index)).join('');

            // Bind click events
            grid.querySelectorAll('.media-card').forEach((card) => {
                card.addEventListener('click', () => {
                    const index = parseInt(card.dataset.index);
                    const items = this.currentLibraryType === 'movies' ? this.movies : this.tvShows;
                    if (items[index]) {
                        this.showDetail(items[index]);
                    }
                });
            });
        }

        createMediaCard(item, index) {
            // Handle different possible data formats
            // From cache: title, year, rating, poster
            // From TMDB: title/name, release_date/first_air_date, vote_average, poster_path

            const title = item.title || item.name || 'Unknown Title';

            // Year can be direct or extracted from date
            let year = item.year;
            if (!year && item.release_date) {
                year = item.release_date.split('-')[0];
            }
            if (!year && item.first_air_date) {
                year = item.first_air_date.split('-')[0];
            }
            year = year || 'N/A';

            // Rating can be 'rating' or 'vote_average'
            const rating = item.rating || item.vote_average;
            const ratingDisplay = rating ? parseFloat(rating).toFixed(1) : 'N/A';

            // Poster can be local path, full URL, or TMDB path
            let posterUrl = null;
            const posterPath = item.poster || item.poster_path;

            if (posterPath) {
                if (posterPath.startsWith('http')) {
                    // Full URL
                    posterUrl = posterPath;
                } else if (posterPath.startsWith('assets/')) {
                    // Local asset path
                    posterUrl = posterPath;
                } else if (posterPath.startsWith('/')) {
                    // TMDB path starting with /
                    posterUrl = `https://image.tmdb.org/t/p/w342${posterPath}`;
                } else {
                    // TMDB path without leading /
                    posterUrl = `https://image.tmdb.org/t/p/w342/${posterPath}`;
                }
            }

            const posterHTML = posterUrl 
                ? `<img src="${posterUrl}" alt="${title}" class="poster-image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'poster-placeholder\\'>🎬</div>'">`
                : `<div class="poster-placeholder">🎬</div>`;

            return `
                <div class="media-card" data-index="${index}">
                    ${posterHTML}
                    <div class="p-3">
                        <h3 class="font-semibold text-sm truncate" title="${title}">${title}</h3>
                        <div class="flex items-center justify-between mt-1">
                            <span class="text-xs text-gray-400">${year}</span>
                            <div class="flex items-center space-x-1">
                                <span class="text-yellow-400 text-xs">⭐</span>
                                <span class="text-xs">${ratingDisplay}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        showDetail(item) {
            const modal = document.getElementById('detailModal');
            const content = document.getElementById('detailModalContent');

            if (!modal || !content) return;

            // Handle different data formats
            const title = item.title || item.name || 'Unknown Title';

            let year = item.year;
            if (!year && item.release_date) {
                year = item.release_date.split('-')[0];
            }
            if (!year && item.first_air_date) {
                year = item.first_air_date.split('-')[0];
            }
            year = year || 'N/A';

            const rating = item.rating || item.vote_average;
            const ratingDisplay = rating ? parseFloat(rating).toFixed(1) : 'N/A';
            const overview = item.overview || 'No description available.';
            const director = item.director || null;
            const runtime = item.runtime || null;
            const mediaType = item.media_type || 'movie';

            // Handle poster
            let posterUrl = null;
            const posterPath = item.poster || item.poster_path;

            if (posterPath) {
                if (posterPath.startsWith('http')) {
                    posterUrl = posterPath;
                } else if (posterPath.startsWith('assets/')) {
                    posterUrl = posterPath;
                } else if (posterPath.startsWith('/')) {
                    posterUrl = `https://image.tmdb.org/t/p/w342${posterPath}`;
                } else {
                    posterUrl = `https://image.tmdb.org/t/p/w342/${posterPath}`;
                }
            }

            // Handle backdrop
            let backdropUrl = null;
            if (item.backdrop_path) {
                backdropUrl = `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;
            }

            // Handle genres (can be array of strings or array of objects)
            let genresHTML = '';
            if (item.genres && Array.isArray(item.genres) && item.genres.length > 0) {
                genresHTML = item.genres.map(g => {
                    const genreName = typeof g === 'object' ? g.name : g;
                    return `<span class="genre-tag">${genreName}</span>`;
                }).join('');
            }

            // Handle cast
            let castHTML = '';
            if (item.cast && Array.isArray(item.cast) && item.cast.length > 0) {
                castHTML = `
                    <div class="mt-6">
                        <h3 class="font-semibold mb-3">Cast:</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                            ${item.cast.slice(0, 8).map(actor => `
                                <div class="flex items-center space-x-3 p-2 bg-netflix-dark rounded-lg">
                                    <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                                        ${(actor.name || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="font-medium text-sm truncate">${actor.name || 'Unknown'}</p>
                                        <p class="text-xs text-gray-400 truncate">${actor.character || ''}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            content.innerHTML = `
                <div class="relative">
                    ${backdropUrl 
                        ? `<div class="h-64 md:h-80 bg-cover bg-center relative" style="background-image: url('${backdropUrl}')">
                            <div class="absolute inset-0 bg-gradient-to-t from-netflix-gray via-netflix-gray/50 to-transparent"></div>
                           </div>`
                        : `<div class="h-32 bg-gradient-to-r from-netflix-red to-red-800"></div>`
                    }

                    <button onclick="viewer.closeModal()" class="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-all z-10">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div class="p-6 ${backdropUrl ? '-mt-20' : ''} relative">
                    <div class="flex flex-col md:flex-row gap-6">
                        <div class="flex-shrink-0">
                            ${posterUrl
                                ? `<img src="${posterUrl}" alt="${title}" class="w-32 md:w-48 rounded-lg shadow-2xl">`
                                : `<div class="w-32 md:w-48 aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-6xl">🎬</div>`
                            }
                        </div>

                        <div class="flex-1 min-w-0">
                            <h2 class="text-2xl md:text-3xl font-bold mb-2">${title}</h2>

                            <div class="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-400">
                                <span class="flex items-center space-x-1">
                                    <span class="text-yellow-400">⭐</span>
                                    <span>${ratingDisplay}/10</span>
                                </span>
                                <span>${year}</span>
                                ${runtime ? `<span>${runtime} min</span>` : ''}
                                <span class="px-2 py-1 bg-netflix-dark rounded text-xs uppercase">${mediaType === 'movie' ? 'Movie' : 'TV Show'}</span>
                            </div>

                            ${director ? `
                            <div class="mb-4">
                                <span class="text-gray-400">Director:</span>
                                <span class="ml-2">${director}</span>
                            </div>
                            ` : ''}

                            ${genresHTML ? `
                            <div class="mb-4">
                                ${genresHTML}
                            </div>
                            ` : ''}

                            <p class="text-gray-300 leading-relaxed">${overview}</p>

                            ${castHTML}
                        </div>
                    </div>
                </div>
            `;

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        closeModal() {
            const modal = document.getElementById('detailModal');
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }
    }

    // Initialize viewer
    const viewer = new LibraryViewer();
    