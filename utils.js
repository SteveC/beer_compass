/**
 * Utility functions for Beer Compass
 * Includes distance calculations, bearing calculations, and formatting helpers
 */

const BeerUtils = {
    /**
     * Check if device is iOS
     * @returns {boolean}
     */
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    },

    /**
     * Get approximate location description
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {string} Location description
     */
    getLocationDescription(lat, lon) {
        // Major cities in our bar database
        const cities = [
            { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
            { name: 'New York', lat: 40.7128, lon: -74.0060 },
            { name: 'London', lat: 51.5074, lon: -0.1278 },
            { name: 'Berlin', lat: 52.5200, lon: 13.4050 },
            { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
            { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
            { name: 'Paris', lat: 48.8566, lon: 2.3522 }
        ];

        let closestCity = null;
        let minDistance = Infinity;

        cities.forEach(city => {
            const distance = this.calculateDistance(lat, lon, city.lat, city.lon);
            if (distance < minDistance) {
                minDistance = distance;
                closestCity = city;
            }
        });

        if (closestCity) {
            return `You're approximately ${Math.round(minDistance / 1000)}km from ${closestCity.name}`;
        }

        return `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    },
    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - Latitude of point 1
     * @param {number} lon1 - Longitude of point 1
     * @param {number} lat2 - Latitude of point 2
     * @param {number} lon2 - Longitude of point 2
     * @returns {number} Distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δφ = this.toRadians(lat2 - lat1);
        const Δλ = this.toRadians(lon2 - lon1);

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    },

    /**
     * Calculate bearing from point A to point B
     * @param {number} lat1 - Latitude of point 1
     * @param {number} lon1 - Longitude of point 1
     * @param {number} lat2 - Latitude of point 2
     * @param {number} lon2 - Longitude of point 2
     * @returns {number} Bearing in degrees (0-360)
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δλ = this.toRadians(lon2 - lon1);

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                  Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        let bearing = Math.atan2(y, x);
        bearing = this.toDegrees(bearing);
        
        // Normalize to 0-360
        return (bearing + 360) % 360;
    },

    /**
     * Convert degrees to radians
     * @param {number} degrees
     * @returns {number} Radians
     */
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    },

    /**
     * Convert radians to degrees
     * @param {number} radians
     * @returns {number} Degrees
     */
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    },

    /**
     * Format distance for display
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance
     */
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        } else {
            return `${(meters / 1000).toFixed(1)}km`;
        }
    },

    /**
     * Normalize angle to 0-360 range
     * @param {number} angle - Angle in degrees
     * @returns {number} Normalized angle
     */
    normalizeAngle(angle) {
        angle = angle % 360;
        if (angle < 0) {
            angle += 360;
        }
        return angle;
    },

    /**
     * Get cardinal direction from bearing
     * @param {number} bearing - Bearing in degrees
     * @returns {string} Cardinal direction (N, NE, E, etc.)
     */
    getCardinalDirection(bearing) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                           'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(bearing / 22.5) % 16;
        return directions[index];
    },

    /**
     * Calculate rotation angle for pointer
     * @param {number} deviceHeading - Current device heading (0-360)
     * @param {number} targetBearing - Bearing to target (0-360)
     * @returns {number} Rotation angle for pointer
     */
    calculatePointerRotation(deviceHeading, targetBearing) {
        let rotation = targetBearing - deviceHeading;
        
        // Normalize to -180 to 180 for shortest rotation
        while (rotation > 180) rotation -= 360;
        while (rotation < -180) rotation += 360;
        
        return rotation;
    },

    /**
     * Debounce function to limit function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function to limit function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Minimum time between calls in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Check if browser supports required features
     * @returns {Object} Support status for features
     */
    checkBrowserSupport() {
        return {
            geolocation: 'geolocation' in navigator,
            orientation: 'DeviceOrientationEvent' in window,
            isSecure: window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1'
        };
    },

    /**
     * Smooth angle transition (for animations)
     * @param {number} current - Current angle
     * @param {number} target - Target angle
     * @param {number} factor - Smoothing factor (0-1)
     * @returns {number} Smoothed angle
     */
    smoothAngle(current, target, factor = 0.3) {
        let diff = target - current;
        
        // Take shortest path
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        
        return current + diff * factor;
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.BeerUtils = BeerUtils;
}


