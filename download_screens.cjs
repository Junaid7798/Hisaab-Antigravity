const fs = require('fs');
const path = require('path');
const https = require('https');

const inputFilePath = 'C:/Users/Book4/.gemini/antigravity/brain/7e98a64f-356d-491b-a96e-b63a403e09c3/.system_generated/steps/75/output.txt';
const exportDir = path.join('d:/Hisaab', 'stitch_exports');

if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
}

fs.readFile(inputFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading file:", err);
        return;
    }

    try {
        const json = JSON.parse(data);
        const screens = json.screens || [];

        screens.forEach(screen => {
            if (screen.htmlCode && screen.htmlCode.downloadUrl) {
                const url = screen.htmlCode.downloadUrl;
                const ext = screen.htmlCode.mimeType === 'text/markdown' ? '.md' : '.html';
                const safeTitle = screen.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filename = `${safeTitle}${ext}`;
                const destPath = path.join(exportDir, filename);

                const file = fs.createWriteStream(destPath);
                https.get(url, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`Downloaded: ${filename}`);
                    });
                }).on('error', (err) => {
                    fs.unlink(destPath, () => {});
                    console.error(`Error downloading ${filename}: ${err.message}`);
                });
            }
        });
    } catch (e) {
        console.error("Error parsing JSON:", e);
    }
});
