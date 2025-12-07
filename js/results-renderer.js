/**
 * Results rendering functionality
 * Renders heatmap and analyzed text with quote/allo/auto/verse highlighting
 */

import { escapeHtml } from './utils.js';
import { getOpenCloseRegexes } from './quote-detection.js';
import { autoProbToColor } from './allo-auto-classifier.js';

/**
 * Render analysis results (heatmap + annotated text)
 * @param {string[]} clauses - Array of text clauses
 * @param {string[]} labels - Quote labels (opener/inquote/closer/none)
 * @param {Array} alloAutoScores - Allo/auto probability scores
 * @param {boolean[]} verseFlags - Verse detection flags
 * @param {boolean} lasnas - Las/nas restriction setting
 * @returns {string} - HTML string for results
 */
export function renderResults(clauses, labels, alloAutoScores, verseFlags, lasnas) {
    console.log("las_nas_shunit =", lasnas);

    const [, , openerRegexSrc, closerRegexSrc] = getOpenCloseRegexes(lasnas);

    // Read heatmap toggles
    const showQuotes = document.getElementById("showQuotesHeat")?.checked ?? true;
    const showAllo   = document.getElementById("showAlloHeat")?.checked ?? true;
    const showVerse  = document.getElementById("showVerseHeat")?.checked ?? true;
    const neutralColor = "#f5f5f5";

    const quoteColorMap = {
        opener: "#d0f0fd",
        inquote: "#fef7cb",
        closer: "#ffd0d0",
        none: "#ffffff"
    };

    let html = "";
    html += "<h2>Heatmap</h2>";
    html += "<div class='heatmap'>";

    for (let i = 0; i < labels.length; i++) {
        const lbl = labels[i];
        const idxStr = i.toString().padStart(4, "0");
        const score = alloAutoScores && alloAutoScores[i] ? alloAutoScores[i] : { allo: 0.5, auto: 0.5 };
        const pAuto = score.auto;
        const verse = verseFlags && verseFlags[i];

        const quoteColor = showQuotes ? (quoteColorMap[lbl] || "#ffffff") : neutralColor;
        const alloColor  = showAllo   ? autoProbToColor(pAuto)             : neutralColor;
        const verseColor = showVerse  ? (verse ? "#4caf50" : "#dddddd")    : neutralColor;

        const title = `Line ${idxStr}
Quote: ${lbl}
Allo: ${score.allo.toFixed(2)}, Auto: ${score.auto.toFixed(2)}
Verse: ${verse ? "yes" : "no"}`;

        html += `
<a href="#line-${idxStr}" title="${escapeHtml(title)}">
<div class="heatbox">
    <div class="heatband" style="background:${quoteColor};"></div>
    <div class="heatband" style="background:${alloColor};"></div>
    <div class="heatband" style="background:${verseColor};"></div>
</div>
</a>`;
    }

    html += "</div><hr>";

    for (let i = 0; i < clauses.length; i++) {
        const clause = clauses[i];
        const label = labels[i];
        const idxStr = i.toString().padStart(4, "0");
        const clauseEsc = escapeHtml(clause);

        // --- auto/allo badge ---
        const score = alloAutoScores && alloAutoScores[i] ? alloAutoScores[i] : { allo: 0.5, auto: 0.5 };
        const pAuto = score.auto;
        const color = autoProbToColor(pAuto);
        const badgeText = pAuto.toFixed(2);
        const titleText = `Allo: ${score.allo.toFixed(2)}, Auto: ${score.auto.toFixed(2)}`;
        const badgeHtml =
            `<span class="allo-auto-badge" style="background-color:${color};" title="${escapeHtml(titleText)}">${badgeText}</span>`;

        let highlighted = clauseEsc;

        if (label === "opener") {
            const localOpenerRe = new RegExp(openerRegexSrc, "u");
            const m = localOpenerRe.exec(clause);
            if (m) {
                const start = m.index;
                const end = start + m[0].length;
                highlighted =
                    escapeHtml(clause.slice(0, start)) +
                    `<span class="opener">${escapeHtml(clause.slice(start, end))}</span>` +
                    `<span class="inquote">` +
                    escapeHtml(clause.slice(end)) +
                    `</span>`;
            }
        } else if (label === "closer") {
            const localCloserRe = new RegExp(closerRegexSrc, "u");
            const m = localCloserRe.exec(clause);
            if (m) {
                const start = m.index;
                const end = start + m[0].length;
                highlighted =
                    `<span class="inquote">` +
                    escapeHtml(clause.slice(0, start)) +
                    `</span>` +
                    `<span class="closer">${escapeHtml(clause.slice(start, end))}</span>` +
                    escapeHtml(clause.slice(end));
            }
        } else if (label === "inquote") {
            highlighted = `<span class="inquote">${clauseEsc}</span>`;
        }

        // Bold verse lines
        let finalText = highlighted;
        if (verseFlags && verseFlags[i]) {
            finalText = `<span class="verse-line">${highlighted}</span>`;
        }

        html += `
  <div id="line-${idxStr}" class="clause-line">
    <span class="meta-unselectable">
      ${badgeHtml}<strong>${idxStr}:</strong>&nbsp;
    </span>
    ${finalText}
  </div>`;

    }

    return html;
}

/**
 * Setup copy handler for results div
 * Cleans up copied text (removes line numbers, normalizes whitespace)
 */
export function setupResultsCopyHandler() {
    const resultsDiv = document.getElementById("results");
    if (!resultsDiv) return;

    resultsDiv.addEventListener("copy", (event) => {
        const selection = window.getSelection();
        if (!selection) return;

        const selectedText = selection.toString();
        if (!selectedText) return;

        // Only intercept if the selection is inside #results
        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        const containsAnchor = anchorNode && resultsDiv.contains(anchorNode);
        const containsFocus = focusNode && resultsDiv.contains(focusNode);

        if (!containsAnchor && !containsFocus) {
            // Let normal copying happen elsewhere (e.g., textarea)
            return;
        }

        // --- Transform the text ---
        let text = selectedText;

        // Normalize CRLF/CR to LF
        text = text.replace(/\r\n?/g, "\n");

        // Replace all newlines with spaces
        text = text.replace(/\n+/g, " ");

        // Collapse multiple spaces to a single space and trim
        text = text.replace(/\s+/g, " ").trim();

        // Put our cleaned text into the clipboard
        event.preventDefault();
        event.clipboardData.setData("text/plain", text);
    });
}
