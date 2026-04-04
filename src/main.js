import { setupYjs } from './yjs-setup.js';

document.addEventListener('DOMContentLoaded', () => {
    const editorTextarea = document.getElementById('editor');
    const drawingCanvas = document.getElementById('drawing-canvas');
    
    const isDrawing = window.location.hash.startsWith('#draw-');

    // --- Context Menu Logic ---
    const contextMenu = document.getElementById('custom-context-menu');
    const menuNewText = document.getElementById('menu-new-text');
    const menuNewDrawing = document.getElementById('menu-new-drawing');
    const menuCopy = document.getElementById('menu-copy');
    const menuDownload = document.getElementById('menu-download');
    const menuLink = document.getElementById('menu-link');
    const menuCode = document.getElementById('menu-code');
    const menuTheme = document.getElementById('menu-theme');
    const menuPrevDocs = document.getElementById('menu-prev-docs');
    const menuClearCanvas = document.getElementById('menu-clear-canvas');
    const menuClearDb = document.getElementById('menu-clear-db');
    const themeText = document.getElementById('theme-text');
    const previousDocsMenu = document.getElementById('previous-docs-menu');
    const previousDocsList = document.getElementById('previous-docs-list');

    if (isDrawing) {
        editorTextarea.style.display = 'none';
        drawingCanvas.style.display = 'block';
        menuClearCanvas.style.display = 'flex';
        
        const copySpan = menuCopy.querySelector('span:not(.shortcut)');
        if (copySpan) copySpan.textContent = 'copy image';
        
        const dlSpan = menuDownload.querySelector('span:not(.shortcut)');
        if (dlSpan) dlSpan.textContent = 'download image';
    }

    // --- Y.js Setup ---
    const { ydoc, persistence, provider } = setupYjs(editorTextarea, drawingCanvas, isDrawing);

    // --- Theme Setup ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeText.textContent = savedTheme === 'light' ? 'dark mode' : 'light mode';

    // --- Placeholder Logic ---
    if (localStorage.getItem('has_typed') === 'true') {
        editorTextarea.removeAttribute('placeholder');
    }

    editorTextarea.addEventListener('input', () => {
        if (!localStorage.getItem('has_typed') && editorTextarea.value.length > 0) {
            localStorage.setItem('has_typed', 'true');
            editorTextarea.removeAttribute('placeholder');
        }
    });

    // Show custom context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        // Remove active class from the HTML template default (if any)
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));

        const { clientX: mouseX, clientY: mouseY } = e;
        
        // Prevent menu from going off-screen
        const menuWidth = 180; // approximate
        const menuHeight = 220; // approximate
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let posX = mouseX;
        let posY = mouseY;
        
        if (mouseX + menuWidth > windowWidth) {
            posX = windowWidth - menuWidth - 10;
        }
        if (mouseY + menuHeight > windowHeight) {
            posY = windowHeight - menuHeight - 10;
        }

        contextMenu.style.left = `${posX}px`;
        contextMenu.style.top = `${posY}px`;
        contextMenu.classList.add('visible');
    });

    // Hide context menu on click outside
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target) && !previousDocsMenu.contains(e.target)) {
            contextMenu.classList.remove('visible');
            previousDocsMenu.classList.remove('visible');
        }
    });

    // --- Actions ---
    menuNewText.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        window.location.hash = '';
        window.location.reload();
    });

    menuNewDrawing.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        const drawHash = `draw-${Math.random().toString(36).substr(2, 9)}`;
        window.location.hash = drawHash;
        window.location.reload();
    });

    menuClearCanvas.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        if (confirm('Clear the entire drawing? This action cannot be undone.')) {
            const yStrokes = ydoc.getArray('drawing-strokes');
            ydoc.transact(() => {
                yStrokes.delete(0, yStrokes.length);
            });
        }
    });

    menuCopy.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        if (isDrawing) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = drawingCanvas.width;
            tempCanvas.height = drawingCanvas.height;
            const tCtx = tempCanvas.getContext('2d');
            const bgColor = getComputedStyle(drawingCanvas).backgroundColor || '#FFFFFF';
            tCtx.fillStyle = bgColor;
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(drawingCanvas, 0, 0);

            tempCanvas.toBlob(blob => {
                if (blob) {
                    try {
                        const item = new ClipboardItem({ 'image/png': blob });
                        navigator.clipboard.write([item]).then(() => {
                            // Success
                        }).catch(err => {
                            console.error('Failed to copy image: ', err);
                            alert('Error: Could not copy image to clipboard.');
                        });
                    } catch (err) {
                        console.error('ClipboardItem not supported', err);
                        alert('Error: Copying images is not supported in this browser.');
                    }
                }
            }, 'image/png');
        } else {
            navigator.clipboard.writeText(editorTextarea.value).then(() => {
                // Success
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Error: Could not copy text to clipboard.');
            });
        }
    });

    menuDownload.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        const roomName = window.location.hash.slice(1) || 'Untitled';
        
        if (isDrawing) {
            const finalFileName = roomName.startsWith('draw-') ? 'Drawing.png' : `${roomName}.png`;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = drawingCanvas.width;
            tempCanvas.height = drawingCanvas.height;
            const tCtx = tempCanvas.getContext('2d');
            const bgColor = getComputedStyle(drawingCanvas).backgroundColor || '#FFFFFF';
            tCtx.fillStyle = bgColor;
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(drawingCanvas, 0, 0);

            const url = tempCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            const textToSave = editorTextarea.value;
            const finalFileName = roomName.startsWith('textfile-me-') ? 'Untitled.txt' : `${roomName}.txt`;

            const blob = new Blob([textToSave], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFileName;
            
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    menuLink.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            // Success
        }).catch(err => {
            console.error('Failed to copy URL: ', err);
            alert('Error: Could not copy URL to clipboard.');
        });
    });

    menuCode.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        window.open('https://github.com/AnantVijaySingh/textfile', '_blank');
    });

    menuTheme.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeText.textContent = newTheme === 'light' ? 'dark mode' : 'light mode';
    });

    menuPrevDocs.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Read registry
        let registry = [];
        try {
            registry = JSON.parse(localStorage.getItem('textfile_docs') || '[]');
        } catch (err) {}

        const currentRoom = window.location.hash.slice(1);
        const filteredRegistry = registry.filter(doc => doc.id !== currentRoom);

        previousDocsList.innerHTML = '';

        if (filteredRegistry.length === 0) {
            previousDocsList.innerHTML = '<div class="no-docs-message">No previous documents found.</div>';
        } else {
            filteredRegistry.forEach(doc => {
                const item = document.createElement('div');
                item.className = 'prev-doc-item';
                
                const excerpt = document.createElement('div');
                excerpt.className = 'prev-doc-excerpt';
                excerpt.textContent = doc.excerpt;
                item.appendChild(excerpt);

                const actions = document.createElement('div');
                actions.className = 'prev-doc-actions';

                const btnOpen = document.createElement('button');
                btnOpen.className = 'prev-doc-action-btn';
                btnOpen.title = 'Open in this tab';
                btnOpen.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 21H20.4C20.7314 21 21 20.7314 21 20.4V3.6C21 3.26863 20.7314 3 20.4 3H3.6C3.26863 3 3 3.26863 3 3.6V16" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 20.5L12 12M12 12V16M12 12H8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                btnOpen.addEventListener('click', () => {
                    window.location.hash = doc.id;
                    window.location.reload();
                });

                const btnOpenNew = document.createElement('button');
                btnOpenNew.className = 'prev-doc-action-btn';
                btnOpenNew.title = 'Open in new tab';
                btnOpenNew.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 3H15M21 3L12 12M21 3V9" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H11" stroke-linecap="round"/></svg>`;
                btnOpenNew.addEventListener('click', () => {
                    window.open(`/#${doc.id}`, '_blank');
                    previousDocsMenu.classList.remove('visible');
                });

                actions.appendChild(btnOpen);
                actions.appendChild(btnOpenNew);
                item.appendChild(actions);

                previousDocsList.appendChild(item);
            });
        }

        // Position it relative to the main menu
        const menuRect = contextMenu.getBoundingClientRect();
        let posX = menuRect.right + 10;
        let posY = menuRect.top;

        if (posX + 320 > window.innerWidth) {
            posX = menuRect.left - 320 - 10; // show on left if no space
        }

        previousDocsMenu.style.left = `${posX}px`;
        previousDocsMenu.style.top = `${posY}px`;
        previousDocsMenu.classList.add('visible');
        contextMenu.classList.remove('visible'); // Hide main menu when previous docs menu opens
    });

    menuClearDb.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        if (confirm('Are you sure you want to clear ALL textfile.me documents from your local storage? This action cannot be undone unless you are still connected to peers.')) {
            let registry = [];
            try {
                registry = JSON.parse(localStorage.getItem('textfile_docs') || '[]');
            } catch (err) {}
            
            // Also include current room if not in registry yet
            const currentRoom = window.location.hash.slice(1);
            if (currentRoom && !registry.find(doc => doc.id === currentRoom)) {
                registry.push({ id: currentRoom });
            }

            registry.forEach(doc => {
                indexedDB.deleteDatabase(doc.id);
            });
            
            localStorage.removeItem('textfile_docs');
            localStorage.removeItem('has_typed');
            
            // Redirect to root
            window.location.hash = '';
            window.location.reload();
        }
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
        
        if (!cmdOrCtrl) return;

        // Cmd/Ctrl + S : Download
        if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            menuDownload.click();
            return;
        }

        if (e.altKey) {
            // Cmd/Ctrl + Alt + N : New Text
            if (e.code === 'KeyN') {
                e.preventDefault();
                menuNewText.click();
                return;
            }
            // Cmd/Ctrl + Alt + Y : New Drawing
            if (e.code === 'KeyY') {
                e.preventDefault();
                menuNewDrawing.click();
                return;
            }
        }

        if (e.shiftKey) {
            switch(e.code) {
                case 'KeyX':
                    e.preventDefault();
                    if (isDrawing) menuClearCanvas.click();
                    break;
                case 'KeyC':
                    e.preventDefault();
                    menuCopy.click();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    menuLink.click();
                    break;
                case 'KeyG':
                    e.preventDefault();
                    menuCode.click();
                    break;
                case 'KeyD':
                    e.preventDefault();
                    menuTheme.click();
                    break;
                case 'KeyO':
                    e.preventDefault();
                    menuPrevDocs.click();
                    break;
            }
        }
    });

    // Clean up WebSocket on page unload to avoid Firefox warnings
    window.addEventListener('beforeunload', () => {
        provider.destroy();
    });
});
