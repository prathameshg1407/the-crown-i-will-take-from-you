# download_novel.py
# Auto-scrapes and downloads "Do Your Best and Regret It" novel
import requests
from bs4 import BeautifulSoup
import os
import time
import re

# Novel configuration
NOVEL_NAME = "Do Your Best and Regret It"
MAIN_PAGE_URL = "https://novellatte.blogspot.com/2023/09/do-your-best-and-regret-it-novel.html"

# Create novel folder and chapters subfolder
novel_folder = NOVEL_NAME
chapters_folder = os.path.join(novel_folder, "chapters")
os.makedirs(chapters_folder, exist_ok=True)

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

print("=" * 70)
print(f"📚 {NOVEL_NAME}")
print("=" * 70)
print(f"🔍 Fetching chapter links from main page...")
print(f"URL: {MAIN_PAGE_URL}\n")

# Step 1: Scrape all chapter links from main page
try:
    response = requests.get(MAIN_PAGE_URL, headers=headers, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all chapter links
    chapter_links = []
    post_body = soup.find("div", class_="post-body")
    
    if post_body:
        # Find all links in the post body
        all_links = post_body.find_all("a", href=True)
        
        for link in all_links:
            href = link['href']
            text = link.get_text(strip=True)
            
            # Filter for chapter links (contains 'chapter', 'prologue', or 'epilogue')
            if any(keyword in href.lower() for keyword in ['chapter', 'prologue', 'epilogue']):
                if 'novellatte.blogspot.com' in href:
                    chapter_links.append({
                        'url': href,
                        'text': text
                    })
    
    print(f"✅ Found {len(chapter_links)} chapter links\n")
    
    if len(chapter_links) == 0:
        print("❌ No chapter links found. The page structure might have changed.")
        print("Please check the URL manually.")
        exit(1)
    
    # Save links to file for reference
    links_file = os.path.join(novel_folder, "chapter_links.txt")
    with open(links_file, "w", encoding="utf-8") as f:
        for i, link in enumerate(chapter_links):
            f.write(f"{i}\t{link['url']}\t{link['text']}\n")
    print(f"💾 Saved links to: {links_file}\n")

except Exception as e:
    print(f"❌ Failed to fetch main page: {e}")
    exit(1)

# Step 2: Download all chapters
print(f"Saving chapters to: {chapters_folder}")
print("=" * 70 + "\n")

success = 0
skipped = 0
failed = []

for i, link_data in enumerate(chapter_links):
    url = link_data['url']
    ch_text = link_data['text']
    
    # Create filename
    if 'prologue' in url.lower():
        filename = f"{chapters_folder}/000_prologue.txt"
        ch_name = "Prologue"
    elif 'epilogue' in url.lower():
        filename = f"{chapters_folder}/999_epilogue.txt"
        ch_name = "Epilogue"
    else:
        # Extract chapter number from URL or text
        ch_match = re.search(r'chapter[- ]?(\d+)', url.lower())
        if ch_match:
            ch_num = int(ch_match.group(1))
            filename = f"{chapters_folder}/{ch_num:03d}_chapter.txt"
            ch_name = f"Chapter {ch_num}"
        else:
            filename = f"{chapters_folder}/{i:03d}_chapter.txt"
            ch_name = f"Chapter {i}"
    
    # Check if already exists
    if os.path.exists(filename):
        print(f"{ch_name:20s} → ⏭️  SKIPPED (already exists)")
        skipped += 1
        continue
    
    print(f"{ch_name:20s} → ", end="", flush=True)
    
    try:
        r = requests.get(url, headers=headers, timeout=20)
        
        if r.status_code == 404:
            print(f"❌ NOT FOUND (404)")
            failed.append({'name': ch_name, 'url': url, 'error': '404'})
            time.sleep(1)
            continue
        
        if r.status_code != 200:
            print(f"❌ FAILED (HTTP {r.status_code})")
            failed.append({'name': ch_name, 'url': url, 'error': f'HTTP {r.status_code}'})
            time.sleep(1)
            continue
        
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Get title
        title_tag = soup.find("h3", class_="post-title") or soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ch_name
        
        # Get content
        body = soup.find("div", class_="post-body")
        if not body:
            print("❌ No content found")
            failed.append({'name': ch_name, 'url': url, 'error': 'No content'})
            time.sleep(1)
            continue
        
        # Remove unwanted elements
        for unwanted in body.select("script, style, iframe, .separator, .ad, .advertisement"):
            unwanted.decompose()
        
        # Get clean text
        text = body.get_text(separator="\n", strip=True)
        text = text.replace("\xa0", " ")
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Validate content length
        if len(text) < 100:
            print(f"❌ Content too short ({len(text)} chars)")
            failed.append({'name': ch_name, 'url': url, 'error': 'Too short'})
            time.sleep(1)
            continue
        
        # Save to file
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"{title}\n")
            f.write("=" * 70 + "\n\n")
            f.write(text)
        
        print(f"✅ DONE ({len(text):,} chars)")
        success += 1
        time.sleep(1.5)  # Be nice to the server
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted by user")
        break
    except requests.exceptions.Timeout:
        print(f"❌ TIMEOUT")
        failed.append({'name': ch_name, 'url': url, 'error': 'Timeout'})
        time.sleep(2)
    except requests.exceptions.ConnectionError:
        print(f"❌ CONNECTION ERROR")
        failed.append({'name': ch_name, 'url': url, 'error': 'Connection error'})
        time.sleep(3)
    except Exception as e:
        print(f"❌ ERROR: {str(e)[:40]}")
        failed.append({'name': ch_name, 'url': url, 'error': str(e)[:50]})
        time.sleep(2)

# Summary
print("\n" + "=" * 70)
print(f"✨ DOWNLOAD COMPLETE!")
print("=" * 70)
print(f"✅ Successfully downloaded: {success} chapters")
print(f"⏭️  Skipped (already exist): {skipped} chapters")
print(f"📁 Total in folder:         {success + skipped} chapters")

if failed:
    print(f"\n❌ Failed chapters ({len(failed)}):")
    for f in failed[:10]:  # Show first 10 failures
        print(f"   • {f['name']}: {f['error']}")
    if len(failed) > 10:
        print(f"   ... and {len(failed) - 10} more")
    print("\n💡 You can re-run the script to retry failed chapters.")
    
    # Save failed links
    failed_file = os.path.join(novel_folder, "failed_chapters.txt")
    with open(failed_file, "w", encoding="utf-8") as f:
        for fail in failed:
            f.write(f"{fail['name']}\t{fail['url']}\t{fail['error']}\n")
    print(f"💾 Failed chapters saved to: {failed_file}")
else:
    print(f"\n🎉 All chapters downloaded successfully!")

print("=" * 70)