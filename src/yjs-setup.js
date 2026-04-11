import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { TextAreaBinding } from 'y-textarea';
import { parseMarkdown } from './markdown-parser.js';

/**
 * Initializes the Y.js document, sets up database persistence and WebRTC synchronization,
 * and binds shared data types to UI elements.
 * @param {HTMLTextAreaElement} editorTextarea - The main text editor element.
 * @returns {{ydoc: Y.Doc, persistence: IndexeddbPersistence, provider: WebrtcProvider}}
 */
export function setupYjs(editorTextarea, drawingCanvas, isDrawing) {
    // --- 1. Determine the document room name from the URL hash ---
    let roomName = window.location.hash.slice(1);
    if (!roomName) {
        // If no room name is in the URL, create a random one.
        roomName = `textfile-me-${Math.random().toString(36).substr(2, 9)}`;
        // Update the URL so it can be shared.
        window.location.hash = roomName;
    }
    
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
    const yStrokes = ydoc.getArray('drawing-strokes');
    
    if (!isDrawing) {
        new TextAreaBinding(ytext, editorTextarea);
    }

    // --- Canvas Drawing Logic ---
    if (isDrawing && drawingCanvas) {
        const ctx = drawingCanvas.getContext('2d');
        let currentStroke = null;
        
        const renderStrokes = () => {
            ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            const defaultColor = theme === 'dark' ? '#FFFFFF' : '#000000';

            yStrokes.forEach(strokeMap => {
                const points = strokeMap.get('points');
                const color = strokeMap.get('color') || defaultColor;
                
                if (!points || points.length === 0) return;
                
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(points.get(0)[0], points.get(0)[1]);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points.get(i)[0], points.get(i)[1]);
                }
                ctx.stroke();
            });
        };

        const resizeCanvas = () => {
            const rect = drawingCanvas.getBoundingClientRect();
            drawingCanvas.width = rect.width;
            drawingCanvas.height = rect.height;
            renderStrokes();
        };
        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 0); // initial resize

        yStrokes.observeDeep(() => {
            renderStrokes();
        });
        
        const observer = new MutationObserver(() => renderStrokes());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        // Local interactions
        let isPointersDown = false;
        
        const getPointerPos = (e) => {
            const rect = drawingCanvas.getBoundingClientRect();
            let clientX = e.clientX;
            let clientY = e.clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            return [clientX - rect.left, clientY - rect.top];
        };

        const startDrawing = (e) => {
            e.preventDefault();
            isPointersDown = true;
            const pos = getPointerPos(e);
            
            const stroke = new Y.Map();
            const points = new Y.Array();
            points.push([pos]);
            stroke.set('points', points);
            
            ydoc.transact(() => {
                yStrokes.push([stroke]);
            });
            currentStroke = stroke;
        };

        const continueDrawing = (e) => {
            if (!isPointersDown || !currentStroke) return;
            e.preventDefault();
            const pos = getPointerPos(e);
            const points = currentStroke.get('points');
            ydoc.transact(() => {
                points.push([pos]);
            });
        };

        const endDrawing = (e) => {
            if (!isPointersDown) return;
            e.preventDefault();
            isPointersDown = false;
            currentStroke = null;
        };

        drawingCanvas.addEventListener('mousedown', startDrawing);
        drawingCanvas.addEventListener('mousemove', continueDrawing);
        window.addEventListener('mouseup', endDrawing);

        drawingCanvas.addEventListener('touchstart', startDrawing, { passive: false });
        drawingCanvas.addEventListener('touchmove', continueDrawing, { passive: false });
        window.addEventListener('touchend', endDrawing);
    }

    const updateTitle = () => {
        let newTitle;
        if (isDrawing) {
            newTitle = 'Drawing - textfile.me';
        } else {
            const textContent = ytext.toString().trim();
            newTitle = textContent.slice(0, 10).replace(/\n/g, ' ');
            if (!newTitle) {
                newTitle = 'textfile.me';
            } else {
                newTitle = `${newTitle} - textfile.me`;
            }
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

        let excerpt = "";
        let type = "text";
        if (isDrawing) {
            type = "drawing";
            excerpt = "Drawing Workspace";
        } else {
            const textContent = ytext.toString();
            excerpt = textContent.slice(0, 100).replace(/\n/g, ' ');
            if (!excerpt.trim()) {
                excerpt = "Empty Document";
            }
        }

        // Remove existing entry for this room if it exists
        registry = registry.filter(doc => doc.id !== roomName);

        // Add to the top
        registry.unshift({
            id: roomName,
            type: type,
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
    let renderFrame;
    const triggerUpdate = () => {
        updateTitle();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateRegistry, 1000);

        if (!isDrawing) {
            cancelAnimationFrame(renderFrame);
            renderFrame = requestAnimationFrame(() => {
                const editorHighlight = document.getElementById('editor-highlight');
                if (editorHighlight) {
                    const isMdOn = document.documentElement.getAttribute('data-markdown') !== 'off';
                    editorHighlight.innerHTML = parseMarkdown(ytext.toString(), isMdOn);
                }
            });
        }
    };

    window.addEventListener('markdown-toggled', triggerUpdate);

    if (isDrawing) {
        yStrokes.observeDeep(triggerUpdate);
    } else {
        ytext.observe(triggerUpdate);
    }

    persistence.on('synced', () => {
        updateRegistry(); // Update registry on load
        updateTitle();
    });
    
    return { ydoc, persistence, provider };
}
