#!/usr/bin/env python3
"""
Pre-build search index for Classical Tibetan corpus.

This script extracts all texts from the corpus ZIPs and creates a search index
that can be loaded quickly by the web application.
"""

import json
import zipfile
from pathlib import Path
import gzip

# Configuration matching the webapp
CORPORA = [
    {
        "id": "derge",
        "label": "Derge",
        "zipUrl": "zips/all_derge.zip",
        "manifestUrl": "zips/derge_manifest.json"
    },
    {
        "id": "nyingma",
        "label": "Nyingma",
        "zipUrl": "zips/all_nyingma.zip",
        "manifestUrl": "zips/nyingma_manifest.json"
    },
    {
        "id": "acip",
        "label": "ACIP Sungbum",
        "zipUrl": "zips/all_sungbum.zip",
        "manifestUrl": "zips/sungbum_manifest.json"
    }
]

def build_search_index():
    """Build the search index from all corpus ZIPs."""
    print("Building lightweight search index for Classical Tibetan corpus...")

    all_text_entries = []
    documents = []
    idx_counter = 0

    # Configuration for lightweight index
    MAX_PREVIEW_CHARS = 2000  # Only store first 2000 chars for search preview

    # First, load all manifests
    print("\n1. Loading manifests...")
    for corpus in CORPORA:
        manifest_path = Path(corpus["manifestUrl"])
        if not manifest_path.exists():
            print(f"  ⚠ Warning: Manifest not found: {manifest_path}")
            continue

        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        print(f"  ✓ {corpus['label']}: {len(manifest)} texts")

        for entry in manifest:
            all_text_entries.append({
                "index": idx_counter,
                "corpusId": corpus["id"],
                "corpusLabel": corpus["label"],
                "zipUrl": corpus["zipUrl"],
                "path": entry["file"],
                "displayName": entry.get("title", entry["file"])
            })
            idx_counter += 1

    total_texts = len(all_text_entries)
    print(f"\nTotal texts to index: {total_texts}")

    # Extract texts from ZIPs (lightweight version)
    print("\n2. Extracting lightweight text previews from ZIPs...")
    print(f"   (storing only first {MAX_PREVIEW_CHARS} chars per document)")
    processed = 0

    for entry in all_text_entries:
        zip_path = Path(entry["zipUrl"])

        if not zip_path.exists():
            print(f"  ⚠ Warning: ZIP not found: {zip_path}")
            processed += 1
            continue

        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                try:
                    with zf.open(entry["path"]) as f:
                        content = f.read().decode('utf-8')

                    # Only store preview (first N chars) for search
                    preview = content[:MAX_PREVIEW_CHARS]

                    # Split preview into lines for context display
                    preview_lines = [line.strip() for line in preview.split('\n') if line.strip()]

                    documents.append({
                        "id": entry["index"],
                        "corpusId": entry["corpusId"],
                        "corpusLabel": entry["corpusLabel"],
                        "path": entry["path"],
                        "displayName": entry["displayName"],
                        "preview": preview,  # Only first N chars
                        "lines": preview_lines,  # Lines from preview only
                        "fullLength": len(content)  # Store full length for reference
                    })

                except KeyError:
                    print(f"  ⚠ Warning: File not found in ZIP: {entry['path']}")

        except Exception as e:
            print(f"  ⚠ Error processing {entry['path']}: {e}")

        processed += 1
        if processed % 1000 == 0:
            print(f"  Progress: {processed}/{total_texts} ({processed*100//total_texts}%)")

    print(f"  ✓ Extracted {len(documents)} document previews")

    # Save the index
    print("\n3. Saving search index...")
    index_data = {
        "version": "1.0",
        "documents": documents
    }

    # Save as regular JSON
    output_json = Path("zips/search_index.json")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False)
    json_size_mb = output_json.stat().st_size / (1024 * 1024)
    print(f"  ✓ Saved JSON: {output_json} ({json_size_mb:.2f} MB)")

    # Save as gzipped JSON (much smaller)
    output_gz = Path("zips/search_index.json.gz")
    with gzip.open(output_gz, 'wt', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False)
    gz_size_mb = output_gz.stat().st_size / (1024 * 1024)
    print(f"  ✓ Saved gzipped: {output_gz} ({gz_size_mb:.2f} MB)")
    print(f"  Compression ratio: {gz_size_mb/json_size_mb*100:.1f}%")

    print("\n✅ Search index built successfully!")
    print(f"\nTo use in the webapp, load: zips/search_index.json.gz")

if __name__ == "__main__":
    build_search_index()
