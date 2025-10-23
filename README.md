# 🍺 Beer Compass

A web-based compass application that uses your device's orientation sensors to point you toward the nearest bar or pub using a global database from OpenStreetMap.

## Features

- 🧭 Real-time compass pointing to nearest bar/pub
- 📍 Uses device GPS and magnetometer
- 🌍 Global database of bars, pubs, and biergartens from OSM
- ⚙️ Configurable search radius (500m - 5km)
- 📱 Mobile-first design with smooth animations
- 🔒 Privacy-focused (all processing happens locally)
- 📊 Keeps all OSM metadata for future features

## Quick Start

### For Testing (Using Sample Data)

1. Rename `bars_data_sample.json` to `bars_data.json`:
   ```bash
   cp bars_data_sample.json bars_data.json
   ```

2. Serve the files using a local web server (HTTPS required for sensor access):
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Node.js http-server
   npx http-server -p 8000
   ```

3. Open `https://localhost:8000` or `http://localhost:8000` in your mobile browser

**Note**: The sample data only contains 5 test bars in major cities. For real use, generate the full database (see below).

### For Production (Full Global Database)

1. Generate the global bar database:
   ```bash
   node generate_bar_data.js
   ```
   
   This will:
   - Query OpenStreetMap Overpass API
   - Download all bars, pubs, and biergartens globally
   - Save to `bars_data.json`
   - May take 5-30 minutes depending on data size

2. Serve via HTTPS (required for device sensors):
   ```bash
   # Using a service like ngrok for HTTPS
   npx http-server -p 8000
   ngrok http 8000
   ```

3. Access via the HTTPS URL on your mobile device

## Requirements

### Browser Support
- Modern mobile browser (Chrome, Safari, Firefox)
- GPS/Location services enabled
- Magnetometer/Compass sensor (mobile devices)
- HTTPS connection (or localhost for testing)

### Permissions Required
- Location access (for GPS coordinates)
- Motion & Orientation access (for compass heading)

## File Structure

```
beer_compass/
├── index.html              # Main app interface
├── styles.css              # All styling and animations
├── app.js                  # Main application orchestration
├── compass.js              # Device orientation handling
├── location.js             # Geolocation services
├── osm.js                  # Bar data loading and filtering
├── utils.js                # Distance/bearing calculations
├── bars_data.json          # Global bar database (generated)
├── bars_data_sample.json   # Sample data for testing
├── generate_bar_data.js    # Data generation script
├── PROJECT_OUTLINE.md      # Project documentation
└── README.md               # This file
```

## How It Works

1. **Data Loading**: Loads pre-downloaded global bar database from `bars_data.json`
2. **Location**: Gets your GPS coordinates using Geolocation API
3. **Filtering**: Filters bars within your search radius
4. **Compass**: Reads device orientation using DeviceOrientationEvent API
5. **Calculation**: Calculates bearing and distance to nearest bar
6. **Display**: Rotates compass pointer to guide you

## Settings

Access settings via the ⚙️ button:

- **Search Radius**: 500m, 1km, 2km, or 5km
- **Bar Types**: Filter by bars, pubs, biergartens

## Data Generation

The `generate_bar_data.js` script downloads all bars/pubs from OpenStreetMap:

```bash
node generate_bar_data.js
```

### Troubleshooting Data Generation

If the Overpass API times out or rate-limits:

1. **Split by region**: Modify the script to query continent by continent
2. **Use GeoFabrik**: Download regional extracts from [GeoFabrik](https://download.geofabrik.de/)
3. **Local Overpass**: Set up a local Overpass API instance
4. **OSM dumps**: Process OSM planet dumps directly

### Data Format

The generated `bars_data.json` includes:

```json
{
  "meta": {
    "generated": "2025-10-23T00:00:00.000Z",
    "total": 500000,
    "source": "OpenStreetMap via Overpass API",
    "license": "ODbL (OpenStreetMap)"
  },
  "bars": [
    {
      "id": 123456,
      "name": "Bar Name",
      "type": "bar",
      "lat": 37.7749,
      "lon": -122.4194,
      "tags": {
        "amenity": "bar",
        "name": "Bar Name",
        "opening_hours": "Mo-Su 17:00-02:00",
        "addr:street": "Main Street",
        // ... all OSM tags preserved
      }
    }
  ]
}
```

## Technical Details

### Algorithms

- **Haversine Formula**: Calculates accurate distances between GPS coordinates
- **Bearing Calculation**: Determines direction to target from current position
- **Pointer Rotation**: Combines device heading with target bearing for arrow direction

### Browser APIs Used

- **Geolocation API**: GPS coordinates
- **DeviceOrientationEvent API**: Device compass heading
- **localStorage**: Settings persistence
- **Fetch API**: Loading bar database

## Privacy

- All processing happens locally on your device
- No data sent to external servers (except initial data file download)
- Location never leaves your device
- No tracking or analytics

## License

This project uses data from OpenStreetMap, licensed under [ODbL](https://opendatacommons.org/licenses/odbl/).

Code is provided as-is for educational purposes.

## Credits

- Map data © [OpenStreetMap](https://www.openstreetmap.org/) contributors
- Built with vanilla HTML, CSS, and JavaScript

## Future Enhancements

- List view of all nearby bars
- Filter by specific bar types
- Display opening hours
- Show bar details (ratings, website, etc.)
- Route directions to selected bar
- Save favorite locations
- Offline mode with service worker
- Dark mode

## Troubleshooting

### "Geolocation not supported"
- Use a modern browser on a mobile device
- Ensure location services are enabled

### "Orientation not supported"  
- Device must have a magnetometer (most smartphones)
- Try on a different device

### "Permission denied"
- Check browser settings
- Allow location and motion permissions
- iOS requires HTTPS or user interaction

### "No bars found"
- Increase search radius in settings
- Ensure `bars_data.json` is present and loaded
- Check browser console for errors

### Compass not accurate
- Calibrate by moving device in figure-8 pattern
- Move away from magnetic interference (metal, magnets)
- Ensure device is held flat/upright

---

**Happy bar hunting! 🍺🧭**


