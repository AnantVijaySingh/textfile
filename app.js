import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { TextAreaBinding } from 'y-textarea';

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element Selection ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const minimizeToggleButton = document.getElementById('minimize-toggle');
    const toolbar = document.getElementById('toolbar');
    const editorTextarea = document.getElementById('editor');
    const syncStatus = document.getElementById('sync-status');
    
    const formatButtons = {
        h1: document.querySelector('button[title="Title"]'),
        h2: document.querySelector('button[title="Bold"]'),
        bullet: document.querySelector('button[title="Bullet List"]'),
        checkbox: document.querySelector('button[title="Checkbox List"]'),
        divider: document.querySelector('button[title="Divider"]')
    };

    // --- Y.js Setup ---
    const ydoc = new Y.Doc();
    const persistence = new IndexeddbPersistence('textfile-me-document', ydoc);
    const ytext = ydoc.getText('editor');
    new TextAreaBinding(ytext, editorTextarea);

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

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }

    // --- UI Logic ---
    themeToggleButton.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', newTheme);
    });

    minimizeToggleButton.addEventListener('click', () => {
        toolbar.classList.toggle('minimized');
    });
    
    // --- Advanced Text Formatting Logic ---

    /**
     * Gets the text selection and intelligently expands it based on the format type.
     * For block formats, it expands to full lines.
     * For H1/H2, it checks surrounding lines to correctly identify blocks for toggling off.
     * @param {string} type - The format type ('h1', 'h2', etc.)
     * @returns {{start: number, end: number, text: string}}
     */
    function getExtendedSelection(type) {
        const fullText = editorTextarea.value;
        let start = editorTextarea.selectionStart;
        let end = editorTextarea.selectionEnd;
        const isCursor = start === end;

        // For block formats, always expand to full lines.
        if (['h1', 'h2', 'bullet', 'checkbox'].includes(type)) {
            start = fullText.lastIndexOf('\n', start - 1) + 1;
            
            // If selection ends right on a newline, we use that as the end.
            if (end > 0 && fullText[end - 1] === '\n') {
                 end = end;
            } else {
                const endOfLastSelectedLine = fullText.indexOf('\n', end);
                if (endOfLastSelectedLine !== -1) {
                    end = endOfLastSelectedLine;
                } else {
                    end = fullText.length; // Reached the end of the file
                }
            }
        }

        // If it's just a cursor (no selection), check if we're inside a format block to expand the selection for toggling.
        if (isCursor) {
            const currentLineStart = fullText.lastIndexOf('\n', start - 1) + 1;
            const currentLineEnd = fullText.indexOf('\n', start) !== -1 ? fullText.indexOf('\n', start) : fullText.length;
            const currentLine = fullText.substring(currentLineStart, currentLineEnd);

            if (type === 'h1' && currentLine.startsWith('| ') && currentLine.endsWith(' |')) {
                const prevLineStart = fullText.lastIndexOf('\n', currentLineStart - 2) + 1;
                const prevLine = fullText.substring(prevLineStart, currentLineStart - 1);
                if (prevLine.match(/^\+[-]+\+$/)) {
                    const nextLineStart = currentLineEnd + 1;
                    const nextLineEnd = fullText.indexOf('\n', nextLineStart) !== -1 ? fullText.indexOf('\n', nextLineStart) : fullText.length;
                    const nextLine = fullText.substring(nextLineStart, nextLineEnd);
                    if (nextLine.match(/^\+[-]+\+$/)) {
                        start = prevLineStart;
                        end = nextLineEnd;
                    }
                }
            } else if (type === 'h2') {
                 const nextLineStart = currentLineEnd + 1;
                 const nextLineEnd = fullText.indexOf('\n', nextLineStart) !== -1 ? fullText.indexOf('\n', nextLineStart) : fullText.length;
                 const nextLine = fullText.substring(nextLineStart, nextLineEnd);
                 if (nextLine.match(/^[=]+$/)) {
                     end = nextLineEnd;
                 }
            }
        }
        
        return { start, end, text: fullText.substring(start, end) };
    }

    function toggleFormat(type) {
        const selection = getExtendedSelection(type);
        
        const formats = {
            h1: {
                regex: /^\+[-]+\+\n((?:\| (?:.*?) \|\n)*)\+[-]+\+$/,
                apply: text => {
                    const lines = text.split('\n');
                    const maxLength = Math.max(...lines.map(line => line.length));
                    const border = '-'.repeat(maxLength + 2);
                    let result = `+${border}+\n`;
                    lines.forEach(line => {
                        if (line.trim() === '' && lines.length === 1) return; // Don't format empty single lines
                        result += `| ${line.padEnd(maxLength, ' ')} |\n`;
                    });
                    result += `+${border}+`;
                    return result;
                },
                revert: (text, match) => match[1].split('\n').map(line => line.substring(2, line.lastIndexOf(' |'))).join('\n').trim()
            },
            h2: {
                regex: /^(.*)\n([=]+)$/,
                apply: text => {
                    if (text.trim() === '') return text;
                    const lines = text.split('\n');
                    // Handle case where selection ends in a newline, creating an empty string in the array
                    if (lines[lines.length - 1] === '') lines.pop();
                    return lines.map(line => `${line}\n${'='.repeat(line.length)}`).join('\n');
                },
                revert: (text, match) => (match[1].trim().length === match[2].trim().length) ? match[1] : text
            },
            bullet: {
                regex: /^\|-> (.*)/,
                apply: text => text.split('\n').map(line => line.trim() === '' ? line : `|-> ${line}`).join('\n'),
                revert: text => text.split('\n').map(line => line.startsWith('|-> ') ? line.substring(4) : line).join('\n')
            },
            checkbox: {
                regex: /^\[ \] (.*)/,
                apply: text => text.split('\n').map(line => line.trim() === '' ? line : `[ ] ${line}`).join('\n'),
                revert: text => text.split('\n').map(line => line.startsWith('[ ] ') ? line.substring(4) : line).join('\n')
            }
        };

        if (type === 'divider') {
            const fullText = editorTextarea.value;
            const prefix = (selection.start === 0 || fullText.substring(selection.start - 1, selection.start) === '\n') ? '' : '\n\n';
            const content = prefix + '--------------------' + '\n';
            editorTextarea.setRangeText(content, selection.start, selection.start, 'end');
            editorTextarea.focus();
            return;
        }

        const format = formats[type];
        const match = selection.text.match(format.regex);
        
        let newText;
        let isFormatted = match !== null;

        if (isFormatted && type === 'h2') {
             isFormatted = match[1].trim().length === match[2].trim().length;
        }
        
        if (!isFormatted && (type === 'bullet' || type === 'checkbox')) {
            const lines = selection.text.split('\n');
            if (lines[lines.length-1].trim() === '') lines.pop();
            const allLinesFormatted = lines.every(l => l.trim() === '' || format.regex.test(l));
            if (allLinesFormatted && selection.text.trim() !== '') {
                isFormatted = true;
            }
        }

        if (isFormatted) {
            newText = format.revert(selection.text, match);
        } else {
            newText = format.apply(selection.text);
        }
        
        editorTextarea.setRangeText(newText, selection.start, selection.end, 'select');
        editorTextarea.focus();
    }

    // Attach event listeners
    formatButtons.h1.addEventListener('click', () => toggleFormat('h1'));
    formatButtons.h2.addEventListener('click', () => toggleFormat('h2'));
    formatButtons.bullet.addEventListener('click', () => toggleFormat('bullet'));
    formatButtons.checkbox.addEventListener('click', () => toggleFormat('checkbox'));
    formatButtons.divider.addEventListener('click', () => toggleFormat('divider'));
});

