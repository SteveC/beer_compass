/**
 * Location services using Geolocation API
 * Handles GPS coordinate acquisition and monitoring
 */

class LocationService {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.callbacks = {
            onUpdate: null,
            onError: null
        };
        this.isWatching = false;
    }

    /**
     * Check if geolocation is supported
     * @returns {boolean}
     */
    isSupported() {
        return 'geolocation' in navigator;
    }

    /**
     * Get current position once
     * @returns {Promise} Resolves with position object
     */
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!this.isSupported()) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    resolve(this.currentPosition);
                },
                (error) => {
                    reject(this.handleError(error));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Start watching position changes
     * @param {Function} onUpdate - Callback for position updates
     * @param {Function} onError - Callback for errors
     */
    startWatching(onUpdate, onError) {
        if (!this.isSupported()) {
            if (onError) onError(new Error('Geolocation is not supported'));
            return;
        }

        if (this.isWatching) {
            this.stopWatching();
        }

        this.callbacks.onUpdate = onUpdate;
        this.callbacks.onError = onError;

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                if (this.callbacks.onUpdate) {
                    this.callbacks.onUpdate(this.currentPosition);
                }
            },
            (error) => {
                const errorObj = this.handleError(error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(errorObj);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5000
            }
        );

        this.isWatching = true;
    }

    /**
     * Stop watching position changes
     */
    stopWatching() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isWatching = false;
        }
    }

    /**
     * Handle geolocation errors
     * @param {GeolocationPositionError} error
     * @returns {Error}
     */
    handleError(error) {
        let message = 'An unknown error occurred';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location permission denied. Please enable location access in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information is unavailable. Please check your GPS/network connection.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out. Please try again.';
                break;
        }

        return new Error(message);
    }

    /**
     * Get last known position
     * @returns {Object|null}
     */
    getLastPosition() {
        return this.currentPosition;
    }

    /**
     * Calculate distance to a target location
     * @param {number} targetLat
     * @param {number} targetLon
     * @returns {number|null} Distance in meters, or null if no current position
     */
    getDistanceTo(targetLat, targetLon) {
        if (!this.currentPosition) {
            return null;
        }

        return BeerUtils.calculateDistance(
            this.currentPosition.latitude,
            this.currentPosition.longitude,
            targetLat,
            targetLon
        );
    }

    /**
     * Calculate bearing to a target location
     * @param {number} targetLat
     * @param {number} targetLon
     * @returns {number|null} Bearing in degrees (0-360), or null if no current position
     */
    getBearingTo(targetLat, targetLon) {
        if (!this.currentPosition) {
            return null;
        }

        return BeerUtils.calculateBearing(
            this.currentPosition.latitude,
            this.currentPosition.longitude,
            targetLat,
            targetLon
        );
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.LocationService = LocationService;
}

