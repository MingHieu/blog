import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const puppeteer = require('/Users/minghieu/.gemini/antigravity/skills/chrome-devtools/scripts/node_modules/puppeteer');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '../dist');
const PUBLIC_DIR = path.join(__dirname, '../public');
const PORT = 4321;

// Mime types for static server
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

// Create temporary HTTP static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  
  // Handle Astro's /blog base URL prefix
  if (reqPath.startsWith('/blog')) {
    reqPath = reqPath.slice(5);
  }
  
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }
  
  let filePath = path.join(DIST_DIR, reqPath);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`[OG Capture] Started temporary server on port ${PORT}`);
  
  let browser;
  try {
    // 1. Scan dist directory for all HTML pages
    const pages = [];
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file === 'index.html') {
          pages.push(fullPath);
        }
      }
    }
    scanDir(DIST_DIR);

    console.log(`[OG Capture] Found ${pages.length} pages to screenshot.`);

    // 2. Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    // Standard Open Graph image dimensions (1200x630) with Retina scale factor for high crisp resolution
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

    // 3. Navigate and screenshot each route
    for (const htmlFile of pages) {
      const relativePath = path.relative(DIST_DIR, htmlFile);
      const routePath = relativePath.substring(0, relativePath.length - 10); // e.g. "about/" or "mobile/some-post/"
      
      // Format screenshot file name based on route path
      const cleanRoute = routePath.replace(/\/$/, '');
      const ogPathSegment = cleanRoute === '' ? 'index' : cleanRoute;
      
      const url = `http://localhost:${PORT}/blog/${routePath}?og=true`;
      const publicOutputFile = path.join(PUBLIC_DIR, 'images/og', `${ogPathSegment}.png`);
      const distOutputFile = path.join(DIST_DIR, 'images/og', `${ogPathSegment}.png`);

      console.log(`[OG Capture] Capturing: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      // Short delay to ensure CSS styles and Google fonts are completely rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Ensure destination directories exist
      fs.mkdirSync(path.dirname(publicOutputFile), { recursive: true });
      fs.mkdirSync(path.dirname(distOutputFile), { recursive: true });
      
      // Take screenshot and save to public/
      await page.screenshot({ path: publicOutputFile, type: 'png' });
      
      // Copy to dist/
      fs.copyFileSync(publicOutputFile, distOutputFile);
    }
    
    console.log('[OG Capture] Completed screenshotting all pages.');
  } catch (err) {
    console.error('[OG Capture] Error generating screenshots:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close(() => {
      console.log('[OG Capture] Stopped temporary server.');
      process.exit(0);
    });
  }
});
