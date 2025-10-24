/**
 * OpenStreetMap data service
 * Loads bars/pubs from static data file (pre-downloaded from OSM)
 */

class OSMService {
    constructor() {
        this.allBars = [];
        this.dataLoaded = false;
        this.dataFile = 'data/bars_data.csv';
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

            const csvText = await response.text();
            this.allBars = this.parseCSV(csvText);
            this.metadata = {
                generated: new Date().toISOString(),
                total: this.allBars.length,
                source: "OpenStreetMap - CSV Format"
            };
            this.dataLoaded = true;

            console.log(`✓ Loaded ${this.allBars.length} bars from CSV data`);
            console.log(`  Generated: ${this.metadata.generated}`);
            console.log(`  Source: ${this.metadata.source}`);
        } catch (error) {
            console.error('Error loading bar data:', error);
            throw new Error('Failed to load bar database. Please ensure data/bars_data.csv is present.');
        }
    }

    /**
     * Parse CSV data into bar objects
     * @param {string} csvText - CSV content
     * @returns {Array} Array of bar objects
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const bars = [];
        
        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple CSV parsing (handles quoted fields)
            const fields = this.parseCSVLine(line);
            if (fields.length >= 3) {
                bars.push({
                    name: fields[0],
                    lat: parseFloat(fields[1]),
                    lon: parseFloat(fields[2])
                });
            }
        }
        
        return bars;
    }
    
    /**
     * Parse a single CSV line handling quoted fields
     * @param {string} line - CSV line
     * @returns {Array} Array of field values
     */
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        
        let i = 0;
        while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    // Escaped quote - add one quote to current field
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(current);
                current = '';
            } else {
                current += char;
            }
            i++;
        }
        
        fields.push(current);
        return fields;
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

        console.log('🔍 Searching for bars near:', latitude, longitude);
        console.log('📍 Search radius:', radius === 0 ? 'unlimited' : radius + 'm');

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

        console.log('🍺 Filtered bars by type:', filteredBars.length);

        // Calculate distances for all bars
        const allBarsWithDistance = filteredBars
            .map(bar => {
                const distance = BeerUtils.calculateDistance(
                    latitude,
                    longitude,
                    bar.lat,
                    bar.lon
                );

                const bearing = BeerUtils.calculateBearing(
                    latitude,
                    longitude,
                    bar.lat,
                    bar.lon
                );

                return {
                    id: bar.id || Math.random(), // Generate ID if not present (CSV format)
                    name: bar.name || 'Unnamed Bar',
                    type: bar.type || 'bar', // Default type for CSV format
                    latitude: bar.lat,
                    longitude: bar.lon,
                    distance: distance,
                    bearing: bearing,
                    address: this.formatAddress(bar.tags), // Will return empty string for CSV format
                    tags: bar.tags || {} // Empty object for CSV format
                };
            })
            .sort((a, b) => a.distance - b.distance); // Sort by distance

        // Filter by radius if specified, otherwise return all sorted by distance
        const nearbyBars = radius > 0 
            ? allBarsWithDistance.filter(bar => bar.distance <= radius)
            : allBarsWithDistance;

        if (radius > 0) {
            console.log(`Found ${nearbyBars.length} bars within ${radius}m`);
        } else {
            console.log(`Found ${nearbyBars.length} bars total, nearest is ${Math.round(allBarsWithDistance[0]?.distance || 0)}m away`);
        }

        // Show the nearest 5 bars for debugging
        if (allBarsWithDistance.length > 0) {
            console.log('🏆 Nearest 5 bars:');
            allBarsWithDistance.slice(0, 5).forEach((bar, index) => {
                console.log(`${index + 1}. ${bar.name} - ${Math.round(bar.distance)}m away (${bar.type})`);
                console.log(`   Location: ${bar.latitude}, ${bar.longitude}`);
            });
        }

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
     * @param {Object} tags - OSM tags (may be undefined for CSV format)
     * @returns {string} Formatted address
     */
    formatAddress(tags) {
        // CSV format doesn't include tags, so return empty string
        if (!tags) {
            return '';
        }
        
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

