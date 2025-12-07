/**
 * Quote detection functionality
 * Detects quotations based on opener and closer markers
 */

const MAX_QUOTE_LENGTH_CHARS = 500;

/**
 * Get opener and closer regex patterns
 * @param {boolean} lasnas - Whether to restrict las/nas to end-of-shunit
 * @returns {Array} - [openerRegex, closerRegex, openerRegexSrc, closerRegexSrc]
 */
export function getOpenCloseRegexes(lasnas) {
    let potentialOpeners = [
        "las kyang ji skad du",
        "las kyang",
        "ji skad du",
        "las 'byung ba",
        "las ji skad du",
        "de bzhin du",
        "de'i phyir",
        "ji skad smras pa",
        "'dir smras pa",
        "de nyid kyi phyir",
        "mdo las",
        "rgyud las",
        "de nyid las",
        "bstan bcos las",
        "las kyang",
        "de skad du",
        "di skad ces",
        "tshigs su bcad pa",
        "'dir tshigs su bcad pa",
    ];

    if (lasnas === true) {
        potentialOpeners.push("las$");
    } else {
        potentialOpeners.push("las");
    }
    potentialOpeners.sort((a, b) => b.length - a.length);

    let baseClosers = [
        "zhes gsungs so",
        "zhes ji skad gsungs pa lta bu'o",
        "zhes 'byung ngo",
        "zhes gsungs pa'i phyir ro",
        "ces gsungs so",
        "zhes gsungs te",
        "zhes gsungs pa",
        "zhes gsungs pa yin no",
        "zhes gsungs pa lta bu'o",
        "gsungs so",
        "zhes bya ba dang",
        "ces gsungs te",
        "ces gsungs pa'i phyir ro",
        "zhes bya ba gsungs so",
        "zhes bshad do",
        "ces gsungs pa lta bu'o",
        "zhes pa",
        "zhes gsungs pa nyid blta bar bya'o",
        "zhes gsungs pa'o",
        "zhes bshad pa'i phyir ro",
        "ces gsungs pa",
        "zhes bshad pa lta bu'o",
        "ces bya ba gsungs te",
        "zhes gsungs",
        "zhe'o",
        "zhes rgya cher gsungs so",
        "gsungs pa lta bu'o",
        "zhes rgya cher gsungs pa lta bu'o",
        "zhes bshad do",
        "zhes bya ba smos",
        "ji lta ba bzhin du rab tu shes so",
        "ces bya ba smos",
        "ces bstan to",
        "zhes bstan to",
        "zhes pa smra'o",
    ];
    baseClosers.sort((a, b) => b.length - a.length);
    const extraCloserRegex = "zhes(?! bya ba)";

    function escapeRegExp(str) {
        return str.replace(/[.*+?^{}()|[\]\\]/g, '\\$&');
    }

    const openerRegexSrc =
        "(\\b" + potentialOpeners.map(escapeRegExp).join("\\b|\\b") + "\\b)";

    const closerRegexParts = baseClosers.map(escapeRegExp);
    closerRegexParts.push(extraCloserRegex);
    const closerRegexSrc =
        "(\\b" + closerRegexParts.join("\\b|\\b") + "\\b)";

    const openerRegex = new RegExp(openerRegexSrc, "u");
    const closerRegex = new RegExp(closerRegexSrc, "u");

    console.log("Opener regex:", openerRegex);
    console.log("Closer regex:", closerRegex);

    return [openerRegex, closerRegex, openerRegexSrc, closerRegexSrc];
}

/**
 * Detect quotations in clauses
 * @param {string[]} clauses - Array of text clauses
 * @param {boolean} lasnas - Whether to restrict las/nas to end-of-shunit
 * @returns {string[]} - Array of labels: 'opener', 'inquote', 'closer', 'none'
 */
export function detectQuotes(clauses, lasnas) {
    console.log("las_nas_shunit =", lasnas);

    const [openerRegex, closerRegex] = getOpenCloseRegexes(lasnas);

    const labels = new Array(clauses.length).fill("none");
    let i = 0;

    while (i < clauses.length) {
        const clause = clauses[i];
        const openerMatch = openerRegex.exec(clause);
        openerRegex.lastIndex = 0;

        if (openerMatch) {
            for (let j = i + 1; j < clauses.length; j++) {
                const closerMatch = closerRegex.exec(clauses[j]);
                closerRegex.lastIndex = 0;

                if (closerMatch) {
                    const openerText = openerMatch[0];
                    const closerText = closerMatch[0];

                    if ((openerText === "las" || openerText === "nas") && closerText === "zhes") {
                        continue;
                    }

                    const quoteContent = clauses.slice(i + 1, j).join(" ");
                    if (quoteContent.length <= MAX_QUOTE_LENGTH_CHARS) {
                        labels[i] = "opener";
                        for (let k = i + 1; k < j; k++) {
                            labels[k] = "inquote";
                        }
                        labels[j] = "closer";
                        i = j;
                    }
                    break;
                }
            }
        }

        i += 1;
    }

    return labels;
}
