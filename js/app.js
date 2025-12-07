/**
 * Main application entry point
 * Coordinates initialization of all modules
 */

import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.4.1';
import { loadModel } from './allo-auto-classifier.js';
import { loadManifests } from './corpus-loader.js';
import { setupResultsCopyHandler } from './results-renderer.js';
import { initializeUIHandlers } from './ui-handlers.js';

// Global configs
const MAX_QUOTE_LENGTH_CHARS = 500;
const MAX_LEN = 512;

// Configure transformers to use local model only
env.allowRemoteModels = false;
env.localModelPath = '.';

/**
 * Initialize the application
 */
async function init() {
    // Update model status element
    const updateModelStatus = (text) => {
        const statusEl = document.getElementById("modelStatus");
        if (statusEl) statusEl.textContent = text;
    };

    // Start loading manifests and model in parallel
    const manifestsPromise = loadManifests();
    const modelPromise = loadModel(pipeline, updateModelStatus);

    // Setup UI handlers
    initializeUIHandlers();

    // Setup copy handler for results
    setupResultsCopyHandler();

    // Wait for async initialization
    await Promise.all([manifestsPromise, modelPromise]);

    console.log("Application initialized");
}

// Start the application when page loads
window.addEventListener("load", init);
