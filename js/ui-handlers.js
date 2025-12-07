/**
 * UI event handlers
 * Wires up all user interactions and coordinates between modules
 */

import { splitClauses } from './utils.js';
import { detectVerseLines } from './verse-detection.js';
import { detectQuotes } from './quote-detection.js';
import { classifyClauses } from './allo-auto-classifier.js';
import { renderResults } from './results-renderer.js';
import {
    searchTexts,
    renderSearchResults,
    loadTextEntryIntoTextarea,
    getAllTextEntries
} from './corpus-loader.js';
import {
    loadSearchIndex,
    performCorpusSearch
} from './corpus-search.js';

// Cache of last run so we can re-render heatmap without recomputing
let LAST_CLAUSES = null;
let LAST_LABELS = null;
let LAST_ALLOAUTO = null;
let LAST_VERSE = null;

/**
 * Initialize all UI event handlers
 */
export function initializeUIHandlers() {
    setupQuoteDetectionButton();
    setupTextFinderHandlers();
    setupCorpusSearchHandlers();
    setupHeatmapToggleHandlers();
}

/**
 * Setup quote detection button handler
 */
function setupQuoteDetectionButton() {
    document.getElementById("runBtn").addEventListener("click", async () => {
        const input = document.getElementById("inputText").value || "";
        const resultsDiv = document.getElementById("results");

        const clauses = splitClauses(input);
        if (clauses.length === 0) {
            resultsDiv.innerHTML = "<p><em>No clauses found. Did you paste any text?</em></p>";
            return;
        }

        const lasnas = document.getElementById("lasnas").checked;
        const verseFlags = detectVerseLines(clauses);

        const modelStatus = document.getElementById("modelStatus");
        const alloAutoScores = await classifyClauses(
            clauses,
            (status) => { modelStatus.textContent = status; }
        );

        const labels = detectQuotes(clauses, lasnas);

        // cache
        LAST_CLAUSES = clauses;
        LAST_LABELS = labels;
        LAST_ALLOAUTO = alloAutoScores;
        LAST_VERSE = verseFlags;

        const html = renderResults(clauses, labels, alloAutoScores, verseFlags, lasnas);
        resultsDiv.innerHTML = html;
    });
}

/**
 * Setup text finder (corpus loader) handlers
 */
function setupTextFinderHandlers() {
    // Text search input
    document.getElementById("textSearchInput").addEventListener("input", (e) => {
        const q = e.target.value.trim();
        if (!q) {
            document.getElementById("textSearchResults").innerHTML = "";
            document.getElementById("textSearchStatus").textContent = "Type to search.";
            return;
        }
        const matches = searchTexts(q, 10);
        renderSearchResults(matches);
    });

    // Delegate click for "Load" buttons in search results
    document.getElementById("textSearchResults").addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-entry-index]");
        if (!btn) return;
        const idx = parseInt(btn.getAttribute("data-entry-index"), 10);
        const entry = getAllTextEntries().find(ent => ent.index === idx);
        if (!entry) {
            alert("Could not find selected entry (internal error).");
            return;
        }
        loadTextEntryIntoTextarea(entry);
    });
}

/**
 * Setup corpus search panel handlers
 */
function setupCorpusSearchHandlers() {
    // Toggle corpus search panel
    document.getElementById("corpusSearchHeader").addEventListener("click", () => {
        const body = document.getElementById("corpusSearchBody");
        const toggle = document.getElementById("corpusSearchToggle");

        if (body.classList.contains("collapsed")) {
            body.classList.remove("collapsed");
            toggle.textContent = "▼";
        } else {
            body.classList.add("collapsed");
            toggle.textContent = "▲";
        }
    });

    // Fill search input from selection
    document.getElementById("corpusSearchFillSelection").addEventListener("click", () => {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';

        if (selectedText) {
            // Clean up the selected text (remove line numbers, etc.)
            let cleanText = selectedText;
            // Remove line number prefixes like "0042: "
            cleanText = cleanText.replace(/^\d+:\s*/gm, '');
            // Normalize whitespace
            cleanText = cleanText.replace(/\s+/g, ' ').trim();

            document.getElementById("corpusSearchInput").value = cleanText;
        } else {
            alert('Please select some text first');
        }
    });

    // Perform search
    document.getElementById("corpusSearchBtn").addEventListener("click", async () => {
        const query = document.getElementById("corpusSearchInput").value;
        const useFuzzy = document.getElementById("corpusSearchFuzzy").checked;
        await performCorpusSearch(query, useFuzzy);
    });

    // Preload index
    document.getElementById("corpusSearchPreload").addEventListener("click", async () => {
        await loadSearchIndex();
    });

    // Allow Enter key in search input to trigger search
    document.getElementById("corpusSearchInput").addEventListener("keydown", async (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const query = document.getElementById("corpusSearchInput").value;
            const useFuzzy = document.getElementById("corpusSearchFuzzy").checked;
            await performCorpusSearch(query, useFuzzy);
        }
    });

    // Load text from corpus search results
    document.getElementById("corpusSearchResults").addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-doc-id]");
        if (!btn) return;

        const docId = parseInt(btn.getAttribute("data-doc-id"), 10);
        const entry = getAllTextEntries().find(ent => ent.index === docId);

        if (!entry) {
            alert("Could not find selected text (internal error).");
            return;
        }

        await loadTextEntryIntoTextarea(entry);
    });
}

/**
 * Setup heatmap toggle handlers
 */
function setupHeatmapToggleHandlers() {
    function rerenderWithCurrentHeatmap() {
        if (!LAST_CLAUSES) return;
        const resultsDiv = document.getElementById("results");
        const lasnas = document.getElementById("lasnas").checked;
        const html = renderResults(LAST_CLAUSES, LAST_LABELS, LAST_ALLOAUTO, LAST_VERSE, lasnas);
        resultsDiv.innerHTML = html;
    }

    ["showQuotesHeat", "showAlloHeat", "showVerseHeat"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", rerenderWithCurrentHeatmap);
        }
    });
}
