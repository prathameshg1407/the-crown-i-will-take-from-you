const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const sourceDir = path.join(__dirname, '../public/chapters');
const targetDir = path.join(__dirname, '../The Crown I Will Take From You');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

function processNode($, node) {
    if (node.type === 'text') {
        // Collapse all whitespace sequences to a single space
        return $(node).text().replace(/\s+/g, ' ');
    }
    
    if (node.type === 'tag') {
        const tagName = node.name;
        
        if (tagName === 'br') return '\n';
        
        let content = '';
        $(node).contents().each((_, child) => {
            content += processNode($, child);
        });
        
        if (tagName === 'p') {
            return content.trim() + '\n\n';
        } else if (tagName === 'blockquote') {
            return '> ' + content.trim().replace(/\n/g, '\n> ') + '\n\n';
        } else if (/^h[1-6]$/.test(tagName)) {
            const level = tagName[1];
            return '#'.repeat(level) + ' ' + content.trim() + '\n\n';
        } else if (tagName === 'strong' || tagName === 'b') {
            return '**' + content.trim() + '**'; // trim inside bold? usually safe
        } else if (tagName === 'em' || tagName === 'i') {
            return '*' + content.trim() + '*';
        } else if (tagName === 'li') {
            return '- ' + content.trim() + '\n';
        } else if (tagName === 'ul') {
            return content + '\n';
        } else if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
             // For block containers, we just return content, but maybe we want to ignore whitespace only content if it's just spacing between blocks?
             // Since we collapse whitespace in text nodes to ' ', a long indentation string becomes ' '.
             // If we have <section>\n<p>...</p>\n</section>, the \n becomes ' '.
             // So we get ' ' + p-content + ' '.
             // We can probably trim generic block containers too? 
             // BE CAREFUL: inline divs?
             return content; 
        } else {
            return content;
        }
    }
    
    return '';
}

fs.readdir(sourceDir, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        process.exit(1);
    }

    let count = 0;
    files.forEach(file => {
        if (path.extname(file) === '.html') {
            const filePath = path.join(sourceDir, file);
            const html = fs.readFileSync(filePath, 'utf8');
            const $ = cheerio.load(html);

            let title = $('h1.hero-title').text().replace(/\s+/g, ' ').trim();
            if (!title) title = $('title').text().trim();

            let content = '';
            
            const container = $('article.container');
            if (container.length) {
                content = processNode($, container[0]);
            } else {
                content = processNode($, $('body')[0]);
            }

            // Post-processing cleanup
            // Remove ' ' that resulted from indentation between block elements
            // We expect paragraphs to be separated by '\n\n'.
            // content might look like " p-content\n\n p-content\n\n "
            // We can simple replace " \n" with "\n" and "\n " with "\n"? 
            
            // Or better: valid markdown usually doesn't care about single spaces between blocks, but for cleanliness:
            content = content.trim();
            
            // Clean up: 
            // 1. Multiple spaces -> single space (already done per node, but good to check)
            // 2. More than 2 newlines -> 2 newlines
            // 3. Trailing/Leading spaces on lines?
            
            content = content
                .split('\n').map(line => line.trim()).join('\n') // Trim every line
                .replace(/\n{3,}/g, '\n\n'); // Max 2 newlines

            const mdContent = `# ${title}\n\n${content}`;
            
            const outName = path.basename(file, '.html') + '.md';
            fs.writeFileSync(path.join(targetDir, outName), mdContent);
            count++;
        }
    });
    
    console.log(`Successfully extracted ${count} chapters to "${targetDir}"`);
});
