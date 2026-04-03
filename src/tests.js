document.addEventListener('DOMContentLoaded', () => {
    // Wait briefly for Yjs and app logic to fully initialize
    setTimeout(runTests, 1000);
});

function logTest(name, passed, errorMsg = '') {
    const list = document.getElementById('test-list');
    const li = document.createElement('li');
    li.style.marginBottom = '8px';
    
    if (passed) {
        li.innerHTML = `<span class="pass">✔ PASS</span>: ${name}`;
    } else {
        li.innerHTML = `<span class="fail">✘ FAIL</span>: ${name}<br><small style="color: #666;">${errorMsg}</small>`;
        console.error(`Test Failed: ${name}`, errorMsg);
    }
    
    list.appendChild(li);
}

function assert(condition, testName, errorMsg) {
    if (condition) {
        logTest(testName, true);
    } else {
        logTest(testName, false, errorMsg);
    }
}

async function runTests() {
    const editor = document.getElementById('editor');
    const contextMenu = document.getElementById('custom-context-menu');
    const menuTheme = document.getElementById('menu-theme');
    
    // --- Test 1: Context Menu Visibility ---
    document.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100
    }));
    
    assert(
        contextMenu.classList.contains('visible'), 
        'Context menu appears on right click', 
        'Context menu did not get the "visible" class.'
    );

    // --- Test 2: Clicking outside closes context menu ---
    document.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 500,
        clientY: 500
    }));
    
    assert(
        !contextMenu.classList.contains('visible'), 
        'Context menu hides when clicking outside', 
        'Context menu still has the "visible" class after click.'
    );

    // --- Test 3: Theme Toggle ---
    const initialTheme = document.documentElement.getAttribute('data-theme');
    
    // Open menu to click theme button
    document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
    menuTheme.click();
    
    const newTheme = document.documentElement.getAttribute('data-theme');
    assert(
        initialTheme !== newTheme, 
        'Theme toggles on button click', 
        `Theme did not change. Initial: ${initialTheme}, New: ${newTheme}`
    );

    // Revert theme for state consistency
    document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }));
    menuTheme.click();

    // --- Test 4: Typing State & Document Title ---
    // Reset state before test
    localStorage.removeItem('has_typed');
    editor.setAttribute('placeholder', 'Test Placeholder');
    editor.value = '';

    const testText = 'Hello Test';
    editor.value = testText;
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    // The has_typed logic in main.js fires immediately on input
    assert(
        localStorage.getItem('has_typed') === 'true',
        'has_typed flag is set in localStorage when typing',
        'localStorage item "has_typed" was not "true"'
    );

    assert(
        !editor.hasAttribute('placeholder'),
        'Placeholder is removed when typing starts',
        'Editor still has the placeholder attribute.'
    );

    // The title update relies on ytext observation which has a debounce and might need slight delay to process via Yjs.
    // However, Yjs observe for title is immediate now in the setup.
    // Give it a tiny tick for Yjs to sync the value change if it wasn't triggered natively by the `input` event,
    // wait, we changed the editor value programmatically but Yjs TextAreaBinding relies on native input events.
    // To ensure Yjs picks it up reliably in a test, let's wait a bit.
    
    setTimeout(() => {
        const expectedTitlePrefix = testText.slice(0, 10);
        assert(
            document.title.includes(expectedTitlePrefix),
            'Document title updates to match text',
            `Title "${document.title}" does not contain "${expectedTitlePrefix}"`
        );
        
        // --- Test 5: Document Registry Logic ---
        // updateRegistry is debounced by 1000ms. We wait >1000ms to check.
        setTimeout(() => {
            const registry = JSON.parse(localStorage.getItem('textfile_docs') || '[]');
            const currentHash = window.location.hash.slice(1);
            const foundDoc = registry.find(doc => doc.id === currentRoomOrHash(currentHash));
            
            assert(
                foundDoc && foundDoc.excerpt === testText,
                'Document excerpt is saved to local registry',
                `Registry did not contain the correct excerpt. Found: ${foundDoc ? foundDoc.excerpt : 'No doc found'}`
            );

            // Add final summary
            const passedCount = document.querySelectorAll('.pass').length;
            const totalCount = document.querySelectorAll('#test-list li').length;
            logTest(`COMPLETED: ${passedCount}/${totalCount} tests passed.`, passedCount === totalCount);
        }, 1200);

    }, 100);
}

function currentRoomOrHash(hash) {
    if (hash) return hash;
    // Fallback if hash isn't set yet during test run
    const registry = JSON.parse(localStorage.getItem('textfile_docs') || '[]');
    if (registry.length > 0) {
        return registry[0].id;
    }
    return '';
}
