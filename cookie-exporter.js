// cookie-exporter.js
const { chromium } = require('patchright');
const fs = require('fs');
const path = require('path');

const BROWSER_DATA = '/browser-data-cookies';
const OUTPUT_DIR = '/cookies';
const SITES_FILE = '/app/sites.txt';
const isAuto = process.argv.includes('--auto');

// Load sites from sites.txt
let SITES = [];
if (fs.existsSync(SITES_FILE)) {
  const fileContent = fs.readFileSync(SITES_FILE, 'utf-8');
  SITES = fileContent.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(url => {
      // Derive a clean name from the URL (e.g., "youtube" from "https://www.youtube.com")
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const name = hostname.split('.')[0]; 
      return { name, url };
    });
}

if (SITES.length === 0) {
  console.error('No sites found in sites.txt. Please add URLs (one per line).');
  process.exit(1);
}

async function exportCookies() {
  console.log('Launching browser...');
  const context = await chromium.launchPersistentContext(BROWSER_DATA, {
    headless: isAuto,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-gpu',
      '--window-size=1280,800'
    ],
    viewport: { width: 1280, height: 800 },
  });

  // Open all sites in tabs first
  const pages = [];
  for (const site of SITES) {
    try {
      const page = await context.newPage();
      console.log(`Loading ${site.name} (${site.url})...`);
      await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      pages.push(page);
    } catch (e) {
      console.error(`Failed to load ${site.name}:`, e.message);
      pages.push(null);
    }
  }

  if (!isAuto) {
    console.log('------------------------------------------------');
    console.log('MANUAL MODE: Browser is open.');
    console.log('Open http://localhost:3011 (or your server IP) in your web browser.');
    console.log('VNC Password: 270505');
    console.log('You have 10 minutes to log in to your accounts.');
    console.log('------------------------------------------------');
    
    // Wait 10 minutes (600,000 ms) to give you time to log in
    await new Promise(r => setTimeout(r, 600000));
    console.log('Time is up! Capturing cookies now...');
  } else {
    // Automated mode just waits 5 seconds for cookies to settle
    await new Promise(r => setTimeout(r, 5000));
  }

  // Capture cookies from all sites
  const allCookies = [];
  for (let i = 0; i < SITES.length; i++) {
    const site = SITES[i];
    if (!pages[i]) continue;
    
    try {
      const siteCookies = await context.cookies(site.url);
      console.log(`${site.name}: ${siteCookies.length} cookies captured`);
      allCookies.push(...siteCookies);
    } catch (e) {
      console.error(`Error exporting ${site.name}:`, e.message);
    }
    await pages[i].close();
  }

  if (allCookies.length === 0) {
    console.log('No cookies captured. Exiting without writing files.');
    await context.close();
    return;
  }

  // 1. Write combined JSON
  const jsonPath = path.join(OUTPUT_DIR, 'cookies.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allCookies, null, 2));
  console.log(`Saved combined JSON: ${jsonPath}`);

  // 2. Write combined Netscape TXT
  const txtPath = path.join(OUTPUT_DIR, 'cookies.txt');
  let txt = '# Netscape HTTP Cookie File\n# This is a generated file! Do not edit.\n\n';
  
  for (const c of allCookies) {
    const domain = c.domain;
    const flag = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expires = c.expires > 0 ? Math.floor(c.expires) : 0;
    
    txt += [
      domain, 
      flag, 
      c.path, 
      secure, 
      expires, 
      c.name, 
      c.value
    ].join('\t') + '\n';
  }
  
  fs.writeFileSync(txtPath, txt);
  console.log(`Saved combined TXT: ${txtPath}`);

  await context.close();
  console.log('Done. Browser closed.');
}

exportCookies().catch(e => { 
  console.error('Fatal:', e); 
  process.exit(1); 
});
