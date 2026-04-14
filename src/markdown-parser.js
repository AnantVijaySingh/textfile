/**
 * Ultra-fast Markdown parser that runs synchronously on the main thread.
 * Designed to process standard-sized documents (< 5,000 words) with < 2ms execution time,
 * completely avoiding TTI impact without needing a Web Worker.
 */

// Escape HTML to prevent XSS and correctly display user's literal < and > characters
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export function parseMarkdown(text, enabled = true) {
    if (!text) return '';

    // Step 1: Escape all user input safely
    let html = escapeHtml(text);

    if (enabled) {
        // Step 2: Apply ultra-fast Regex substitutions for markdown syntax

        // Headings (e.g. ## Heading)
        html = html.replace(/^(#{1,6})\s+(.*)$/gm, '<span class="md-h">$1 $2</span>');

        // Quote (e.g. > quote) - > is escaped to &gt;
        html = html.replace(/^(\s*)&gt;\s+(.*)$/gm, '<span class="md-quote">$1&gt; $2</span>');

        // Task Lists (Incomplete: - [ ] or * [ ])
        html = html.replace(/^(\s*[-*]\s*\[ \])\s+(.*)$/gm, '<span class="md-task-open">$1</span> $2');

        // Task Lists (Complete: - [x] or * [X])
        html = html.replace(/^(\s*[-*]\s*\[[xX]\])\s+(.*)$/gm, '<span class="md-task-done">$1 $2</span>');

        // Multi-line Code (e.g. ```code```) - Must run before single-line code
        html = html.replace(/```([\s\S]*?)```/g, '<span class="md-code">```$1```</span>');

        // Single-line Code (e.g. `code`)
        html = html.replace(/`(.*?)`/g, '<span class="md-code">`$1`</span>');

        // Strikethrough (e.g. ~~text~~)
        html = html.replace(/~~(.*?)~~/g, '<span class="md-strike">~~$1~~</span>');

        // Bold (e.g. **bold**) - match ** anything except ** then **
        html = html.replace(/\*\*(.*?)\*\*/g, '<span class="md-bold">**$1**</span>');

        // Italic (e.g. *italic*) - match * anything except * then *
        // Use negative lookbehind to avoid matching inside **bold**
        html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<span class="md-italic">*$1*</span>');

        // Links (e.g. [text](url))
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<span class="md-link">[$1]($2)</span>');
    }

    // Add trailing newline space to match textarea behavior if it ends with newline
    if (html.endsWith('\n')) {
        html += ' ';
    }

    return html;
}