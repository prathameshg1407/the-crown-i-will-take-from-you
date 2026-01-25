#!/usr/bin/env python3
"""
Repair style blocks in chapter HTML files:

- Remove stray HTML comments like <!-- Google Fonts --> inside <style>...</style>
- Remove duplicate </style></style> created by earlier scripts
"""

from pathlib import Path
import re
import shutil
from datetime import datetime

CHAPTERS_DIR = Path("public/chapters")
BACKUP_DIR = Path("public/CHAPTERS_BACKUP_STYLE_REPAIR")
LOG_FILE = Path("style_repair.log")


def log(msg: str):
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")


def create_backup():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"backup_{timestamp}"
    if backup_path.exists():
        shutil.rmtree(backup_path)
    shutil.copytree(CHAPTERS_DIR, backup_path)
    log(f"✓ Backup created at: {backup_path}")
    return backup_path


def clean_style_blocks(html: str) -> str:
    """
    - Inside each <style>...</style>, remove <!-- ... --> comments
    - Remove duplicate </style></style> sequences
    """

    # 1) Remove HTML comments *inside* style blocks only
    def _strip_comments_in_style(match: re.Match) -> str:
        style_content = match.group(1)
        # Remove any <!-- ... --> inside the style content
        style_content_clean = re.sub(r'<!--.*?-->', '', style_content, flags=re.DOTALL)
        return "<style>" + style_content_clean + "</style>"

    # Replace each <style>...</style> with cleaned version
    html = re.sub(
        r'<style>(.*?)</style>',
        _strip_comments_in_style,
        html,
        flags=re.DOTALL | re.IGNORECASE
    )

    # 2) Remove immediate duplicate </style></style>
    html = re.sub(r'</style>\s*</style>', '</style>', html, flags=re.IGNORECASE)

    return html


def repair_file(path: Path):
    original = path.read_text(encoding="utf-8")
    repaired = clean_style_blocks(original)

    if repaired != original:
        path.write_text(repaired, encoding="utf-8")
        return True
    return False


def main():
    print("=== Repairing style blocks in chapter HTML files ===")
    if not CHAPTERS_DIR.exists():
        print(f"✗ Chapters dir not found: {CHAPTERS_DIR}")
        return

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = create_backup()

    html_files = sorted(CHAPTERS_DIR.glob("*.html"))
    changed = 0
    total = len(html_files)

    for i, f in enumerate(html_files, 1):
        touched = repair_file(f)
        if touched:
            changed += 1
            log(f"[{i}/{total}] ✓ Repaired {f.name}")
        else:
            # silent for unchanged files to keep log small; uncomment if you want full trace
            # log(f"[{i}/{total}] ⊘ No changes {f.name}")
            pass

    print("\n=== Repair summary ===")
    print(f"Total HTML files: {total}")
    print(f"Files modified:   {changed}")
    print(f"Backup:           {backup_path}")
    print(f"Log:              {LOG_FILE}")


if __name__ == "__main__":
    main()