const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

const chaptersDir = path.join(__dirname, '../public/chapters');

async function optimizeChapters() {
  if (!fs.existsSync(chaptersDir)) {
    console.log('⚠️  Creating chapters directory...');
    fs.mkdirSync(chaptersDir, { recursive: true });
  }

  const files = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.html'));
  
  if (files.length === 0) {
    console.log('⚠️  No chapters found to optimize.');
    return;
  }

  console.log(`🚀 Optimizing ${files.length} chapters...\n`);
  
  let totalSaved = 0;
  
  for (const file of files) {
    const filePath = path.join(chaptersDir, file);
    const html = fs.readFileSync(filePath, 'utf-8');
    const originalSize = Buffer.byteLength(html, 'utf-8');
    
    // Remove Tailwind CDN
    let optimized = html
      .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/g, '')
      .replace(/<script>\s*tailwind\.config[\s\S]*?<\/script>\s*/g, '');
    
    // Optimize font loading
    optimized = optimized.replace(
      /<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*" rel="stylesheet">/,
      `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Lato:wght@300;400&display=swap" rel="stylesheet" media="print" onload="this.media='all'">`
    );
    
    // Minify
    optimized = await minify(optimized, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
    });
    
    const newSize = Buffer.byteLength(optimized, 'utf-8');
    const saved = originalSize - newSize;
    totalSaved += saved;
    
    fs.writeFileSync(filePath, optimized);
    
    console.log(`✓ ${file.padEnd(25)} ${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB`);
  }
  
  console.log(`\n✅ Optimized ${files.length} chapters`);
  console.log(`📊 Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)}MB\n`);
}

optimizeChapters().catch(console.error);