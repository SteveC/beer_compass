#!/usr/bin/env node

/**
 * Bar Data Generator for Beer Compass
 * Downloads bar/pub/biergarten data from OpenStreetMap via Overpass API
 * 
 * Usage: node generate_bar_data.js
 */

const fs = require('fs');
const https = require('https');

class BarDataGenerator {
    constructor() {
        this.outputFile = 'bars_data.json';
        this.overpassUrl = 'https://overpass-api.de/api/interpreter';
        this.timeout = 30000; // 30 seconds
        this.maxRetries = 3;
    }

    /**
     * Generate the Overpass QL query for bars/pubs/biergartens
     */
    generateQuery() {
        return `
[out:json][timeout:${this.timeout}];
(
  node["amenity"="bar"]({{bbox}});
  node["amenity"="pub"]({{bbox}});
  node["amenity"="biergarten"]({{bbox}});
  way["amenity"="bar"]({{bbox}});
  way["amenity"="pub"]({{bbox}});
  way["amenity"="biergarten"]({{bbox}});
  relation["amenity"="bar"]({{bbox}});
  relation["amenity"="pub"]({{bbox}});
  relation["amenity"="biergarten"]({{bbox}});
);
out center meta;
        `.trim();
    }

    /**
     * Generate query for a specific bounding box
     */
    generateBoundingBoxQuery(minLat, minLon, maxLat, maxLon) {
        const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
        return this.generateQuery().replace('{{bbox}}', bbox);
    }

    /**
     * Make HTTP request to Overpass API
     */
    async makeOverpassRequest(query) {
        return new Promise((resolve, reject) => {
            const postData = `data=${encodeURIComponent(query)}`;
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: this.timeout
            };

            const req = https.request(this.overpassUrl, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Download data for a specific region
     */
    async downloadRegion(minLat, minLon, maxLat, maxLon, regionName) {
        console.log(`Downloading data for ${regionName}...`);
        
        const query = this.generateBoundingBoxQuery(minLat, minLon, maxLat, maxLon);
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                const data = await this.makeOverpassRequest(query);
                console.log(`✓ ${regionName}: Found ${data.elements.length} establishments`);
                return data;
            } catch (error) {
                retries++;
                console.log(`✗ ${regionName}: Attempt ${retries} failed: ${error.message}`);
                
                if (retries >= this.maxRetries) {
                    throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000 * retries));
            }
        }
    }

    /**
     * Process OSM elements into our bar format
     */
    processElements(elements) {
        return elements.map(element => {
            let lat, lon, name, type, tags = {};
            
            // Handle different element types (node, way, relation)
            if (element.type === 'node') {
                lat = element.lat;
                lon = element.lon;
            } else if (element.type === 'way') {
                lat = element.center.lat;
                lon = element.center.lon;
            } else if (element.type === 'relation') {
                lat = element.center.lat;
                lon = element.center.lon;
            }
            
            // Extract tags
            if (element.tags) {
                tags = element.tags;
                name = tags.name || tags['name:en'] || 'Unnamed Establishment';
                
                // Determine type
                if (tags.amenity === 'bar') type = 'bar';
                else if (tags.amenity === 'pub') type = 'pub';
                else if (tags.amenity === 'biergarten') type = 'biergarten';
                else type = 'bar'; // fallback
            }
            
            return {
                id: element.id,
                name: name,
                type: type,
                lat: lat,
                lon: lon,
                tags: tags
            };
        }).filter(bar => bar.lat && bar.lon); // Filter out invalid coordinates
    }

    /**
     * Generate sample data for testing
     */
    generateSampleData() {
        console.log('Generating sample data for testing...');
        
        const sampleBars = [
            {
                id: 1,
                name: "The Golden Pint",
                type: "bar",
                lat: 37.7749,
                lon: -122.4194,
                tags: {
                    "amenity": "bar",
                    "name": "The Golden Pint",
                    "addr:street": "Market Street",
                    "addr:housenumber": "123",
                    "addr:city": "San Francisco",
                    "opening_hours": "Mo-Su 17:00-02:00",
                    "wheelchair": "yes"
                }
            },
            {
                id: 2,
                name: "Red Lion Pub",
                type: "pub",
                lat: 37.7849,
                lon: -122.4094,
                tags: {
                    "amenity": "pub",
                    "name": "Red Lion Pub",
                    "addr:street": "Mission Street",
                    "addr:housenumber": "456",
                    "addr:city": "San Francisco",
                    "opening_hours": "Mo-Su 11:00-23:00",
                    "food": "yes"
                }
            },
            {
                id: 3,
                name: "Beer Garden Munich",
                type: "biergarten",
                lat: 37.7649,
                lon: -122.4294,
                tags: {
                    "amenity": "biergarten",
                    "name": "Beer Garden Munich",
                    "addr:street": "Castro Street",
                    "addr:housenumber": "789",
                    "addr:city": "San Francisco",
                    "opening_hours": "Mo-Su 12:00-22:00",
                    "outdoor_seating": "yes"
                }
            }
        ];

        const data = {
            meta: {
                generated: new Date().toISOString(),
                total: sampleBars.length,
                source: "Sample Data for Testing",
                license: "Sample Data"
            },
            bars: sampleBars
        };

        return data;
    }

    /**
     * Download data for major cities/regions
     */
    async downloadGlobalData() {
        console.log('Downloading global bar data from OpenStreetMap...');
        console.log('This may take several minutes depending on data size...\n');
        
        // Define regions to download (major cities/areas)
        const regions = [
            { name: "San Francisco Bay Area", minLat: 37.4, minLon: -122.8, maxLat: 38.2, maxLon: -121.8 },
            { name: "New York City", minLat: 40.5, minLon: -74.3, maxLat: 40.9, maxLon: -73.7 },
            { name: "London", minLat: 51.3, minLon: -0.6, maxLat: 51.7, maxLon: 0.2 },
            { name: "Berlin", minLat: 52.3, minLon: 13.0, maxLat: 52.7, maxLon: 13.8 },
            { name: "Tokyo", minLat: 35.5, minLon: 139.4, maxLat: 35.8, maxLon: 139.9 },
            { name: "Sydney", minLat: -33.9, minLon: 151.1, maxLat: -33.7, maxLon: 151.4 }
        ];

        let allElements = [];
        
        for (const region of regions) {
            try {
                const data = await this.downloadRegion(
                    region.minLat, 
                    region.minLon, 
                    region.maxLat, 
                    region.maxLon, 
                    region.name
                );
                allElements = allElements.concat(data.elements);
            } catch (error) {
                console.error(`Failed to download ${region.name}: ${error.message}`);
                // Continue with other regions
            }
        }

        return allElements;
    }

    /**
     * Generate the complete database
     */
    async generate() {
        console.log('🍺 Beer Compass - Bar Data Generator\n');
        
        try {
            // Check if we want to generate sample data or real data
            const args = process.argv.slice(2);
            const useSample = args.includes('--sample') || args.includes('-s');
            
            let data;
            
            if (useSample) {
                console.log('Generating sample data for testing...\n');
                data = this.generateSampleData();
            } else {
                // Download real data
                const elements = await this.downloadGlobalData();
                
                console.log(`\nProcessing ${elements.length} elements...`);
                const bars = this.processElements(elements);
                
                console.log(`Processed ${bars.length} valid bars/pubs/biergartens`);
                
                data = {
                    meta: {
                        generated: new Date().toISOString(),
                        total: bars.length,
                        source: "OpenStreetMap via Overpass API",
                        license: "ODbL (OpenStreetMap)"
                    },
                    bars: bars
                };
            }
            
            // Write to file
            console.log(`\nWriting data to ${this.outputFile}...`);
            fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2));
            
            console.log(`✓ Successfully generated ${this.outputFile}`);
            console.log(`  Total establishments: ${data.meta.total}`);
            console.log(`  Generated: ${data.meta.generated}`);
            console.log(`  File size: ${(fs.statSync(this.outputFile).size / 1024 / 1024).toFixed(2)} MB`);
            
        } catch (error) {
            console.error('❌ Generation failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the generator
if (require.main === module) {
    const generator = new BarDataGenerator();
    generator.generate();
}

module.exports = BarDataGenerator;
