/**
 * Main Application Entry Point
 * Initializes the application and coordinates modules
 */

import { UIController } from './uiController.js';
import { initTheme } from './theme.js';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const app = new UIController();
    console.log('Image Pad application initialized');
});

