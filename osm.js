/**
 * OpenStreetMap data service
 * Loads bars/pubs from static data file (pre-downloaded from OSM)
 */

class OSMService {
    constructor() {
        this.allBars = [];
        this.dataLoaded = false;
        this.dataFile = 'bars_data.json';
        this.metadata = null;
    }

    /**
     * Load bar data from static file
     * @returns {Promise<void>}
     */
    async loadData() {
        if (this.dataLoaded) {
            return;
        }

        try {
            const response = await fetch(this.dataFile);
            if (!response.ok) {
                throw new Error(`Failed to load data file: ${response.status}`);
            }

            const data = await response.json();
            this.metadata = data.meta;
            this.allBars = data.bars;
            this.dataLoaded = true;

            console.log(`✓ Loaded ${this.allBars.length} bars from static data`);
            console.log(`  Generated: ${this.metadata.generated}`);
            console.log(`  Source: ${this.metadata.source}`);
        } catch (error) {
            console.error('Error loading bar data:', error);
            throw new Error('Failed to load bar database. Please ensure bars_data.json is present.');
        }
    }

    /**
     * Find nearby bars from loaded data
     * @param {number} latitude - User's latitude
     * @param {number} longitude - User's longitude
     * @param {number} radius - Search radius in meters
     * @param {Object} options - Filter options
     * @returns {Promise<Array>} Array of bar/pub objects
     */
    async fetchNearbyBars(latitude, longitude, radius = 1000, options = {}) {
        // Ensure data is loaded
        if (!this.dataLoaded) {
            await this.loadData();
        }

        const {
            includeBars = true,
            includePubs = true,
            includeBiergarten = true
        } = options;

        // Filter by type
        let filteredBars = this.allBars.filter(bar => {
            if (bar.type === 'bar' && !includeBars) return false;
            if (bar.type === 'pub' && !includePubs) return false;
            if (bar.type === 'biergarten' && !includeBiergarten) return false;
            return true;
        });

        // Calculate distances and filter by radius
        const nearbyBars = filteredBars
            .map(bar => {
                const distance = BeerUtils.calculateDistance(
                    latitude,
                    longitude,
                    bar.lat,
                    bar.lon
                );

                // Only include bars within radius
                if (distance > radius) {
                    return null;
                }

                const bearing = BeerUtils.calculateBearing(
                    latitude,
                    longitude,
                    bar.lat,
                    bar.lon
                );

                return {
                    id: bar.id,
                    name: bar.name || 'Unnamed Bar',
                    type: bar.type,
                    latitude: bar.lat,
                    longitude: bar.lon,
                    distance: distance,
                    bearing: bearing,
                    address: this.formatAddress(bar.tags),
                    tags: bar.tags // Keep all metadata for future use
                };
            })
            .filter(bar => bar !== null)
            .sort((a, b) => a.distance - b.distance); // Sort by distance

        console.log(`Found ${nearbyBars.length} bars within ${radius}m`);
        return nearbyBars;
    }

    /**
     * Get metadata about the loaded data
     * @returns {Object|null} Metadata object
     */
    getMetadata() {
        return this.metadata;
    }

    /**
     * Get total number of bars in database
     * @returns {number}
     */
    getTotalBarsCount() {
        return this.allBars.length;
    }

    /**
     * Format address from OSM tags
     * @param {Object} tags - OSM tags
     * @returns {string} Formatted address
     */
    formatAddress(tags) {
        const parts = [];
        
        if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
        if (tags['addr:street']) parts.push(tags['addr:street']);
        if (tags['addr:city']) parts.push(tags['addr:city']);
        
        return parts.join(', ') || '';
    }

    /**
     * Get bar by ID
     * @param {number} id - Bar ID
     * @returns {Object|null} Bar object or null
     */
    getBarById(id) {
        return this.allBars.find(bar => bar.id === id) || null;
    }

    /**
     * Search bars by name
     * @param {string} searchTerm - Search term
     * @param {number} limit - Maximum results
     * @returns {Array} Matching bars
     */
    searchByName(searchTerm, limit = 10) {
        const term = searchTerm.toLowerCase();
        return this.allBars
            .filter(bar => bar.name && bar.name.toLowerCase().includes(term))
            .slice(0, limit);
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.OSMService = OSMService;
}

