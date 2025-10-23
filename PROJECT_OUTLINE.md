# Beer Compass - Project Outline

## Project Description
A web-based compass application that uses the device's orientation sensors to point users toward the nearest bar or pub. The app uses a pre-downloaded global database of bars/pubs from OpenStreetMap (OSM) stored in a static JSON file, and displays a visual compass that rotates to guide users to their destination.

## Core Features

### 1. **Geolocation**
- Request user's current GPS coordinates
- Handle permission requests
- Display loading state while acquiring location
- Error handling for denied permissions or location unavailable

### 2. **Compass/Orientation**
- Access device compass/magnetometer data
- Use DeviceOrientationEvent API for heading
- Handle both iOS and Android devices
- Calibrate compass heading with true north
- Smooth rotation animations

### 3. **Nearby Bar/Pub Finder**
- Load global bar/pub database from static JSON file
- Filter bars within configurable radius (e.g., 1km, 2km, 5km)
- All OSM data pre-downloaded with full tags/metadata
- Calculate distances to each location in real-time
- Identify the closest bar/pub
- Keep all OSM metadata (opening hours, etc.) for future features

### 4. **Visual Compass Interface**
- Circular compass design
- Arrow/pointer indicating direction to target
- Distance display to nearest bar
- Bar name display
- Cardinal direction indicators (N, S, E, W)
- Rotating compass rose or rotating arrow

### 5. **User Interface Elements**
- Current location indicator
- Target bar information card
- Distance and bearing information
- Refresh/recalculate button
- Settings (search radius, bar type filters)
- Compass calibration indicator

### 6. **Error Handling & Fallbacks**
- No geolocation support message
- No compass support message
- No bars found in radius
- API request failures
- Permission denied handling

## Technical Stack

### Frontend
- **HTML5** - Structure and semantic markup
- **CSS3** - Styling, animations, transitions
- **Vanilla JavaScript** - Core logic (no frameworks)

### APIs & Services
- **Geolocation API** - Browser native location services
- **DeviceOrientationEvent API** - Compass/magnetometer access
- **Static Data File** - Pre-downloaded global OSM bar/pub database (JSON)

### Data Source
- **OpenStreetMap** - All bar/pub data sourced from OSM
- **Pre-generated Database** - Global dataset downloaded once, stored as `bars_data.json`
- **Data Generation Script** - Node.js script to download and format OSM data

### Browser Requirements
- Modern browser with sensor access (Chrome, Safari, Firefox)
- HTTPS required for sensor permissions
- Mobile device with magnetometer recommended

## Implementation Plan

### Phase 1: Foundation & Setup
1. Create basic HTML structure
2. Set up CSS for compass layout
3. Implement geolocation acquisition
4. Add permission handling and error states

### Phase 2: Compass Functionality
1. Implement DeviceOrientationEvent listeners
2. Calculate device heading
3. Create compass visual elements
4. Add rotation animations
5. Test on iOS and Android devices

### Phase 3: Data Loading & Bar Finding
1. Load static bars_data.json file on startup
2. Filter bars by type (bar, pub, biergarten)
3. Calculate distances and bearings to each location
4. Sort by distance to find nearest establishment
5. Keep all OSM metadata available for future use

### Phase 4: Direction Calculation
1. Calculate bearing from user to target bar
2. Combine device heading with target bearing
3. Update compass pointer rotation
4. Handle coordinate system conversions

### Phase 5: UI/UX Polish
1. Design responsive compass interface
2. Add bar information display
3. Implement smooth animations
4. Add distance formatting (meters/kilometers)
5. Create settings panel
6. Add refresh functionality

### Phase 6: Testing & Optimization
1. Test on multiple devices and browsers
2. Optimize distance calculations (spatial indexing if needed)
3. Improve performance
4. Add fallbacks for unsupported features
5. Handle edge cases

### Phase 0: Data Generation (One-time setup)
1. Run `generate_bar_data.js` script to download OSM data
2. Script queries Overpass API for all global bars/pubs/biergartens
3. Generates `bars_data.json` with all establishments and metadata
4. Includes all OSM tags (opening hours, addresses, etc.)
5. Re-run periodically to update database

## File Structure
```
beer_compass/
├── index.html              # Main HTML file
├── styles.css              # All styling
├── app.js                  # Main application logic
├── compass.js              # Compass/orientation handling
├── location.js             # Geolocation services
├── osm.js                  # Bar data loading and filtering
├── utils.js                # Helper functions (distance, bearing calculations)
├── bars_data.json          # Global bar/pub database (generated)
├── bars_data_sample.json   # Sample data for testing
├── generate_bar_data.js    # Node.js script to generate bar database
└── PROJECT_OUTLINE.md      # This file
```

## Key Algorithms & Calculations

### 1. **Haversine Formula**
Calculate distance between two GPS coordinates
```
d = 2r × arcsin(√(sin²((lat2-lat1)/2) + cos(lat1) × cos(lat2) × sin²((lon2-lon1)/2)))
```

### 2. **Bearing Calculation**
Calculate initial bearing from point A to point B
```
θ = atan2(sin(Δλ) × cos(φ2), cos(φ1) × sin(φ2) - sin(φ1) × cos(φ2) × cos(Δλ))
```

### 3. **Compass Rotation**
Combine device heading with target bearing
```
rotation = targetBearing - deviceHeading
```

## Data Requirements

### From Device
- Latitude, Longitude (Geolocation API)
- Device heading/alpha (DeviceOrientationEvent)
- Device orientation support status

### From Static Database (bars_data.json)
- Bar/pub name
- Latitude, Longitude
- Type (bar, pub, biergarten)
- All OSM tags stored for future use:
  - Address components (street, housenumber, city)
  - Opening hours
  - Wheelchair accessibility
  - Outdoor seating
  - Other amenity details

### Data File Format
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
      "name": "Sample Bar",
      "type": "bar",
      "lat": 37.7749,
      "lon": -122.4194,
      "tags": { /* all OSM tags */ }
    }
  ]
}
```

## User Experience Flow

1. User opens app in mobile browser
2. App loads global bar database (bars_data.json)
3. App requests location permission → User grants
4. App acquires GPS coordinates
5. App requests motion/orientation permission → User grants
6. App filters bars within search radius from database
7. App displays compass pointing to nearest bar
8. Compass rotates as user changes orientation
9. User can refresh to recalculate or adjust search radius

## Potential Enhancements (Future)
- List view of all nearby bars
- Filter by bar type (pub, cocktail bar, sports bar)
- Save favorite locations
- Route to bar using maps
- Display bar ratings/reviews
- Night mode / theme options
- Offline mode with cached locations
- Social features (share location, check-ins)

## Challenges & Considerations

1. **HTTPS Requirement**: Sensor APIs require secure context
2. **iOS Permissions**: iOS 13+ requires user interaction for DeviceOrientationEvent
3. **Compass Accuracy**: Magnetometer can be affected by magnetic interference
4. **Battery Usage**: Continuous sensor monitoring drains battery
5. **Database Size**: Global bar database may be large (10-50MB JSON file)
6. **Initial Load Time**: Loading large JSON file on first visit
7. **Cross-browser Compatibility**: Different implementations across browsers
8. **True North vs Magnetic North**: May need declination correction
9. **Data Freshness**: Database needs periodic regeneration to stay current

## Success Metrics
- Database loads in <3 seconds on mobile
- Successfully acquires location in <3 seconds
- Compass updates smoothly (60fps)
- Accurate direction within 5-10 degrees
- Finds bars within 500m-5km radius instantly
- Works on both iOS and Android devices
- Total app initialization in <5 seconds

## Data Generation Instructions

To generate the global bar database:

1. Install Node.js
2. Run: `node generate_bar_data.js`
3. Wait for download to complete (may take 5-30 minutes depending on data size)
4. Output file: `bars_data.json`
5. Use `bars_data_sample.json` for testing without full database

**Note**: The Overpass API may timeout or rate-limit large global queries. For production, consider:
- Splitting queries by continent/region
- Using GeoFabrik extracts
- Setting up a local Overpass instance
- Downloading from OSM planet dumps

