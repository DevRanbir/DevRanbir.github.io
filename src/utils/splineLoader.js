/**
 * Centralized Spline Viewer Script Loader
 * Ensures the spline-viewer custom element is only registered once
 */

let isLoading = false;
let isLoaded = false;
const loadPromises = [];

/**
 * Load the Spline viewer script
 * @returns {Promise<boolean>} - Returns true if loaded successfully, false otherwise
 */
export const loadSplineScript = () => {
  // If already loaded, return immediately
  if (isLoaded) {
    return Promise.resolve(true);
  }

  // If currently loading, return the existing promise
  if (isLoading) {
    return new Promise((resolve) => {
      loadPromises.push(resolve);
    });
  }

  // Check if the custom element is already defined
  if (customElements.get('spline-viewer')) {
    isLoaded = true;
    return Promise.resolve(true);
  }

  // Check if script is already in the DOM
  const existingScript = document.querySelector('script[src*="spline-viewer"]');
  if (existingScript) {
    isLoaded = true;
    return Promise.resolve(true);
  }

  // Start loading
  isLoading = true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.10.86/build/spline-viewer.js';
    
    script.onload = () => {
      isLoading = false;
      isLoaded = true;
      
      // Resolve all waiting promises
      loadPromises.forEach(promiseResolve => promiseResolve(true));
      loadPromises.length = 0;
      
      resolve(true);
      console.log('✅ Spline viewer script loaded successfully');
    };
    
    script.onerror = () => {
      isLoading = false;
      
      // Reject all waiting promises
      loadPromises.forEach(promiseResolve => promiseResolve(false));
      loadPromises.length = 0;
      
      resolve(false);
      console.warn('⚠️ Failed to load Spline viewer script');
    };
    
    document.head.appendChild(script);
  });
};

/**
 * Check if Spline viewer is loaded
 * @returns {boolean}
 */
export const isSplineLoaded = () => {
  return isLoaded || customElements.get('spline-viewer') !== undefined;
};

/**
 * Reset the loader state (useful for testing)
 */
export const resetSplineLoader = () => {
  isLoading = false;
  isLoaded = false;
  loadPromises.length = 0;
};
