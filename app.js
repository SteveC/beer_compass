/**
 * Main application logic for Beer Compass
 * Orchestrates location, compass, and bar data services
 */

class BeerCompass {
    constructor() {
        // Services
        this.locationService = new LocationService();
        this.compassService = new CompassService();
        this.osmService = new OSMService();

        // State
        this.currentBar = null;
        this.nearbyBars = [];
        this.isInitialized = false;

        // Settings
        this.settings = {
            searchRadius: 1000,
            includeBars: true,
            includePubs: true,
            includeBiergarten: true
        };

        // DOM elements
        this.elements = {};
        
        // Bind methods
        this.handleOrientation = this.handleOrientation.bind(this);
        this.handleLocationUpdate = this.handleLocationUpdate.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🍺 Initializing Beer Compass...');
        
        // Cache DOM elements
        this.cacheElements();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load settings from localStorage
        this.loadSettings();

        // Start initialization sequence
        try {
            await this.startInitSequence();
        } catch (error) {
            this.showError('Initialization Failed', error.message);
        }
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Screens
            loadingState: document.getElementById('loadingState'),
            errorState: document.getElementById('errorState'),
            permissionState: document.getElementById('permissionState'),
            compassView: document.getElementById('compassView'),
            
            // Loading
            loadingMessage: document.getElementById('loadingMessage'),
            
            // Error
            errorTitle: document.getElementById('errorTitle'),
            errorMessage: document.getElementById('errorMessage'),
            retryBtn: document.getElementById('retryBtn'),
            
            // Permissions
            locationPerm: document.getElementById('locationPerm'),
            compassPerm: document.getElementById('compassPerm'),
            requestPermBtn: document.getElementById('requestPermBtn'),
            
            // Compass
            compassRose: document.getElementById('compassRose'),
            beerPointer: document.getElementById('beerPointer'),
            headingDisplay: document.getElementById('headingDisplay'),
            headingValue: document.getElementById('headingValue'),
            
            // Bar info
            barInfo: document.getElementById('barInfo'),
            barName: document.getElementById('barName'),
            barDistance: document.getElementById('barDistance'),
            barType: document.getElementById('barType'),
            barAddress: document.getElementById('barAddress'),
            refreshBtn: document.getElementById('refreshBtn'),
            
            // Settings
            settingsBtn: document.getElementById('settingsBtn'),
            settingsPanel: document.getElementById('settingsPanel'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            searchRadius: document.getElementById('searchRadius'),
            includeBars: document.getElementById('includeBars'),
            includePubs: document.getElementById('includePubs'),
            includeBiergarten: document.getElementById('includeBiergarten'),
            applySettingsBtn: document.getElementById('applySettingsBtn'),
            
            // Calibration
            calibrationIndicator: document.getElementById('calibrationIndicator')
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.elements.retryBtn.addEventListener('click', () => this.retry());
        this.elements.requestPermBtn.addEventListener('click', () => this.requestPermissions());
        this.elements.refreshBtn.addEventListener('click', () => this.refresh());
        
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.elements.applySettingsBtn.addEventListener('click', () => this.applySettings());
    }

    /**
     * Start initialization sequence
     */
    async startInitSequence() {
        // Step 1: Load bar data
        this.showLoading('Loading bar database...');
        await this.osmService.loadData();
        
        // Step 2: Check browser support
        this.showLoading('Checking device capabilities...');
        const support = BeerUtils.checkBrowserSupport();
        
        if (!support.geolocation) {
            throw new Error('Your device does not support geolocation. Please use a modern browser.');
        }
        
        if (!support.orientation) {
            throw new Error('Your device does not support compass orientation. Please use a mobile device.');
        }
        
        if (!support.isSecure) {
            throw new Error('This app requires HTTPS. Please access via https:// or localhost.');
        }
        
        // Step 3: Request permissions
        await this.requestPermissions();
    }

    /**
     * Request necessary permissions
     */
    async requestPermissions() {
        this.showPermissionScreen();
        
        try {
            // Request location permission
            this.elements.locationPerm.className = 'pending';
            this.showLoading('Requesting location permission...');
            
            await this.locationService.getCurrentPosition();
            this.elements.locationPerm.className = 'granted';
            
            // Request orientation permission (especially for iOS)
            this.elements.compassPerm.className = 'pending';
            this.showLoading('Requesting compass permission...');
            
            if (this.compassService.needsPermission) {
                await this.compassService.requestPermission();
            }
            this.elements.compassPerm.className = 'granted';
            
            // Start services
            this.showLoading('Starting compass...');
            await this.startServices();
            
            // Find nearby bars
            this.showLoading('Finding nearby bars...');
            await this.findNearbyBars();
            
            // Show compass
            this.showCompass();
            this.isInitialized = true;
            
            console.log('✓ Initialization complete');
            
        } catch (error) {
            console.error('Permission error:', error);
            this.showError('Permission Denied', error.message);
        }
    }

    /**
     * Start location and compass services
     */
    async startServices() {
        // Start compass
        await this.compassService.start(this.handleOrientation);
        
        // Start watching location
        this.locationService.startWatching(
            this.handleLocationUpdate,
            (error) => {
                console.error('Location error:', error);
            }
        );
        
        // Show calibration indicator initially
        this.showCalibrationIndicator();
        setTimeout(() => this.hideCalibrationIndicator(), 5000);
    }

    /**
     * Find nearby bars based on current location
     */
    async findNearbyBars() {
        const position = this.locationService.getLastPosition();
        if (!position) {
            throw new Error('Unable to get current location');
        }

        const options = {
            includeBars: this.settings.includeBars,
            includePubs: this.settings.includePubs,
            includeBiergarten: this.settings.includeBiergarten
        };

        this.nearbyBars = await this.osmService.fetchNearbyBars(
            position.latitude,
            position.longitude,
            this.settings.searchRadius,
            options
        );

        if (this.nearbyBars.length === 0) {
            throw new Error(`No bars found within ${BeerUtils.formatDistance(this.settings.searchRadius)}. Try increasing the search radius.`);
        }

        this.currentBar = this.nearbyBars[0];
        this.updateBarInfo();
        
        console.log(`Found ${this.nearbyBars.length} bars, nearest: ${this.currentBar.name}`);
    }

    /**
     * Handle orientation updates
     * @param {number} heading - Device heading in degrees
     */
    handleOrientation(heading) {
        if (!this.currentBar) return;

        // Update heading display
        this.elements.headingValue.textContent = Math.round(heading);

        // Rotate compass rose
        const roseRotation = this.compassService.getCompassRoseRotation();
        this.elements.compassRose.style.transform = `rotate(${roseRotation}deg)`;

        // Rotate beer pointer to point at target
        const pointerRotation = this.compassService.getPointerRotation(this.currentBar.bearing);
        this.elements.beerPointer.style.transform = `rotate(${pointerRotation}deg)`;
    }

    /**
     * Handle location updates
     * @param {Object} position - Updated position
     */
    handleLocationUpdate(position) {
        if (!this.currentBar) return;

        // Recalculate distance and bearing
        this.currentBar.distance = BeerUtils.calculateDistance(
            position.latitude,
            position.longitude,
            this.currentBar.latitude,
            this.currentBar.longitude
        );

        this.currentBar.bearing = BeerUtils.calculateBearing(
            position.latitude,
            position.longitude,
            this.currentBar.latitude,
            this.currentBar.longitude
        );

        // Update display
        this.elements.barDistance.textContent = BeerUtils.formatDistance(this.currentBar.distance);
        
        // If we're very close, vibrate (if supported)
        if (this.currentBar.distance < 50 && 'vibrate' in navigator) {
            navigator.vibrate(200);
        }
    }

    /**
     * Update bar information display
     */
    updateBarInfo() {
        if (!this.currentBar) return;

        this.elements.barName.textContent = this.currentBar.name;
        this.elements.barDistance.textContent = BeerUtils.formatDistance(this.currentBar.distance);
        this.elements.barType.textContent = this.currentBar.type.charAt(0).toUpperCase() + this.currentBar.type.slice(1);
        this.elements.barAddress.textContent = this.currentBar.address || '';
        
        this.elements.barInfo.classList.add('active');
    }

    /**
     * Refresh and find bars again
     */
    async refresh() {
        try {
            this.showLoading('Refreshing...');
            await this.findNearbyBars();
            this.showCompass();
        } catch (error) {
            this.showError('Refresh Failed', error.message);
        }
    }

    /**
     * Retry initialization
     */
    async retry() {
        this.isInitialized = false;
        await this.init();
    }

    /**
     * Open settings panel
     */
    openSettings() {
        this.elements.settingsPanel.classList.add('active');
        
        // Populate current settings
        this.elements.searchRadius.value = this.settings.searchRadius;
        this.elements.includeBars.checked = this.settings.includeBars;
        this.elements.includePubs.checked = this.settings.includePubs;
        this.elements.includeBiergarten.checked = this.settings.includeBiergarten;
    }

    /**
     * Close settings panel
     */
    closeSettings() {
        this.elements.settingsPanel.classList.remove('active');
    }

    /**
     * Apply settings and refresh
     */
    async applySettings() {
        this.settings.searchRadius = parseInt(this.elements.searchRadius.value);
        this.settings.includeBars = this.elements.includeBars.checked;
        this.settings.includePubs = this.elements.includePubs.checked;
        this.settings.includeBiergarten = this.elements.includeBiergarten.checked;
        
        this.saveSettings();
        this.closeSettings();
        
        await this.refresh();
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('beerCompassSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('beerCompassSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Show loading screen
     * @param {string} message
     */
    showLoading(message) {
        this.hideAllScreens();
        this.elements.loadingMessage.textContent = message;
        this.elements.loadingState.classList.add('active');
    }

    /**
     * Show error screen
     * @param {string} title
     * @param {string} message
     */
    showError(title, message) {
        this.hideAllScreens();
        this.elements.errorTitle.textContent = title;
        this.elements.errorMessage.textContent = message;
        this.elements.errorState.classList.add('active');
    }

    /**
     * Show permission screen
     */
    showPermissionScreen() {
        this.hideAllScreens();
        this.elements.permissionState.classList.add('active');
    }

    /**
     * Show compass view
     */
    showCompass() {
        this.hideAllScreens();
        this.elements.compassView.classList.add('active');
    }

    /**
     * Hide all screens
     */
    hideAllScreens() {
        this.elements.loadingState.classList.remove('active');
        this.elements.errorState.classList.remove('active');
        this.elements.permissionState.classList.remove('active');
        this.elements.compassView.classList.remove('active');
    }

    /**
     * Show calibration indicator
     */
    showCalibrationIndicator() {
        this.elements.calibrationIndicator.classList.add('active');
    }

    /**
     * Hide calibration indicator
     */
    hideCalibrationIndicator() {
        this.elements.calibrationIndicator.classList.remove('active');
    }
}

// Initialize app when DOM is ready
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new BeerCompass();
    app.init();
});

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.BeerCompass = BeerCompass;
    window.app = app;
}


