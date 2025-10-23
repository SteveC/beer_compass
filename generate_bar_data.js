#!/usr/bin/env node

/**
 * Data Generation Script for Beer Compass
 * Downloads all bars, pubs, and biergartens from OpenStreetMap globally
 * Run with: node generate_bar_data.js
 * 
 * Note: This script requires Node.js and will take some time to run.
 * The global query may need to be split into regions for very large datasets.
 */

const fs = require('fs');
const https = require('https');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OUTPUT_FILE = 'bars_data.json';

// Overpass query to get all bars, pubs, and biergartens globally
const query = `
[out:json][timeout:300];
(
  node["amenity"="bar"];
  node["amenity"="pub"];
  node["amenity"="biergarten"];
);
out body;
`.trim();

console.log('🍺 Beer Compass Data Generator');
console.log('==============================\n');
console.log('Fetching all bars, pubs, and biergartens from OpenStreetMap...');
console.log('This may take several minutes...\n');

/**
 * Make POST request to Overpass API
 */
function fetchFromOverpass(query) {
    return new Promise((resolve, reject) => {
        const postData = query;
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(OVERPASS_URL, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
                // Show progress
                process.stdout.write(`\rReceived: ${(data.length / 1024 / 1024).toFixed(2)} MB`);
            });

            res.on('end', () => {
                console.log('\n');
                if (res.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error('Failed to parse JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Process and format the data
 */
function processData(osmData) {
    console.log('Processing data...');
    
    const bars = osmData.elements
        .filter(element => element.type === 'node' && element.tags)
        .map(element => ({
            id: element.id,
            name: element.tags.name || null,
            type: element.tags.amenity,
            lat: element.lat,
            lon: element.lon,
            tags: element.tags // Keep all OSM tags
        }));

    console.log(`✓ Processed ${bars.length} establishments`);
    
    // Count by type
    const counts = bars.reduce((acc, bar) => {
        acc[bar.type] = (acc[bar.type] || 0) + 1;
        return acc;
    }, {});
    
    console.log('\nBreakdown:');
    Object.entries(counts).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
    });

    return {
        meta: {
            generated: new Date().toISOString(),
            total: bars.length,
            source: 'OpenStreetMap via Overpass API',
            license: 'ODbL (OpenStreetMap)',
            counts: counts
        },
        bars: bars
    };
}

/**
 * Save data to file
 */
function saveData(data, filename) {
    console.log(`\nSaving to ${filename}...`);
    
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filename, jsonString, 'utf8');
    
    const fileSizeMB = (fs.statSync(filename).size / 1024 / 1024).toFixed(2);
    console.log(`✓ Saved! File size: ${fileSizeMB} MB`);
}

/**
 * Main execution
 */
async function main() {
    try {
        // Fetch data
        const osmData = await fetchFromOverpass(query);
        
        // Process data
        const processedData = processData(osmData);
        
        // Save to file
        saveData(processedData, OUTPUT_FILE);
        
        console.log('\n✅ Done! Data file generated successfully.');
        console.log(`\nTo use this data, make sure ${OUTPUT_FILE} is in the same directory as your HTML file.`);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nNote: If the query times out, you may need to:');
        console.error('  1. Split the query into regional chunks');
        console.error('  2. Use a different Overpass instance');
        console.error('  3. Download from a different source (GeoFabrik, etc.)');
        process.exit(1);
    }
}

// Run the script
main();

