// Import the necessary modules from the packages you installed
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
// You correctly identified this named export
import { TextAreaBinding } from 'y-textarea';

// Textfile.me - Main application logic will go here.
// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element Selection ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const minimizeToggleButton = document.getElementById('minimize-toggle');
    const toolbar = document.getElementById('toolbar');
    const editorTextarea = document.getElementById('editor');
    const syncStatus = document.getElementById('sync-status'); // For status updates
    
    // Get all formatting buttons
    const formatButtons = {
        h1: document.querySelector('button[title="Title"]'),
        h2: document.querySelector('button[title="Bold"]'),
        bullet: document.querySelector('button[title="Bullet List"]'),
        checkbox: document.querySelector('button[title="Checkbox List"]'),
        divider: document.querySelector('button[title="Divider"]')
    };

    // --- Y.js Setup for Local Persistence ---
    
    // 1. Create a Y.js document.
    const ydoc = new Y.Doc();
    
    // 2. Connect the document to the browser's database (IndexedDB).
    const persistence = new IndexeddbPersistence('textfile-me-document', ydoc);
    
    // 3. Handle the persistence events to update the UI status.
    let saveTimer = null; // A variable to hold our timer
    
    // This now primarily handles the initial load status.
    persistence.on('synced', () => {
        console.log('Content synced with the database.');
        syncStatus.textContent = 'Saved'; 
    });

    // This handles the status during user activity.
    ydoc.on('update', (update, origin) => {
        // Only trigger for user updates, not database loads.
        if (origin !== persistence) {
            syncStatus.textContent = 'Saving...';
            
            // Clear the previous timer to reset the delay
            clearTimeout(saveTimer);
            
            // Set a new timer that will mark as "Saved" after a pause in typing.
            saveTimer = setTimeout(() => {
                syncStatus.textContent = 'Saved';
            }, 2500); // 2.5 second delay
        }
    });


    // 4. Get a shareable text field from our document.
    const ytext = ydoc.getText('editor');
    
    // 5. Create an instance of the TextAreaBinding class to link the editor.
    const binding = new TextAreaBinding(ytext, editorTextarea);


    // --- Theme Toggling ---
    themeToggleButton.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', newTheme);
    });

    // --- Toolbar Minimization ---
    minimizeToggleButton.addEventListener('click', () => {
        toolbar.classList.toggle('minimized');
    });
    
    // --- Text Formatting Logic ---
    
    /**
     * Applies ASCII-based formatting to the selected text in the textarea.
     * @param {string} type - The type of format to apply ('h1', 'h2', 'bullet', 'checkbox', 'divider').
     */
    function applyFormat(type) {
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        // With Y.js, we get the text from the ytext object
        const fullText = ytext.toString();
        const selectedText = fullText.substring(start, end);

        // Divider is a special case as it doesn't need selected text
        if (type !== 'divider' && !selectedText) return; 

        let formattedText = '';

        switch (type) {
            case 'h1':
                // Wraps the selected line(s) in a box
                const lines = selectedText.split('\n');
                const maxLength = Math.max(...lines.map(line => line.length));
                const border = '-'.repeat(maxLength + 2);
                formattedText = `+${border}+\n`;
                lines.forEach(line => {
                    formattedText += `| ${line.padEnd(maxLength, ' ')} |\n`;
                });
                formattedText += `+${border}+`;
                break;

            case 'h2':
                // Underlines the selected line(s)
                formattedText = selectedText.split('\n').map(line => {
                    if (line.trim() === '') return line;
                    return `${line}\n${'='.repeat(line.length)}`;
                }).join('\n');
                break;

            case 'bullet':
                // Prefixes each line with a bullet
                formattedText = selectedText.split('\n')
                    .map(line => line.trim() === '' ? line : `|-> ${line}`)
                    .join('\n');
                break;
                
            case 'checkbox':
                 // Prefixes each line with an empty checkbox
                formattedText = selectedText.split('\n')
                    .map(line => line.trim() === '' ? line : `[ ] ${line}`)
                    .join('\n');
                break;

            case 'divider':
                // Inserts a divider line.
                const prevChar = fullText.substring(start - 1, start);
                const prefix = (start === 0 || prevChar === '\n' || prevChar === '') ? '' : '\n\n';
                const content = prefix + '--------------------' + '\n';
                // Instead of setRangeText, we now modify the ytext object directly
                ytext.insert(start, content);
                editorTextarea.focus();
                // We manually set the cursor position after the insert
                editorTextarea.setSelectionRange(start + content.length, start + content.length);
                return; 
        }
        
        // For text replacements, we delete the old text and insert the new formatted text
        ytext.delete(start, end - start);
        ytext.insert(start, formattedText);
        editorTextarea.focus();
        // Select the newly formatted text
        editorTextarea.setSelectionRange(start, start + formattedText.length);
    }

    // Attach event listeners to the formatting buttons
    formatButtons.h1.addEventListener('click', () => applyFormat('h1'));
    formatButtons.h2.addEventListener('click', () => applyFormat('h2'));
    formatButtons.bullet.addEventListener('click', () => applyFormat('bullet'));
    formatButtons.checkbox.addEventListener('click', () => applyFormat('checkbox'));
    formatButtons.divider.addEventListener('click', () => applyFormat('divider'));
});

