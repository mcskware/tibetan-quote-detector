/**
 * Corpus search functionality
 * Loads pre-built search index and performs fuzzy/exact searches
 */

import { escapeHtml, nextFrame } from './utils.js';

// Configuration
const SEARCH_INDEX_URL = "zips/search_index.json.gz";
const SEARCH_CONTEXT_LINES = 2;
const MAX_SEARCH_RESULTS = 100;

// Search index state
const CORPUS_INDEX = {
    loaded: false,
    loading: false,
    documents: [],
    fuse: null
};

/**
 * Load the pre-built search index
 */
export async function loadSearchIndex() {
    const statusEl = document.getElementById("corpusSearchStatus");
    const progressEl = document.getElementById("corpusSearchProgress");

    if (CORPUS_INDEX.loaded) {
        statusEl.textContent = `Index ready: ${CORPUS_INDEX.documents.length} documents`;
        return;
    }

    if (CORPUS_INDEX.loading) {
        statusEl.textContent = 'Index is already loading...';
        return;
    }

    try {
        CORPUS_INDEX.loading = true;
        progressEl.style.display = 'block';
        progressEl.removeAttribute('value'); // Indeterminate progress
        statusEl.textContent = 'Loading search index...';

        const response = await fetch(SEARCH_INDEX_URL);
        if (!response.ok) {
            throw new Error(`Failed to load search index: ${response.status}`);
        }

        // Get the gzipped data as a blob
        const blob = await response.blob();
        statusEl.textContent = `Decompressing search index (${(blob.size / (1024 * 1024)).toFixed(1)} MB)...`;

        // Decompress using browser's native decompression
        const decompressedStream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const decompressedBlob = await new Response(decompressedStream).blob();
        const jsonText = await decompressedBlob.text();

        statusEl.textContent = 'Parsing search index...';
        const indexData = JSON.parse(jsonText);

        CORPUS_INDEX.documents = indexData.documents;

        // Build Fuse.js index
        statusEl.textContent = 'Building fuzzy search index...';
        await nextFrame();

        CORPUS_INDEX.fuse = new Fuse(CORPUS_INDEX.documents, {
            keys: ['preview'],
            includeScore: true,
            includeMatches: true,
            threshold: 0.3,
            ignoreLocation: true,
            minMatchCharLength: 2
        });

        CORPUS_INDEX.loaded = true;
        CORPUS_INDEX.loading = false;
        progressEl.style.display = 'none';
        statusEl.textContent = `Index ready: ${CORPUS_INDEX.documents.length} documents`;
    } catch (err) {
        console.error('Error loading search index:', err);
        statusEl.textContent = `Error loading index: ${err.message}`;
        progressEl.style.display = 'none';
        CORPUS_INDEX.loading = false;
    }
}

/**
 * Perform a corpus search
 * @param {string} query - Search query
 * @param {boolean} useFuzzy - Whether to use fuzzy search
 */
export async function performCorpusSearch(query, useFuzzy = true) {
    const statusEl = document.getElementById("corpusSearchStatus");
    const resultsEl = document.getElementById("corpusSearchResults");

    if (!query || query.trim().length === 0) {
        statusEl.textContent = 'Please enter a search query';
        resultsEl.innerHTML = '';
        return;
    }

    // Ensure index is loaded
    if (!CORPUS_INDEX.loaded) {
        await loadSearchIndex();
        if (!CORPUS_INDEX.loaded) {
            return; // Loading failed
        }
    }

    statusEl.textContent = 'Searching...';
    const searchQuery = query.trim();
    let results = [];

    if (useFuzzy && CORPUS_INDEX.fuse) {
        // Fuzzy search with Fuse.js
        const fuseResults = CORPUS_INDEX.fuse.search(searchQuery, { limit: MAX_SEARCH_RESULTS });
        results = fuseResults.map(r => ({
            document: r.item,
            score: r.score,
            matches: r.matches
        }));
    } else {
        // Exact search (search in preview only)
        for (const doc of CORPUS_INDEX.documents) {
            if (doc.preview.includes(searchQuery)) {
                results.push({
                    document: doc,
                    score: 0,
                    matches: null
                });
                if (results.length >= MAX_SEARCH_RESULTS) break;
            }
        }
    }

    renderCorpusSearchResults(results, searchQuery);
    statusEl.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''}`;
}

/**
 * Render corpus search results
 * @param {Array} results - Search results
 * @param {string} query - Search query
 */
function renderCorpusSearchResults(results, query) {
    const resultsEl = document.getElementById("corpusSearchResults");

    if (results.length === 0) {
        resultsEl.innerHTML = '<p style="color: #666; font-style: italic;">No results found.</p>';
        return;
    }

    let html = '';
    for (const result of results) {
        const doc = result.document;
        const safeTitle = escapeHtml(doc.displayName);
        const safeCorpus = escapeHtml(doc.corpusLabel);
        const safePath = escapeHtml(doc.path);

        // Find matching lines with context
        const matchingLines = findMatchingLines(doc, query);

        html += `
<div class="corpus-search-result-item">
    <div class="corpus-search-result-header">
        <div>
            <div class="corpus-search-result-title">${safeTitle}</div>
            <div class="corpus-search-result-meta">[${safeCorpus}] ${safePath}</div>
        </div>
        <button type="button" data-doc-id="${doc.id}">Load</button>
    </div>`;

        // Show up to 3 matching contexts
        const contextsToShow = matchingLines.slice(0, 3);
        for (const ctx of contextsToShow) {
            html += `<div class="corpus-search-result-context">${ctx}</div>`;
        }

        if (matchingLines.length > 3) {
            html += `<div class="corpus-search-result-meta">...and ${matchingLines.length - 3} more match(es) in preview</div>`;
        }

        // Note if document is longer than preview
        if (doc.preview.length < doc.fullLength) {
            html += `<div class="corpus-search-result-meta" style="font-style: italic;">Note: Only first ~2000 chars searched. Load full text to see all matches.</div>`;
        }

        html += '</div>';
    }

    resultsEl.innerHTML = html;
}

/**
 * Find matching lines with context in a document
 * @param {Object} doc - Document to search
 * @param {string} query - Search query
 * @returns {Array} - Array of HTML strings with highlighted matches
 */
function findMatchingLines(doc, query) {
    const lines = doc.lines;
    const matchingContexts = [];
    const queryLower = query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        if (lineLower.includes(queryLower)) {
            // Get context lines
            const startIdx = Math.max(0, i - SEARCH_CONTEXT_LINES);
            const endIdx = Math.min(lines.length - 1, i + SEARCH_CONTEXT_LINES);

            let contextHtml = '';
            for (let j = startIdx; j <= endIdx; j++) {
                const contextLine = lines[j];

                if (j === i) {
                    // Highlight the matching line
                    const highlighted = highlightMatches(contextLine, query);
                    contextHtml += highlighted;
                } else {
                    contextHtml += escapeHtml(contextLine);
                }

                if (j < endIdx) {
                    contextHtml += ' ';
                }
            }

            matchingContexts.push(contextHtml);
        }
    }

    return matchingContexts;
}

/**
 * Highlight matches in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} - HTML with highlighted matches
 */
function highlightMatches(text, query) {
    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(query);

    // Case-insensitive replace
    const regex = new RegExp(escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return escapedText.replace(regex, match => `<span class="corpus-search-result-match">${match}</span>`);
}
