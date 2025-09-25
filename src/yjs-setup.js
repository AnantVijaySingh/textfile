import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { TextAreaBinding } from 'y-textarea';

/**
 * Initializes the Y.js document, sets up local database persistence,
 * and binds the data to the editor and title elements.
 * @param {HTMLTextAreaElement} editorTextarea - The main text editor element.
 * @param {HTMLInputElement} fileNameInput - The input for the document title.
 * @param {HTMLElement} syncStatus - The element to display save status.
 * @returns {{ ydoc: Y.Doc, ytext: Y.Text, ytitle: Y.Text }} - The initialized Y.js objects.
 */
export function setupYjs(editorTextarea, fileNameInput, syncStatus) {
    const ydoc = new Y.Doc();
    
    // Connect to the local IndexedDB database
    const persistence = new IndexeddbPersistence('textfile-me-document', ydoc);
    
    // Get the shared data types
    const ytext = ydoc.getText('editor');
    const ytitle = ydoc.getText('filename');

    // Bind the Y.js data types to our HTML elements
    new TextAreaBinding(ytext, editorTextarea);

    // --- Title and Tab Syncing Logic ---
    fileNameInput.addEventListener('input', () => {
        ytitle.delete(0, ytitle.length);
        ytitle.insert(0, fileNameInput.value);
    });

    ytitle.observe(() => {
        const newTitle = ytitle.toString() || 'Untitled.txt';
        fileNameInput.value = newTitle;
        document.title = `${newTitle} - textfile.me`;
    });
    
    // Set initial title if it's empty
    if (!ytitle.toString()) {
        ytitle.insert(0, 'Untitled.txt');
    }

    // --- Save Status Logic ---
    let saveTimer = null;
    const SAVE_DELAY = 1000;

    persistence.on('synced', () => {
        console.log('Content synced with the database.');
        syncStatus.textContent = 'Saved';
        if(saveTimer) clearTimeout(saveTimer);
    });

    ydoc.on('update', (update, origin) => {
        if (origin !== persistence) {
            syncStatus.textContent = 'Saving...';
            if(saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                syncStatus.textContent = 'Saved';
            }, SAVE_DELAY);
        }
    });

    return { ydoc, ytext, ytitle };
}
