import os
import re
import glob

CHAPTERS_DIR = r"d:\novels\the-crown-i-will-take-from-you\public\chapters"
REFERENCE_FILE = "0-a-drizzle-of-blood-cinematic-reader.html"

def standardize_file(filepath):
    filename = os.path.basename(filepath)
    if filename == REFERENCE_FILE:
        return False

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return False
    
    original_content = content
    
    # 1. Update CSS: .hero min-height 100vh -> 80vh
    # Regex: .hero { ... min-height: 100vh;
    def replace_hero_height(match):
        block = match.group(0)
        return block.replace('min-height: 100vh;', 'min-height: 80vh;') # Replaces 100vh with 80vh

    # This regex attempts to find valid CSS blocks for .hero
    css_hero_pattern = re.compile(r'\.hero\s*\{[^}]*\}', re.DOTALL)
    content = css_hero_pattern.sub(replace_hero_height, content)

    # 2. Update HTML Tailwind classes: min-h-[60vh] or min-h-[100vh] -> min-h-[80vh]
    # Regex looks for min-h-[...vh]
    # Note: Regex replacement needs to be careful.
    # We will replace any min-h-[\d+vh] with min-h-[80vh]
    tailwind_pattern = re.compile(r'min-h-\[\d+vh\]')
    content = tailwind_pattern.sub('min-h-[80vh]', content)
    
    # 3. Remove scroll-indicator div
    # <div class="scroll-indicator"> ... </div>
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
    return False

def main():
    files = glob.glob(os.path.join(CHAPTERS_DIR, "*.html"))
    count = 0
    updates = 0
    for file in files:
        if standardize_file(file):
            updates += 1
        count += 1
    print(f"Scanned {count} files. Updated {updates} files.")

if __name__ == "__main__":
    main()
