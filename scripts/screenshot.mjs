import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));

try {
  await page.goto('https://shadowing.xiao27.com/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(5000);

  // Inject debug script to check GIS state
  const result = await page.evaluate(() => {
    const gis = window.google?.accounts?.id;
    return {
      hasGIS: !!gis,
      // Check what the button iframe actually has
      iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src.slice(0, 200)),
    };
  });
  console.log('GIS state:', JSON.stringify(result, null, 2));

  await page.screenshot({ path: '/tmp/tube-shadowing-debug2.png' });
} finally {
  await browser.close();
}
