/**
 * Shared utility functions
 */

export function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
}

export function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * Split text into clauses based on tshad markers (/ and //)
 */
export function splitClauses(text) {
    // Keep this: normalize CRLF / CR to a space (some input needs this).
    const normalized = text.replace(/\r\n?/g, " ");

    // Replace any group of one or more slashes, possibly separated by spaces,
    // with the same group plus a newline.
    const withNewlines = normalized.replace(/((?:\s*\/)+)\s*/gu, "$1\n");

    // Now split on the newlines we just introduced.
    // We trim spaces but *do not* remove the tshads themselves.
    return withNewlines
        .split("\n")
        .map(c => c.trim())
        .filter(c => c.length > 0);
}
