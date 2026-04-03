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
    
    new TextAreaBinding(ytext, editorTextarea);

    const updateTitle = () => {
        const textContent = ytext.toString().trim();
        let newTitle = textContent.slice(0, 10).replace(/\n/g, ' ');
        if (!newTitle) {
            newTitle = 'textfile.me';
        } else {
            newTitle = `${newTitle} - textfile.me`;
        }
        document.title = newTitle;
    };

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
        updateTitle();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateRegistry, 1000);
    });

    persistence.on('synced', () => {
        updateRegistry(); // Update registry on load
        updateTitle();

        console.log('[DEBUG] IndexedDB persistence synced.');
    });
    
    console.log('[DEBUG] Y.js setup complete.');
    return { ydoc, persistence, provider };
}
