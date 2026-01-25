import os
import re
import glob

CHAPTERS_DIR = r"d:\novels\the-crown-i-will-take-from-you\public\chapters"
REFERENCE_FILE = "0-a-drizzle-of-blood-cinematic-reader.html"

def standardize_file(filepath):
    filename = os.path.basename(filepath)
    if filename == REFERENCE_FILE:
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 1. Update CSS: .hero min-height 100vh -> 80vh
    # Look for .hero { ... min-height: 100vh ... }
    # We use a pattern that finds .hero block start, matches until min-height:, then changes 100vh to 80vh
    # Note: Regex crossing lines needs flags=re.DOTALL
    
    # Strategy: Find the exact string if possible, or use a sophisticated regex.
    # The CSS is usually indented.
    # Pattern: .hero { ... min-height: 100vh;
    
    # This regex looks for .hero definition and captures the content to ensure we are modifying the right class
    # However, since the files are relatively uniform, we can try to be specific about the context.
    
    # Using a callback to ensure we are inside .hero block
    def replace_hero_height(match):
        block = match.group(0)
        return block.replace('min-height: 100vh;', 'min-height: 80vh;')

    # Regex matches: .hero { [anything until closing brace] }
    # optimized to not be too greedy (using [^}]*)
    css_hero_pattern = re.compile(r'\.hero\s*\{[^}]*\}', re.DOTALL)
    
    content = css_hero_pattern.sub(replace_hero_height, content)

    # 2. Remove scroll-indicator div
    # <div class="scroll-indicator"> ... </div>
    # Using specific pattern:
    scroll_indicator_pattern = re.compile(
        r'\s*<div class="scroll-indicator">\s*<svg.*?</svg>\s*</div>', 
        re.DOTALL
    )
    
    content = scroll_indicator_pattern.sub('', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filename}")
        return True
    else:
        # Check if it was already correct or regex failed
        # print(f"No changes needed: {filename}")
        return False

def main():
    files = glob.glob(os.path.join(CHAPTERS_DIR, "*.html"))
    count = 0
    for file in files:
        if standardize_file(file):
            count += 1
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
