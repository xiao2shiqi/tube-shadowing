import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});
const page = await context.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(`[ERROR] ${msg.text()}`);
    errors.push(msg.text());
  }
});

try {
  console.log('Opening https://shadowing.xiao27.com/...');
  await page.goto('https://shadowing.xiao27.com/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(4000);

  const iframes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('iframe')).map(f => f.src)
  );
  const hasRealClientId = iframes.some(src => src.includes('client_id=446265'));
  const hasOriginError = errors.some(e => e.includes('origin is not allowed'));
  console.log('client_id correctly set:', hasRealClientId);
  console.log('Origin error present:', hasOriginError);

  await page.screenshot({ path: '/tmp/before-click.png' });

  // Listen for a new popup window
  const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);

  // Click the button inside the GIS iframe
  try {
    const btnFrame = page.frameLocator('iframe[src*="accounts.google.com/gsi/button"]');
    await btnFrame.locator('div[role="button"]').click({ timeout: 5000 });
    console.log('Clicked Google button');
  } catch (e) {
    console.log('Click error:', e.message);
  }

  const popup = await popupPromise;
  if (popup) {
    console.log('Popup opened:', popup.url());
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    await popup.screenshot({ path: '/tmp/google-popup.png' });
    console.log('Popup screenshot saved to /tmp/google-popup.png');
  } else {
    console.log('No popup window detected — may be FedCM (browser UI, not a popup)');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/after-click.png' });
    console.log('After-click screenshot saved to /tmp/after-click.png');
  }
} finally {
  await browser.close();
}
