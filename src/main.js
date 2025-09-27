import { setupYjs } from './yjs-setup.js';
import { initToolbar } from './toolbar-actions.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const editorTextarea = document.getElementById('editor');
    const fileNameInput = document.getElementById('file-name-input'); // Get the filename input
    const themeToggleButton = document.getElementById('theme-toggle');
    const minimizeToggleButton = document.getElementById('minimize-toggle');
    const toolbar = document.getElementById('toolbar');
    const syncStatus = document.getElementById('sync-status');

    // --- Y.js Setup ---
    // Pass both the editor and the filename input to the setup function
    const { ydoc, persistence } = setupYjs(editorTextarea, fileNameInput);
    
    // --- Toolbar Setup ---
    initToolbar(editorTextarea);

    // --- Save Status UI ---
    let saveTimer = null;
    const SAVE_DELAY = 1000;

    persistence.on('synced', () => {
        syncStatus.textContent = 'Saved';
        if (saveTimer) clearTimeout(saveTimer);
    });

    ydoc.on('update', (update, origin) => {
        if (origin !== persistence) {
            syncStatus.textContent = 'Saving...';
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                syncStatus.textContent = 'Saved';
            }, SAVE_DELAY);
        }
    });

    // --- Other UI Initializations ---
    themeToggleButton.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', newTheme);
    });

    minimizeToggleButton.addEventListener('click', () => {
        toolbar.classList.toggle('minimized');
    });
});

