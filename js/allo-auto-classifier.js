/**
 * Allo/Auto classification functionality
 * Classifies Tibetan text as allochthonous (translated) or autochthonous (native)
 */

import { softmax, nextFrame } from './utils.js';

let classifier = null;
let classifierReady = false;

/**
 * Load the RoBERTa-based allo/auto classification model
 * @param {Function} pipeline - Transformers.js pipeline function
 * @param {Function} updateStatus - Callback to update status text
 */
export async function loadModel(pipeline, updateStatus) {
    try {
        updateStatus("Model: loading auto/allo classifier...");
        classifier = await pipeline('text-classification', './model', {
            quantized: false,
            revision: 'main',
            local_files_only: true,
        });
        classifierReady = true;
        updateStatus("Model: auto/allo classifier loaded.");
    } catch (e) {
        console.error("Error loading classifier model:", e);
        updateStatus("Model: failed to load auto/allo classifier (see console).");
        classifierReady = false;
    }
}

/**
 * Classify clauses as allo or auto
 * @param {string[]} clauses - Array of text clauses
 * @param {Function} updateStatus - Callback to update status text
 * @returns {Promise<Array>} - Array of {allo, auto} probability objects
 */
export async function classifyClauses(clauses, updateStatus) {
    // If classifier isn't ready, just give neutral scores (0.5)
    if (!classifierReady || !classifier) {
        return clauses.map(() => ({ allo: 0.5, auto: 0.5 }));
    }

    const results = [];
    for (let i = 0; i < clauses.length; i++) {
        const clause = clauses[i];
        try {
            const tokens = await classifier.tokenizer(clause);
            const output = await classifier.model(tokens);
            const logits = output.logits.data;
            const [allo, auto] = softmax(Array.from(logits)); // assume [allo, auto]
            results.push({ allo, auto });
        } catch (e) {
            console.error(`Error classifying clause ${i}:`, e);
            results.push({ allo: 0.5, auto: 0.5 });
        }

        // Occasionally yield to the browser
        if (i % 10 === 0) {
            updateStatus(
                `Model: auto/allo classifier loaded. Classifying ${i + 1}/${clauses.length} clauses...`
            );
            await nextFrame();
        }
    }

    updateStatus(
        `Model: auto/allo classifier loaded. Classified ${clauses.length} clauses.`
    );
    return results;
}

/**
 * Map auto-probability to red→blue gradient color
 * @param {number} pAuto - Auto probability (0..1)
 * @returns {string} - RGB color string
 */
export function autoProbToColor(pAuto) {
    const p = Math.min(1, Math.max(0, pAuto));
    const r = Math.round(255 * (1 - p));   // 1 -> 0
    const g = 0;
    const b = Math.round(255 * p);         // 0 -> 255
    return `rgb(${r},${g},${b})`;
}
