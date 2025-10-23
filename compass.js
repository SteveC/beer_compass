/**
 * Compass service using DeviceOrientationEvent API
 * Handles device heading and orientation
 */

class CompassService {
    constructor() {
        this.currentHeading = 0;
        this.isCalibrated = false;
        this.listeners = [];
        this.isActive = false;
        this.needsPermission = this.checkIfNeedsPermission();
    }

    /**
     * Check if device needs explicit permission (iOS 13+)
     * @returns {boolean}
     */
    checkIfNeedsPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            return true;
        }
        return false;
    }

    /**
     * Check if orientation API is supported
     * @returns {boolean}
     */
    isSupported() {
        return 'DeviceOrientationEvent' in window;
    }

    /**
     * Request permission for device orientation (iOS 13+)
     * @returns {Promise}
     */
    async requestPermission() {
        if (!this.needsPermission) {
            console.log('No permission needed for orientation');
            return Promise.resolve('granted');
        }

        console.log('Requesting orientation permission...');
        
        try {
            // Check if the permission API is available
            if (typeof DeviceOrientationEvent === 'undefined' || 
                typeof DeviceOrientationEvent.requestPermission !== 'function') {
                console.warn('DeviceOrientationEvent.requestPermission not available');
                return Promise.resolve('granted');
            }
            
            const permission = await DeviceOrientationEvent.requestPermission();
            console.log('Orientation permission result:', permission);
            
            if (permission === 'granted') {
                return 'granted';
            } else {
                throw new Error(`Orientation permission ${permission}. Please allow access when prompted.`);
            }
        } catch (error) {
            console.error('Error requesting orientation permission:', error);
            throw new Error('Failed to get orientation permission. Please refresh and allow access when prompted.');
        }
    }

    /**
     * Start listening to device orientation
     * @param {Function} callback - Called with heading updates
     */
    async start(callback) {
        if (!this.isSupported()) {
            throw new Error('Device orientation is not supported on this device/browser');
        }

        // Request permission if needed
        if (this.needsPermission) {
            try {
                await this.requestPermission();
            } catch (error) {
                console.warn('Permission request failed, trying to start anyway:', error);
                // Some devices might work without explicit permission
            }
        }

        this.isActive = true;
        
        if (callback) {
            this.listeners.push(callback);
        }

        // Listen for device orientation events
        window.addEventListener('deviceorientation', this.handleOrientation.bind(this), true);
        window.addEventListener('deviceorientationabsolute', this.handleOrientation.bind(this), true);
        
        console.log('Compass service started, listening for orientation events...');
    }

    /**
     * Handle device orientation event
     * @param {DeviceOrientationEvent} event
     */
    handleOrientation(event) {
        if (!this.isActive) return;

        let heading = null;

        // Try to get absolute heading first (more accurate)
        if (event.webkitCompassHeading !== undefined) {
            // iOS devices
            heading = event.webkitCompassHeading;
            console.log('iOS compass heading:', heading);
        } else if (event.absolute && event.alpha !== null) {
            // Android devices with absolute orientation
            heading = 360 - event.alpha;
            console.log('Android absolute heading:', heading);
        } else if (event.alpha !== null) {
            // Fallback to relative orientation
            heading = 360 - event.alpha;
            console.log('Relative heading:', heading);
        } else {
            console.log('No heading data available:', {
                alpha: event.alpha,
                webkitCompassHeading: event.webkitCompassHeading,
                absolute: event.absolute
            });
        }

        if (heading !== null) {
            this.currentHeading = BeerUtils.normalizeAngle(heading);
            
            // Mark as calibrated after first reading
            if (!this.isCalibrated) {
                this.isCalibrated = true;
                console.log('Compass calibrated with heading:', this.currentHeading);
            }

            // Notify all listeners
            this.listeners.forEach(callback => {
                callback(this.currentHeading);
            });
        }
    }

    /**
     * Stop listening to device orientation
     */
    stop() {
        this.isActive = false;
        window.removeEventListener('deviceorientation', this.handleOrientation.bind(this), true);
        window.removeEventListener('deviceorientationabsolute', this.handleOrientation.bind(this), true);
    }

    /**
     * Get current heading
     * @returns {number} Current heading in degrees (0-360)
     */
    getHeading() {
        return this.currentHeading;
    }

    /**
     * Check if compass is calibrated
     * @returns {boolean}
     */
    getCalibrationStatus() {
        return this.isCalibrated;
    }

    /**
     * Add a listener for heading updates
     * @param {Function} callback
     */
    addListener(callback) {
        if (!this.listeners.includes(callback)) {
            this.listeners.push(callback);
        }
    }

    /**
     * Remove a listener
     * @param {Function} callback
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Clear all listeners
     */
    clearListeners() {
        this.listeners = [];
    }

    /**
     * Calculate pointer rotation for a target bearing
     * @param {number} targetBearing - Bearing to target (0-360)
     * @returns {number} Rotation angle for pointer
     */
    getPointerRotation(targetBearing) {
        return BeerUtils.calculatePointerRotation(this.currentHeading, targetBearing);
    }

    /**
     * Get compass rose rotation (opposite of device heading)
     * @returns {number} Rotation angle for compass rose
     */
    getCompassRoseRotation() {
        return -this.currentHeading;
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.CompassService = CompassService;
}


