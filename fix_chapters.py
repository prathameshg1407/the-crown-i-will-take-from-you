#!/usr/bin/env python3
"""
Complete Ambient Indicator Cleaner v2
Removes ALL ambient-related elements including orphaned parts
"""

import os
import re
from pathlib import Path

# Configuration
CHAPTERS_DIR = r"D:\NOVELS\THE-CROWN-I-WILL-TAKE-FROM-YOU\PUBLIC\CHAPTERS"
START_CHAPTER = 1
END_CHAPTER = 378

def get_chapter_number(filename):
    """Extract chapter number from filename."""
    match = re.match(r'^(\d+)-', filename)
    if match:
        return int(match.group(1))
    return None

def should_process_file(filename):
    """Check if file should be processed based on chapter number."""
    chapter_num = get_chapter_number(filename)
    if chapter_num is None:
        return False
    return START_CHAPTER <= chapter_num <= END_CHAPTER

def clean_ambient_completely(content):
    """Remove ALL ambient-related elements completely."""
    
    original_content = content
    
    # =========================================
    # STEP 1: Remove complete ambient indicator blocks
    # =========================================
    
    # Pattern: Full ambient div block (most comprehensive)
    patterns_full_block = [
        # Fixed position ambient container with all contents
        r'<div[^>]*class="[^"]*fixed\s+bottom-\d+\s+right-\d+[^"]*"[^>]*>.*?</div>\s*</div>\s*',
        r'<div[^>]*class="[^"]*fixed[^"]*bottom[^"]*right[^"]*z-50[^"]*"[^>]*>.*?</div>\s*',
        
        # Reader-hide ambient
        r'<div[^>]*class="[^"]*reader-hide[^"]*fixed[^"]*"[^>]*>.*?</div>\s*',
        r'<div[^>]*class="[^"]*fixed[^"]*reader-hide[^"]*"[^>]*>.*?</div>\s*',
    ]
    
    for pattern in patterns_full_block:
        content = re.sub(pattern, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # =========================================
    # STEP 2: Remove orphaned animation bar divs
    # These are the small colored bars that animate
    # =========================================
    
    animation_bar_patterns = [
        # Individual animation bars
        r'<div\s+class="w-1\s+bg-(?:purple|green|cyan|red|amber|blue|yellow|pink|orange)-\d+\s+h-\d+(?:\s+animate-pulse)?(?:\s+delay-\d+)?"[^>]*>\s*</div>\s*',
        r'<div\s+class="w-1[^"]*bg-[^"]*animate-pulse[^"]*"[^>]*>\s*</div>\s*',
        r'<div\s+class="[^"]*animate-pulse[^"]*w-1[^"]*"[^>]*>\s*</div>\s*',
    ]
    
    for pattern in animation_bar_patterns:
        content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # =========================================
    # STEP 3: Remove orphaned closing divs and spans after body
    # =========================================
    
    # Pattern: Orphaned </div> after body opening (before main content)
    # This catches: <body...>\n</div>\n<span>...</span>\n</div>
    orphan_pattern1 = r'(<body[^>]*>)\s*</div>\s*'
    content = re.sub(orphan_pattern1, r'\1\n', content, flags=re.DOTALL)
    
    # =========================================
    # STEP 4: Remove ambient text spans
    # =========================================
    
    ambient_span_patterns = [
        # Span with "Ambient: XYZ"
        r'<span[^>]*>[^<]*Ambient\s*:\s*[^<]*</span>\s*',
        # Span with just the ambient name (Victory, Prophecy, etc.)
        r'<span[^>]*class="[^"]*text-xs[^"]*font-ui[^"]*tracking-widest[^"]*"[^>]*>[^<]*</span>\s*',
        r'<span[^>]*class="[^"]*font-ui[^"]*text-neutral-400[^"]*uppercase[^"]*"[^>]*>[^<]*</span>\s*',
    ]
    
    for pattern in ambient_span_patterns:
        content = re.sub(pattern, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # =========================================
    # STEP 5: Remove orphaned container divs
    # =========================================
    
    orphan_container_patterns = [
        # Empty flex container that held animation bars
        r'<div\s+class="[^"]*flex\s+gap-1\s+h-3\s+items-end[^"]*"[^>]*>\s*</div>\s*',
        r'<div\s+class="flex\s+gap-1[^"]*"[^>]*>\s*</div>\s*',
        
        # Orphaned closing tags after body
        r'(<body[^>]*>)\s*</div>\s*</div>\s*',
        r'(<body[^>]*>)\s*</div>\s*',
    ]
    
    for pattern in orphan_container_patterns:
        if '\\1' in pattern or r'\1' in pattern:
            content = re.sub(pattern, r'\1\n', content, flags=re.DOTALL)
        else:
            content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # =========================================
    # STEP 6: Clean up after body tag specifically
    # Remove any junk between <body> and <div class="bg-gradient">
    # =========================================
    
    # This is the most aggressive pattern - clean everything between body and bg-gradient/main
    body_cleanup_pattern = r'(<body[^>]*>)\s*(?:<div[^>]*class="w-1[^"]*"[^>]*></div>\s*)*(?:</div>\s*)*(?:<span[^>]*>[^<]*</span>\s*)*(?:</div>\s*)*(\s*<div class="bg-gradient">|\s*<main)'
    content = re.sub(body_cleanup_pattern, r'\1\n  \2', content, flags=re.DOTALL)
    
    # =========================================
    # STEP 7: Remove any remaining orphaned elements after body
    # =========================================
    
    # Pattern to clean: <body...>JUNK<div class="bg-gradient"> or <body...>JUNK<main
    def clean_body_section(match):
        body_tag = match.group(1)
        next_element = match.group(2)
        return f'{body_tag}\n  {next_element}'
    
    body_pattern = r'(<body[^>]*>)[^<]*(?:<[^>]*>[^<]*)*?(\s*<(?:div\s+class="bg-gradient"|main))'
    
    # Only apply if there's junk between body and main content
    if re.search(r'<body[^>]*>\s*<div\s+class="w-1', content):
        content = re.sub(body_pattern, clean_body_section, content, flags=re.DOTALL)
    
    # =========================================
    # STEP 8: Final cleanup - remove multiple blank lines
    # =========================================
    
    content = re.sub(r'\n\s*\n\s*\n\s*\n', '\n\n', content)
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    return content, content != original_content

def process_file(filepath):
    """Process a single HTML file."""
    filename = filepath.name
    chapter_num = get_chapter_number(filename)
    
    if chapter_num is None:
        return 'skipped'
    
    print(f"  Processing: {filename}", end="")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for various ambient indicators
        has_ambient = any([
            'Ambient' in content,
            'ambient' in content,
            'animate-pulse' in content and 'w-1' in content,
            'bg-purple-500 h-' in content,
            'bg-green-500 h-' in content,
            'bg-cyan-500 h-' in content,
        ])
        
        if not has_ambient:
            print(" - Clean")
            return 'already_clean'
        
        # Clean ambient indicators
        new_content, modified = clean_ambient_completely(content)
        
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(" ✓ Cleaned")
            return 'cleaned'
        else:
            print(" - No changes needed")
            return 'no_changes'
            
    except Exception as e:
        print(f" ✗ ERROR: {e}")
        return 'error'

def verify_file(filepath):
    """Verify a file is clean."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        issues = []
        
        if 'Ambient:' in content or 'Ambient :' in content:
            issues.append("Contains 'Ambient:'")
        
        if re.search(r'<div[^>]*class="w-1[^"]*animate-pulse', content):
            issues.append("Contains animation bars")
        
        if re.search(r'<body[^>]*>\s*</div>', content):
            issues.append("Has orphaned </div> after body")
        
        if re.search(r'<body[^>]*>\s*<div[^>]*class="w-1', content):
            issues.append("Has orphaned div after body")
            
        return issues
    except:
        return ["Error reading file"]

def main():
    """Main function."""
    print("=" * 60)
    print("COMPLETE AMBIENT CLEANER v2")
    print("=" * 60)
    print(f"Directory: {CHAPTERS_DIR}")
    print(f"Range: Chapter {START_CHAPTER} to {END_CHAPTER}")
    print("=" * 60)
    print()
    
    chapters_dir = Path(CHAPTERS_DIR)
    
    if not chapters_dir.exists():
        print(f"ERROR: Directory not found: {CHAPTERS_DIR}")
        return
    
    # Get target files
    html_files = list(chapters_dir.glob("*.html"))
    target_files = [f for f in html_files if should_process_file(f.name)]
    target_files.sort(key=lambda x: get_chapter_number(x.name) or 0)
    
    print(f"Found {len(html_files)} HTML files")
    print(f"Processing {len(target_files)} chapter files")
    print("=" * 60)
    print()
    
    # First pass: Clean files
    print("PASS 1: Cleaning files...")
    print("-" * 40)
    results = {}
    for filepath in target_files:
        results[filepath.name] = process_file(filepath)
    
    # Second pass: Verify and re-clean if needed
    print()
    print("PASS 2: Verifying and re-cleaning...")
    print("-" * 40)
    
    needs_attention = []
    for filepath in target_files:
        issues = verify_file(filepath)
        if issues:
            print(f"  {filepath.name}: {', '.join(issues)}")
            # Try to clean again
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            new_content, _ = clean_ambient_completely(content)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            # Check again
            issues = verify_file(filepath)
            if issues:
                needs_attention.append((filepath.name, issues))
                print(f"    Still has issues after re-clean")
            else:
                print(f"    ✓ Fixed on second pass")
    
    # Summary
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    counts = {}
    for result in results.values():
        counts[result] = counts.get(result, 0) + 1
    
    for status, count in sorted(counts.items()):
        symbol = "✓" if status in ['cleaned', 'already_clean', 'no_changes'] else "✗"
        print(f"  {symbol} {status}: {count}")
    
    print("=" * 60)
    
    if needs_attention:
        print()
        print("FILES STILL NEEDING MANUAL ATTENTION:")
        print("-" * 40)
        for filename, issues in needs_attention:
            print(f"  {filename}: {', '.join(issues)}")
    else:
        print("  ✓ All files are clean!")
    
    print("=" * 60)

if __name__ == "__main__":
    main()