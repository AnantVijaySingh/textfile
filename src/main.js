import { setupYjs } from './yjs-setup.js';
import { initializeToolbar } from './toolbar-actions.js';

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element Selection ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const minimizeToggleButton = document.getElementById('minimize-toggle');
    const toolbar = document.getElementById('toolbar');
    const editorTextarea = document.getElementById('editor');
    const fileNameInput = document.getElementById('file-name-input');
    const syncStatus = document.getElementById('sync-status');
    
    const formatButtons = {
        h1: document.querySelector('button[title="Title"]'),
        h2: document.querySelector('button[title="Bold"]'),
        bullet: document.querySelector('button[title="Bullet List"]'),
        checkbox: document.querySelector('button[title="Checkbox List"]'),
        divider: document.querySelector('button[title="Divider"]')
    };

    // --- Initialize Modules ---
    
    // Set up the Y.js document, persistence, and data bindings
    const { ydoc, ytext, ytitle } = setupYjs(editorTextarea, fileNameInput, syncStatus);

    // Attach event listeners to the formatting toolbar
    initializeToolbar(formatButtons, editorTextarea);


    // --- General UI Logic ---

    // Theme Toggling
    themeToggleButton.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', newTheme);
    });

    // Toolbar Minimization
    minimizeToggleButton.addEventListener('click', () => {
        toolbar.classList.toggle('minimized');
    });

});
