/**
 * Corpus loader functionality
 * Handles loading manifests, searching for texts, and extracting texts from ZIPs
 */

import { escapeHtml } from './utils.js';

// Configuration
const CORPORA = [
    {
        id: "derge",
        label: "Derge",
        zipUrl: "zips/all_derge.zip",
        manifestUrl: "zips/derge_manifest.json"
    },
    {
        id: "lhasa",
        label: "Lhasa",
        zipUrl: "zips/all_lhasa.zip",
        manifestUrl: "zips/lhasa_manifest.json"
    },
    {
        id: "lithang",
        label: "Lithang",
        zipUrl: "zips/all_lithang.zip",
        manifestUrl: "zips/lithang_manifest.json"
    },
    {
        id: "nyingma",
        label: "Nyingma",
        zipUrl: "zips/all_nyingma.zip",
        manifestUrl: "zips/nyingma_manifest.json"
    },
    {
        id: "acip",
        label: "ACIP Sungbum",
        zipUrl: "zips/all_sungbum.zip",
        manifestUrl: "zips/sungbum_manifest.json"
    }
];

const ALL_TEXT_ENTRIES = [];
const ZIP_CACHE = {};

/**
 * Get all text entries (for use by corpus-search)
 */
export function getAllTextEntries() {
    return ALL_TEXT_ENTRIES;
}

/**
 * Load all corpus manifests
 */
export async function loadManifests() {
    const statusEl = document.getElementById("textSearchStatus");
    try {
        let idxCounter = 0;
        for (const corpus of CORPORA) {
            const resp = await fetch(corpus.manifestUrl);
            if (!resp.ok) {
                console.warn(`Failed to load manifest for ${corpus.id}:`, resp.status);
                continue;
            }
            const manifest = await resp.json();
            // Expect: [{ "file": "subdir/D406.txt", "title": "D406 Some Title" }, ...]
            for (const entry of manifest) {
                const path = entry.file;
                const title = entry.title || entry.file;
                ALL_TEXT_ENTRIES.push({
                    corpusId: corpus.id,
                    corpusLabel: corpus.label,
                    zipUrl: corpus.zipUrl,
                    path: path,
                    displayName: title,
                    index: idxCounter++
                });
            }
        }
        if (ALL_TEXT_ENTRIES.length === 0) {
            statusEl.textContent = "No texts found in manifests (check manifest URLs).";
        } else {
            statusEl.textContent = `Loaded ${ALL_TEXT_ENTRIES.length} texts. Type to search.`;
        }
    } catch (err) {
        console.error("Error loading manifests:", err);
        statusEl.textContent = "Error loading indexes (see console).";
    }
}

/**
 * Search for texts by query string
 * @param {string} query - Search query
 * @param {number} limit - Max results to return
 * @returns {Array} - Matching text entries
 */
export function searchTexts(query, limit = 10) {
    if (!query) return [];
    const q = query.toLowerCase();

    const matches = [];
    for (const entry of ALL_TEXT_ENTRIES) {
        const dname = entry.displayName.toLowerCase();
        const pth = entry.path.toLowerCase();
        const idxName = dname.indexOf(q);
        const idxPath = pth.indexOf(q);
        if (idxName === -1 && idxPath === -1) continue;

        const rawIdx = idxName !== -1 ? idxName : 1000 + idxPath;
        const score = rawIdx + 0.001 * dname.length;
        matches.push({ entry, score });
    }

    matches.sort((a, b) => a.score - b.score);
    return matches.slice(0, limit).map(m => m.entry);
}

/**
 * Render search results in the text finder UI
 * @param {Array} entries - Text entries to display
 */
export function renderSearchResults(entries) {
    const resultsEl = document.getElementById("textSearchResults");
    const statusEl = document.getElementById("textSearchStatus");

    if (!entries || entries.length === 0) {
        resultsEl.innerHTML = "<em>No matches.</em>";
        return;
    }

    statusEl.textContent = `Showing top ${entries.length} matches.`;

    let html = "";
    for (const entry of entries) {
        const safeName = escapeHtml(entry.displayName);
        const safePath = escapeHtml(entry.path);
        const safeCorpus = escapeHtml(entry.corpusLabel);

        html += `
<div class="text-finder-item text-finder-item-clickable" data-entry-index="${entry.index}">
  <div>
    <span>${safeName}</span>
    <div class="text-finder-meta">[${safeCorpus}] ${safePath}</div>
  </div>
</div>`;
    }
    resultsEl.innerHTML = html;
}

/**
 * Get or fetch a ZIP file for a corpus
 * @param {string} corpusId - Corpus identifier
 * @param {string} zipUrl - URL to the ZIP file
 * @returns {Promise} - Promise resolving to JSZip object
 */
export async function getZipForCorpus(corpusId, zipUrl) {
    if (!ZIP_CACHE[corpusId]) {
        const resp = await fetch(zipUrl);
        if (!resp.ok) {
            throw new Error(`Failed to fetch zip for ${corpusId}: ${resp.status}`);
        }
        const buf = await resp.arrayBuffer();
        ZIP_CACHE[corpusId] = JSZip.loadAsync(buf);
    }
    return ZIP_CACHE[corpusId];
}

/**
 * Load a text entry and optionally process it
 * @param {Object} entry - Text entry to load
 * @param {Function} onLoadCallback - Optional callback function to call with loaded text
 */
export async function loadTextEntry(entry, onLoadCallback = null) {
    const statusEl = document.getElementById("textSearchStatus");
    try {
        statusEl.textContent = `Loading ${entry.displayName} from ${entry.corpusLabel}...`;

        const zip = await getZipForCorpus(entry.corpusId, entry.zipUrl);
        const file = zip.file(entry.path);
        if (!file) {
            alert(`Could not find file "${entry.path}" in ${entry.corpusLabel} zip.`);
            statusEl.textContent = "File not found in zip.";
            return null;
        }

        const text = await file.async("string");
        statusEl.textContent = `Loaded ${entry.displayName}.`;

        // Call the callback if provided (for auto-processing)
        if (onLoadCallback) {
            onLoadCallback(text, entry);
        }

        return text;
    } catch (err) {
        console.error("Error loading text from zip:", err);
        alert("Failed to load text from zip (see console).");
        statusEl.textContent = "Error loading text.";
        return null;
    }
}

/**
 * Load a text entry into the textarea (legacy function for backwards compatibility)
 * @param {Object} entry - Text entry to load
 */
export async function loadTextEntryIntoTextarea(entry) {
    const text = await loadTextEntry(entry);
    if (text) {
        const textarea = document.getElementById("inputText");
        textarea.value = text;
        textarea.focus();
    }
}
