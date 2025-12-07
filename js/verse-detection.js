/**
 * Verse detection functionality
 * Detects sections of verse based on syllable meter patterns
 */

const VERSE_METER_COUNTS = [7, 9, 11];
const VERSE_MIN_SECTION_LENGTH = 4;
const VERSE_MIN_PROBABILITY = 0.7;
const IGNORE_CHARS_REGEX = /[/@#;:()]/g;

/**
 * Count syllables in a line
 * @param {string} line - The text line to analyze
 * @returns {number} - Number of syllables
 */
function countSyllables(line) {
    const cleaned = line.replace(IGNORE_CHARS_REGEX, "").trim();
    if (!cleaned) return 0;
    return cleaned.split(/\s+/).length;
}

/**
 * Detect verse sections over a list of clauses
 * @param {string[]} clauses - Array of text clauses
 * @returns {boolean[]} - Array of flags indicating which clauses are in verse
 */
export function detectVerseLines(clauses) {
    const n = clauses.length;
    const verseFlags = new Array(n).fill(false);
    const syllableCounts = clauses.map(countSyllables);

    let i = 0;
    while (i < n) {
        const firstCount = syllableCounts[i];
        if (!VERSE_METER_COUNTS.includes(firstCount)) {
            i += 1;
            continue;
        }
        const currentMeter = firstCount;

        let currentWeight = 1.0;
        let currentMaxWeight = 1.0;
        let sectionStart = i;
        let sectionEnd = i;
        let nextLine = i + 1;

        // Extend section while probability stays above threshold
        while (
            nextLine < n &&
            (currentWeight / currentMaxWeight) >= VERSE_MIN_PROBABILITY
        ) {
            const c = syllableCounts[nextLine];
            if (c === currentMeter) {
                currentWeight += 1.0;
            } else if (Math.abs(c - currentMeter) === 1) {
                currentWeight += 0.5;
            } else {
                break;
            }
            currentMaxWeight += 1.0;
            sectionEnd = nextLine;
            nextLine += 1;
        }

        if (sectionEnd - sectionStart + 1 >= VERSE_MIN_SECTION_LENGTH) {
            for (let k = sectionStart; k <= sectionEnd; k++) {
                verseFlags[k] = true;
            }
        }

        i = sectionEnd + 1;
    }

    return verseFlags;
}
