import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { TextAreaBinding } from 'y-textarea';

/**
 * Initializes the Y.js document, sets up database persistence and WebRTC synchronization,
 * and binds shared data types to UI elements.
 * @param {HTMLTextAreaElement} editorTextarea - The main text editor element.
 * @returns {{ydoc: Y.Doc, persistence: IndexeddbPersistence, provider: WebrtcProvider}}
 */
export function setupYjs(editorTextarea) {
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
        document.title = `${newName} - textfile.me`;
    });

    // --- 4. Registry for Previous Docs ---
    const updateRegistry = () => {
        let registry = [];
        try {
            registry = JSON.parse(localStorage.getItem('textfile_docs') || '[]');
        } catch (e) {
            registry = [];
        }

        const textContent = ytext.toString();
        let excerpt = textContent.slice(0, 100).replace(/\n/g, ' ');
        if (!excerpt.trim()) {
            excerpt = "Empty Document";
        }

        // Remove existing entry for this room if it exists
        registry = registry.filter(doc => doc.id !== roomName);

        // Add to the top
        registry.unshift({
            id: roomName,
            excerpt: excerpt,
            lastAccessed: Date.now()
        });

        // Keep only top 20
        if (registry.length > 20) {
            registry = registry.slice(0, 20);
        }

        localStorage.setItem('textfile_docs', JSON.stringify(registry));
    };

    let debounceTimer;
    ytext.observe(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateRegistry, 1000);
    });

    persistence.on('synced', () => {
        updateRegistry(); // Update registry on load

        console.log('[DEBUG] IndexedDB persistence synced.');
        if (y_filename.length === 0) {
            // Use the room name (without prefix) as the default title.
            const defaultTitle = roomName.startsWith('textfile-me-') 
                ? 'Untitled.txt' 
                : `${roomName}.txt`;
            y_filename.insert(0, defaultTitle);
        } else {
            const currentName = y_filename.toString();
            document.title = `${currentName} - textfile.me`;
        }
    });
    
    console.log('[DEBUG] Y.js setup complete.');
    return { ydoc, persistence, provider };
}
