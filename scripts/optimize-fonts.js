const fs = require('fs');
const path = require('path');

const chaptersDir = path.join(__dirname, '../public/chapters');

function optimizeFonts() {
  if (!fs.existsSync(chaptersDir)) {
    console.log('⚠️  No chapters directory found. Skipping...');
    return;
  }

  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.html'));
  
  console.log(`🔤 Optimizing font loading for ${files.length} chapters...\n`);
  
  for (const file of files) {
    const filePath = path.join(chaptersDir, file);
    let html = fs.readFileSync(filePath, 'utf-8');
    
    // Replace blocking font load with optimized version
    const oldFontTag = /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*" rel="stylesheet">/;
    
    const newFontTags = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400&display=swap" rel="stylesheet"></noscript>`;
    
    if (oldFontTag.test(html)) {
      html = html.replace(oldFontTag, newFontTags);
      fs.writeFileSync(filePath, html);
      console.log(`✓ ${file}`);
    }
  }
  
  console.log(`\n✅ Font loading optimized!\n`);
}

optimizeFonts();