import os
import glob

CHAPTERS_DIR = r"d:\novels\the-crown-i-will-take-from-you\public\chapters"

def check_empty_files():
    files = glob.glob(os.path.join(CHAPTERS_DIR, "*.html"))
    empty_files = []
    for file in files:
        if os.path.getsize(file) == 0:
            empty_files.append(os.path.basename(file))
    
    if empty_files:
        print("Found empty files:")
        for f in empty_files:
            print(f)
    else:
        print("No empty files found.")

if __name__ == "__main__":
    check_empty_files()
