import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { TextAreaBinding } from 'y-textarea';

/**
 * Initializes the Y.js document, sets up database persistence and WebRTC synchronization,
 * and binds shared data types to UI elements.
 * @param {HTMLTextAreaElement} editorTextarea - The main text editor element.
 * @param {HTMLInputElement} fileNameInput - The input element for the document title.
 * @returns {{ydoc: Y.Doc, persistence: IndexeddbPersistence, provider: WebrtcProvider}}
 */
export function setupYjs(editorTextarea, fileNameInput) {
    console.log('[DEBUG] Initializing Y.js setup...');

    // --- 1. Determine the document room name from the URL hash ---
    let roomName = window.location.hash.slice(1);
    if (!roomName) {
        // If no room name is in the URL, create a random one.
        roomName = `textfile-me-${Math.random().toString(36).substr(2, 9)}`;
        // Update the URL so it can be shared.
        window.location.hash = roomName;
    }
    console.log(`[DEBUG] Joining room: ${roomName}`);
    
    const ydoc = new Y.Doc();
    
    // --- 2. Set up IndexedDB persistence for offline editing ---
    // The key is now based on the room name, allowing for multiple documents.
    const persistence = new IndexeddbPersistence(roomName, ydoc);

    // --- 3. Set up WebRTC provider for real-time synchronization ---
    // This now points to the signaling server on the SAME domain as the website.
    const provider = new WebrtcProvider(roomName, ydoc, {
        signaling: [`wss://${window.location.host}/signaling`]
    });

    const ytext = ydoc.getText('editor');
    const y_filename = ydoc.getText('filename');
    
    new TextAreaBinding(ytext, editorTextarea);

    y_filename.observe((event, transaction) => {
        const newName = y_filename.toString();
        if (fileNameInput.value !== newName) {
            fileNameInput.value = newName;
        }
        document.title = `${newName} - textfile.me`;
    });
    
    fileNameInput.addEventListener('input', () => {
        if (y_filename.toString() !== fileNameInput.value) {
            ydoc.transact(() => {
                y_filename.delete(0, y_filename.length);
                y_filename.insert(0, fileNameInput.value);
            }, 'user');
        }
    });

    fileNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            editorTextarea.focus();
        }
    });

    fileNameInput.addEventListener('click', () => {
        fileNameInput.select();
    });

    persistence.on('synced', () => {
        console.log('[DEBUG] IndexedDB persistence synced.');
        if (y_filename.length === 0) {
            // Use the room name (without prefix) as the default title.
            const defaultTitle = roomName.startsWith('textfile-me-') 
                ? 'Untitled.txt' 
                : `${roomName}.txt`;
            y_filename.insert(0, defaultTitle);
        } else {
            const currentName = y_filename.toString();
            fileNameInput.value = currentName;
            document.title = `${currentName} - textfile.me`;
        }
    });
    
    console.log('[DEBUG] Y.js setup complete.');
    return { ydoc, persistence, provider };
}

