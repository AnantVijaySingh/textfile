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

    // --- START: Auto-continue list formatting on Enter key ---
    editorTextarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const cursorPosition = editorTextarea.selectionStart;
            const text = editorTextarea.value;
            
            // Find the start of the current line
            const lineStart = text.lastIndexOf('\n', cursorPosition - 1) + 1;
            const currentLine = text.substring(lineStart, cursorPosition);
            
            const bulletPrefix = '|-> ';
            const checkboxPrefix = '[ ] ';
            const checkedCheckboxRegex = /^\[[xX]\] /; // Matches [x] or [X]

            let prefixToCarry = '';

            if (currentLine.startsWith(bulletPrefix)) {
                prefixToCarry = bulletPrefix;
            } else if (currentLine.startsWith(checkboxPrefix) || checkedCheckboxRegex.test(currentLine)) {
                prefixToCarry = checkboxPrefix; // Always carry over an unchecked box
            }
            
            if (prefixToCarry) {
                // If the current line is just the prefix, remove it and insert a newline (break out of list)
                if (currentLine.trim() === prefixToCarry.trim() || (prefixToCarry === checkboxPrefix && checkedCheckboxRegex.test(currentLine.trim() + ' '))) {
                    event.preventDefault();
                    // Replace the current line's prefix with a newline
                    editorTextarea.setRangeText('\n', lineStart, cursorPosition, 'end');
                } else {
                    // Otherwise, continue the list
                    event.preventDefault();
                    const textToInsert = `\n${prefixToCarry}`;
                    editorTextarea.setRangeText(textToInsert, cursorPosition, cursorPosition, 'end');
                }
            }
        }
    });
    // --- END: Auto-continue list formatting ---

    // --- START: Modal and Link Logic ---

    // 1. Select the new buttons and modal elements
    const githubButton = document.querySelector('button[title="GitHub Repository"]');
    const devButton = document.querySelector('button[title="Developer"]');
    const helpButton = document.querySelector('button[title="Help"]');
    const downloadButton = document.querySelector('button[title="Download as .txt"]');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalText = document.getElementById('modal-text');
    const modalCloseButton = document.getElementById('modal-close-button');

    // 2. Create functions to show and hide the modal
    const showModal = (text) => {
        modalText.textContent = text;
        modalOverlay.classList.add('visible');
    };

    const hideModal = () => {
        modalOverlay.classList.remove('visible');
    };

    // 3. Add event listeners to the buttons
    githubButton.addEventListener('click', () => {
        window.open('https://github.com/AnantVijaySingh/textfile', '_blank');
    });

    devButton.addEventListener('click', () => {
        showModal("Developed with love by Anant. Thank you for using textfile.me");
    });

    helpButton.addEventListener('click', () => {
        const helpContent = `Textfile.me is a simple, private text editor. All your data is saved automatically in your browser and is never sent to a server. It's designed to be fast, offline-ready, and distraction-free.`;
        showModal(helpContent);
    });

    downloadButton.addEventListener('click', () => {
        const textToSave = editorTextarea.value;
        const fileName = fileNameInput.value || 'Untitled.txt';
        
        // Ensure the filename ends with .txt
        const finalFileName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;

        const blob = new Blob([textToSave], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // 4. Add listeners to close the modal
    modalCloseButton.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (event) => {
        // Only close if the click is on the overlay itself, not the content
        if (event.target === modalOverlay) {
            hideModal();
        }
    });
    
    // --- END: Modal and Link Logic ---
});

