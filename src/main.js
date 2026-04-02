import { setupYjs } from './yjs-setup.js';

document.addEventListener('DOMContentLoaded', () => {
    const editorTextarea = document.getElementById('editor');
    
    // --- Y.js Setup ---
    const { ydoc, persistence, provider } = setupYjs(editorTextarea);

    // --- Context Menu Logic ---
    const contextMenu = document.getElementById('custom-context-menu');
    const menuNew = document.getElementById('menu-new');
    const menuCopy = document.getElementById('menu-copy');
    const menuDownload = document.getElementById('menu-download');
    const menuLink = document.getElementById('menu-link');
    const menuCode = document.getElementById('menu-code');
    const menuTheme = document.getElementById('menu-theme');
    const themeText = document.getElementById('theme-text');

    // --- Theme Setup ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeText.textContent = savedTheme === 'light' ? 'dark mode' : 'light mode';

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
        if (!contextMenu.contains(e.target)) {
            contextMenu.classList.remove('visible');
        }
    });

    // --- Actions ---
    menuNew.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        // Redirect to a new document without a hash
        window.location.hash = '';
        window.location.reload();
    });

    menuCopy.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        navigator.clipboard.writeText(editorTextarea.value).then(() => {
            // Success
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Error: Could not copy text to clipboard.');
        });
    });

    menuDownload.addEventListener('click', () => {
        contextMenu.classList.remove('visible');
        const textToSave = editorTextarea.value;
        const roomName = window.location.hash.slice(1) || 'Untitled';
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

    // Clean up WebSocket on page unload to avoid Firefox warnings
    window.addEventListener('beforeunload', () => {
        provider.destroy();
    });
});
