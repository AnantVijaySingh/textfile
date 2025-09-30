import { setupYjs } from './yjs-setup.js';
import { initToolbar } from './toolbar-actions.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const editorTextarea = document.getElementById('editor');
    const fileNameInput = document.getElementById('file-name-input');
    const themeToggleButton = document.getElementById('theme-toggle');
    const minimizeToggleButton = document.getElementById('minimize-toggle');
    const toolbar = document.getElementById('toolbar');
    const syncStatus = document.getElementById('sync-status');
    const syncButton = document.querySelector('button[title="Sync Devices"]'); // New element selected

    // --- Y.js Setup ---
    // The provider is now returned from the setup function
    const { ydoc, persistence, provider } = setupYjs(editorTextarea, fileNameInput);
    
    // --- Toolbar Setup ---
    initToolbar(editorTextarea);

    // --- START: Update Sync Status UI ---
    // This entire section replaces the old "Save Status UI"
    const updateSyncStatus = () => {
        if (provider.synced) {
            const peerCount = provider.awareness.getStates().size;
            syncStatus.textContent = `${peerCount} ${peerCount === 1 ? 'peer' : 'peers'}`;
        } else {
            syncStatus.textContent = 'connecting...';
        }
    };
    
    // Listen for connection status changes
    provider.on('status', updateSyncStatus);
    // Listen for when other users (peers) join or leave
    provider.awareness.on('update', updateSyncStatus);

    // The old save timer logic is no longer needed, as sync is now real-time.
    // --- END: Update Sync Status UI ---


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

    editorTextarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const cursorPosition = editorTextarea.selectionStart;
            const text = editorTextarea.value;
            
            const lineStart = text.lastIndexOf('\n', cursorPosition - 1) + 1;
            const currentLine = text.substring(lineStart, cursorPosition);

            // --- Case 1: Unordered Lists (|-> ) ---
            const bulletPrefix = '|-> ';
            if (currentLine.startsWith(bulletPrefix)) {
                event.preventDefault();
                if (currentLine.trim() === bulletPrefix.trim()) {
                    editorTextarea.setRangeText('\n', lineStart, cursorPosition, 'end'); // Break out
                } else {
                    editorTextarea.setRangeText(`\n${bulletPrefix}`, cursorPosition, cursorPosition, 'end'); // Continue
                }
                return; 
            }

            // --- Case 2: Checkbox Lists ([ ], [x]) ---
            const checkboxPrefix = '[ ] ';
            const checkedCheckboxRegex = /^\[[xX]\] /;
            if (currentLine.startsWith(checkboxPrefix) || checkedCheckboxRegex.test(currentLine)) {
                event.preventDefault();
                if (currentLine.trim() === checkboxPrefix.trim() || checkedCheckboxRegex.test(currentLine.trim() + ' ')) {
                    editorTextarea.setRangeText('\n', lineStart, cursorPosition, 'end'); // Break out
                } else {
                    editorTextarea.setRangeText(`\n${checkboxPrefix}`, cursorPosition, cursorPosition, 'end'); // Continue
                }
                return;
            }
            
            // --- Case 3: Ordered Lists (1., 2.) ---
            const orderedListRegex = /^(\d+)\.\s/;
            const orderedMatch = currentLine.match(orderedListRegex);
            if (orderedMatch) {
                event.preventDefault();
                if (currentLine.trim() === orderedMatch[0].trim()) {
                    editorTextarea.setRangeText('\n', lineStart, cursorPosition, 'end'); // Break out
                } else {
                    const currentNumber = parseInt(orderedMatch[1], 10);
                    const nextPrefix = `${currentNumber + 1}. `;
                    editorTextarea.setRangeText(`\n${nextPrefix}`, cursorPosition, cursorPosition, 'end'); // Continue
                }
                return;
            }
        }
    });

    // --- START: Modal and Link Logic (with Sync Button update) ---

    // 1. Select the buttons and modal elements
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
    syncButton.addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            const originalText = syncStatus.textContent;
            syncStatus.textContent = 'Copied!';
            setTimeout(() => {
                updateSyncStatus(); // Restore the peer count status
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy URL: ', err);
            // We can't use alert, so we'll show a modal for the error
            showModal('Error: Could not copy URL to clipboard.');
        });
    });

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
        if (event.target === modalOverlay) {
            hideModal();
        }
    });
    
    // --- END: Modal and Link Logic ---
});

