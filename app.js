// Textfile.me - Main application logic will go here.
// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element Selection ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const minimizeToggleButton = document.getElementById('minimize-toggle');
    const toolbar = document.getElementById('toolbar');
    const editorTextarea = document.getElementById('editor');
    
    // Get all formatting buttons
    const formatButtons = {
        h1: document.querySelector('button[title="Title"]'),
        h2: document.querySelector('button[title="Bold"]'),
        bullet: document.querySelector('button[title="Bullet List"]'),
        checkbox: document.querySelector('button[title="Checkbox List"]'),
        divider: document.querySelector('button[title="Divider"]')
    };

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
        const selectedText = editorTextarea.value.substring(start, end);

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
                // Inserts a divider line. We don't need selected text for this.
                const currentText = editorTextarea.value;
                const prevChar = currentText.substring(start - 1, start);
                const prefix = (start === 0 || prevChar === '\n' || prevChar === '') ? '' : '\n\n';
                formattedText = prefix + '--------------------' + '\n';
                editorTextarea.setRangeText(formattedText, start, start, 'end');
                editorTextarea.focus();
                return; 
        }
        
        // Replace the original text with the formatted text
        editorTextarea.setRangeText(formattedText, start, end, 'select');
        editorTextarea.focus();
    }

    // Attach event listeners to the formatting buttons
    formatButtons.h1.addEventListener('click', () => applyFormat('h1'));
    formatButtons.h2.addEventListener('click', () => applyFormat('h2'));
    formatButtons.bullet.addEventListener('click', () => applyFormat('bullet'));
    formatButtons.checkbox.addEventListener('click', () => applyFormat('checkbox'));
    formatButtons.divider.addEventListener('click', () => applyFormat('divider'));
});

