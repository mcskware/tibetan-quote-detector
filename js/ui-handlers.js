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
    loadTextEntry,
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
let CURRENT_TEXT_METADATA = null;  // Store info about currently loaded text

/**
 * Initialize all UI event handlers
 */
export function initializeUIHandlers() {
    setupManualInputToggle();
    setupAnalyzeButton();
    setupTextFinderHandlers();
    setupCorpusSearchHandlers();
    setupHeatmapToggleHandlers();
    setupAlloAutoHandlers();
}

/**
 * Setup manual input section toggle
 */
function setupManualInputToggle() {
    document.getElementById("manualInputToggle").addEventListener("click", () => {
        const body = document.getElementById("manualInputBody");
        const toggle = document.getElementById("manualInputToggle");

        if (body.classList.contains("collapsed")) {
            body.classList.remove("collapsed");
            toggle.textContent = "Paste Your Own Text ▲";
        } else {
            body.classList.add("collapsed");
            toggle.textContent = "Paste Your Own Text ▼";
        }
    });
}

/**
 * Analyze text (verse + quote detection only, no allo/auto)
 * @param {string} text - Text to analyze
 * @param {Object} metadata - Optional metadata about the text source
 */
async function analyzeText(text, metadata = null) {
    const resultsDiv = document.getElementById("results");
    const resultsControls = document.getElementById("resultsControls");

    const clauses = splitClauses(text);
    if (clauses.length === 0) {
        resultsDiv.innerHTML = "<p><em>No clauses found. Did you paste any text?</em></p>";
        resultsControls.style.display = "none";
        return;
    }

    // Show analyzing status
    resultsDiv.innerHTML = "<p><em>Analyzing text...</em></p>";

    const lasnas = document.getElementById("lasnas").checked;
    const verseFlags = detectVerseLines(clauses);
    const labels = detectQuotes(clauses, lasnas);

    // Cache results (without allo/auto initially)
    LAST_CLAUSES = clauses;
    LAST_LABELS = labels;
    LAST_ALLOAUTO = null;  // Reset allo/auto scores
    LAST_VERSE = verseFlags;
    CURRENT_TEXT_METADATA = metadata;

    // Render without allo/auto
    const html = renderResults(clauses, labels, null, verseFlags, lasnas);
    resultsDiv.innerHTML = html;

    // Show results controls
    resultsControls.style.display = "block";

    // Reset allo/auto checkbox and button
    document.getElementById("showAlloHeat").checked = false;
    document.getElementById("runAlloAutoBtn").disabled = false;
    document.getElementById("alloAutoStatus").textContent = "";
}

/**
 * Setup analyze button for manual input
 */
function setupAnalyzeButton() {
    document.getElementById("runBtn").addEventListener("click", async () => {
        const input = document.getElementById("inputText").value || "";
        await analyzeText(input, { source: 'manual' });
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
    document.getElementById("textSearchResults").addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-entry-index]");
        if (!btn) return;
        const idx = parseInt(btn.getAttribute("data-entry-index"), 10);
        const entry = getAllTextEntries().find(ent => ent.index === idx);
        if (!entry) {
            alert("Could not find selected entry (internal error).");
            return;
        }

        // Auto-collapse manual input section when loading from corpus
        const manualBody = document.getElementById("manualInputBody");
        const manualToggle = document.getElementById("manualInputToggle");
        if (!manualBody.classList.contains("collapsed")) {
            manualBody.classList.add("collapsed");
            manualToggle.textContent = "Paste Your Own Text ▼";
        }

        // Load and auto-process the text
        await loadTextEntry(entry, (text, metadata) => {
            analyzeText(text, {
                source: 'corpus',
                corpusId: metadata.corpusId,
                corpusLabel: metadata.corpusLabel,
                path: metadata.path,
                displayName: metadata.displayName
            });
        });
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

    // Load text from corpus search results (auto-process)
    document.getElementById("corpusSearchResults").addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-doc-id]");
        if (!btn) return;

        const docId = parseInt(btn.getAttribute("data-doc-id"), 10);
        const entry = getAllTextEntries().find(ent => ent.index === docId);

        if (!entry) {
            alert("Could not find selected text (internal error).");
            return;
        }

        // Auto-collapse manual input section
        const manualBody = document.getElementById("manualInputBody");
        const manualToggle = document.getElementById("manualInputToggle");
        if (!manualBody.classList.contains("collapsed")) {
            manualBody.classList.add("collapsed");
            manualToggle.textContent = "Paste Your Own Text ▼";
        }

        // Load and auto-process the text
        await loadTextEntry(entry, (text, metadata) => {
            analyzeText(text, {
                source: 'corpus',
                corpusId: metadata.corpusId,
                corpusLabel: metadata.corpusLabel,
                path: metadata.path,
                displayName: metadata.displayName
            });
        });
    });
}

/**
 * Setup allo/auto classification handlers
 */
function setupAlloAutoHandlers() {
    const runBtn = document.getElementById("runAlloAutoBtn");
    const statusEl = document.getElementById("alloAutoStatus");
    const checkboxEl = document.getElementById("showAlloHeat");

    // Run allo/auto classification
    runBtn.addEventListener("click", async () => {
        if (!LAST_CLAUSES) {
            alert("No text has been analyzed yet.");
            return;
        }

        // Disable button and show status
        runBtn.disabled = true;
        statusEl.textContent = "Running classification...";

        const modelStatus = document.getElementById("modelStatus");
        const alloAutoScores = await classifyClauses(
            LAST_CLAUSES,
            (status) => { modelStatus.textContent = status; }
        );

        // Cache results
        LAST_ALLOAUTO = alloAutoScores;

        // Enable checkbox and re-render
        checkboxEl.checked = true;
        rerenderWithCurrentHeatmap();

        statusEl.textContent = "Classification complete!";
        setTimeout(() => {
            statusEl.textContent = "";
        }, 3000);
    });

    // When checkbox is toggled, re-render (only works if classification has been run)
    checkboxEl.addEventListener("change", () => {
        if (checkboxEl.checked && !LAST_ALLOAUTO) {
            // User tried to enable allo/auto without running it first
            alert("Please run Allo/Auto classification first.");
            checkboxEl.checked = false;
            return;
        }
        rerenderWithCurrentHeatmap();
    });
}

/**
 * Setup heatmap toggle handlers
 */
function setupHeatmapToggleHandlers() {
    ["showQuotesHeat", "showVerseHeat"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", rerenderWithCurrentHeatmap);
        }
    });
}

/**
 * Re-render results with current heatmap settings
 */
function rerenderWithCurrentHeatmap() {
    if (!LAST_CLAUSES) return;
    const resultsDiv = document.getElementById("results");
    const lasnas = document.getElementById("lasnas").checked;
    const html = renderResults(LAST_CLAUSES, LAST_LABELS, LAST_ALLOAUTO, LAST_VERSE, lasnas);
    resultsDiv.innerHTML = html;
}
