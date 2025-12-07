# UX Refactor Summary

## Overview
The application workflow has been redesigned to streamline the user experience and make allo/auto classification an optional layer.

## Key Changes

### 1. **Auto-Processing for Corpus Texts**
   - When a user selects a text from the corpus (Derge, Lhasa, Lithang, Nyingma, ACIP), it is now **automatically analyzed**
   - No need to manually click "Detect quotes" - the text is loaded and processed immediately
   - Verse and quote detection run automatically
   - Allo/auto classification is **optional** and triggered separately

### 2. **Collapsible Manual Input Section**
   - Manual text input is now in a **collapsible section** (collapsed by default)
   - Click "Paste Your Own Text ▼" to expand the input area
   - When a corpus text is loaded, the manual input section **auto-collapses**
   - Button renamed to "Analyze Text" for clarity
   - Reduces screen clutter when browsing corpus texts

### 3. **Allo/Auto as Optional Layer**
   - **New workflow:**
     1. Text is loaded → verse + quote detection run automatically
     2. Results display with heatmap (quotes + verse)
     3. User clicks "Run Allo/Auto Classification" button if desired
     4. Allo/auto layer appears in heatmap after classification completes
   - **Benefits:**
     - Faster initial analysis (no waiting for slow allo/auto classification)
     - User has control over when to run expensive analysis
     - Allo/auto checkbox only works after classification has run

### 4. **Results Controls Redesign**
   - **Results Controls panel** appears after text analysis (hidden until then)
   - Contains:
     - **Heatmap toggles:** Quotes, Verse, Allo/auto
     - **Allo/Auto button:** "Run Allo/Auto Classification"
     - **Status indicator:** Shows "Running classification..." and "Classification complete!"
   - Allo/auto checkbox is initially unchecked and disabled until classification runs

### 5. **Improved Initial State**
   - Empty results area shows helpful message: "Select a text from above or paste your own to begin analysis."
   - Clear call-to-action for new users
   - No confusing empty textarea taking up space

## UI Components

### Updated HTML Structure
```
[Text Finder] - Search and select from corpus
    ↓ (auto-process on click)
[Manual Input - Collapsible] - Optional manual paste
    ↓ (click "Analyze Text")
[Analysis Options] - Settings (las/nas restriction)
    ↓
[Results Area] - Analyzed text with heatmap
    ↓
[Results Controls] - Only visible after analysis
    ├── Heatmap Toggles (Quotes, Verse, Allo/auto)
    └── Run Allo/Auto Classification Button
```

### New CSS Classes
- `.manual-input-section` - Container for collapsible input
- `.manual-input-toggle` - Toggle button
- `.manual-input-body` - Collapsible content (with `.collapsed` state)
- `.analysis-options` - Settings panel
- `.results-controls` - Post-analysis controls
- `.heatmap-controls` - Heatmap layer toggles
- `.allo-auto-controls` - Allo/auto button and status
- `.allo-auto-button` - Styled button for classification
- `.allo-auto-status` - Status text display

## User Workflows

### Workflow 1: Browse Corpus Texts
1. User types text name (e.g., "D406")
2. Clicks "Load" on matching result
3. **Text automatically analyzed** (verse + quotes)
4. Results appear immediately with heatmap
5. Optionally click "Run Allo/Auto Classification" if needed

### Workflow 2: Paste Custom Text
1. Click "Paste Your Own Text ▼" to expand
2. Paste text into textarea
3. Click "Analyze Text"
4. Results appear with heatmap
5. Optionally run allo/auto classification

### Workflow 3: Switch Between Texts
1. Click different corpus texts
2. Each loads and analyzes automatically
3. Manual input section collapses
4. Allo/auto classification resets (must re-run for new text)

## Code Changes

### Modified Files
1. **index.html**
   - Added collapsible manual input section
   - Added results controls panel with allo/auto button
   - Restructured layout for better flow

2. **css/style.css**
   - Added styles for collapsible sections
   - Added styles for results controls
   - Added styles for allo/auto button and status

3. **js/corpus-loader.js**
   - Added `loadTextEntry(entry, onLoadCallback)` function
   - Supports callback for auto-processing
   - Backward compatible with old `loadTextEntryIntoTextarea()`

4. **js/ui-handlers.js**
   - Complete rewrite of analysis workflow
   - New `analyzeText()` function (verse + quotes only)
   - New `setupAlloAutoHandlers()` for optional classification
   - Auto-collapse manual input when loading corpus text
   - Tracks metadata about loaded text

5. **js/results-renderer.js**
   - Already handled null allo/auto scores (no changes needed)
   - Defaults to neutral scores (0.5) when not available

## Benefits

### For Users
- **Faster workflow** - Corpus texts analyze immediately
- **Less clutter** - Manual input hidden by default
- **More control** - Choose when to run expensive allo/auto classification
- **Clearer feedback** - Status messages and button states guide the workflow

### For Future Development
- **Modular layers** - Easy to add more optional analysis layers
- **Metadata tracking** - `CURRENT_TEXT_METADATA` stores source information
- **Clean separation** - Auto vs. manual workflows clearly separated
- **Extensible** - Ready for inter-text analysis features

## Testing Notes

Test the application at: `http://localhost:8088`

**Test Cases:**
1. ✓ Search for corpus text → Click Load → Verify auto-analysis
2. ✓ Manual input section collapsed by default
3. ✓ Expand manual input → Paste text → Click Analyze
4. ✓ Results controls appear after analysis
5. ✓ Allo/auto checkbox disabled until classification runs
6. ✓ Click "Run Allo/Auto Classification" → Verify classification runs
7. ✓ Toggle heatmap layers (Quotes, Verse, Allo/auto)
8. ✓ Load different corpus text → Verify allo/auto resets
9. ✓ Verify manual input auto-collapses when loading corpus text
