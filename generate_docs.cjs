const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const exportsDir = path.join(__dirname, 'stitch_exports');
const docsDir = path.join(__dirname, 'doc');

if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

const files = fs.readdirSync(exportsDir);

files.forEach(file => {
    if (!file.endsWith('.html')) return;
    
    const content = fs.readFileSync(path.join(exportsDir, file), 'utf8');
    const $ = cheerio.load(content);
    
    let md = `# Screen: ${file.replace('.html', '')}\n\n`;
    md += `## Overview\nThis document auto-generates the breakdown of everything on the screen.\n\n`;
    
    md += `## Headings\n`;
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
        md += `- **${el.tagName.toUpperCase()}**: ${$(el).text().trim().replace(/\s+/g, ' ')}\n`;
    });
    
    md += `\n## Interactive Elements (Buttons & Links)\n`;
    $('button, a').each((i, el) => {
        const type = el.tagName.toUpperCase();
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        const id = $(el).attr('id') || 'None';
        const classes = $(el).attr('class') || 'None';
        const attrs = type === 'A' ? `href="${$(el).attr('href')}"` : `type="${$(el).attr('type') || 'button'}"`;
        if (text || $(el).find('svg').length > 0) {
            md += `- **${type}** [Text: "${text || 'Icon'}"] - ID: \`${id}\`, Classes: \`${classes}\`, ${attrs}\n`;
        }
    });
    
    md += `\n## Forms & Inputs\n`;
    $('input, select, textarea').each((i, el) => {
        const type = el.tagName.toUpperCase();
        const inputType = $(el).attr('type') || 'text';
        const name = $(el).attr('name') || 'None';
        const id = $(el).attr('id') || 'None';
        const placeholder = $(el).attr('placeholder') || 'None';
        const classes = $(el).attr('class') || 'None';
        md += `- **${type}** [type: ${inputType}, name: ${name}, id: ${id}] - Placeholder: "${placeholder}", Classes: \`${classes}\`\n`;
    });

    const docFilename = file.replace('.html', '.md');
    fs.writeFileSync(path.join(docsDir, docFilename), md);
    console.log(`Generated doc for ${file}`);
});
