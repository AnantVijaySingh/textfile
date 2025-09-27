import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { TextAreaBinding } from 'y-textarea';

/**
 * Initializes the Y.js document, sets up database persistence, and binds shared data types to UI elements.
 * @param {HTMLTextAreaElement} editorTextarea - The main text editor element.
 * @param {HTMLInputElement} fileNameInput - The input element for the document title.
 * @returns {{ydoc: Y.Doc, persistence: IndexeddbPersistence, ytext: Y.Text, y_filename: Y.Text}}
 */
export function setupYjs(editorTextarea, fileNameInput) {
    console.log('[DEBUG] Initializing Y.js setup...');

    const ydoc = new Y.Doc();
    const persistence = new IndexeddbPersistence('textfile-me-document', ydoc);
    
    const ytext = ydoc.getText('editor');
    
    ytext.observe((event, transaction) => {
        console.log('[DEBUG] ytext (editor) was changed.');
        console.log('  - Origin:', transaction.origin);
        console.log('  - New text length:', ytext.length);
    });

    console.log('[DEBUG] Creating TextAreaBinding...');
    new TextAreaBinding(ytext, editorTextarea);
    
    const y_filename = ydoc.getText('filename');

    // --- DEBUG: Observe changes to the filename text ---
    y_filename.observe((event, transaction) => {
        console.log('[DEBUG] y_filename (title) was changed.');
        console.log('  - Origin:', transaction.origin);
        
        // This part updates the UI
        const newName = y_filename.toString();
        if (fileNameInput.value !== newName) {
            fileNameInput.value = newName;
        }
        document.title = `${newName} - textfile.me`;
    });
    
    // --- Event listener to capture user input in the title ---
    fileNameInput.addEventListener('input', () => {
        console.log('[DEBUG] fileNameInput captured user input.');
        if (y_filename.toString() !== fileNameInput.value) {
            // THE FIX: Wrap the update in a transaction and give it a named origin.
            ydoc.transact(() => {
                y_filename.delete(0, y_filename.length);
                y_filename.insert(0, fileNameInput.value);
            }, 'user'); // This sets the transaction.origin to 'user'
        }
    });

    // --- Event listener to handle 'Enter' key ---
    fileNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevents the default action (e.g., form submission)
            editorTextarea.focus(); // Move focus to the main editor
        }
    });

    // --- NEW: Event listener to select all text on click ---
    fileNameInput.addEventListener('click', () => {
        fileNameInput.select();
    });

    persistence.on('synced', () => {
        console.log('[DEBUG] IndexedDB persistence synced.');
        if (y_filename.length === 0) {
            y_filename.insert(0, 'Untitled.txt');
        } else {
             // On initial load, make sure the UI matches the data
            const currentName = y_filename.toString();
            fileNameInput.value = currentName;
            document.title = `${currentName} - textfile.me`;
        }
    });
    
    console.log('[DEBUG] Y.js setup complete.');
    return { ydoc, persistence, ytext, y_filename };
}

