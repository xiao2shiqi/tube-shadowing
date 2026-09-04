import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

try {
  // 1. Check landing page (no video loaded)
  await page.goto('http://localhost:8788/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/hero-landing.png' });
  console.log('Landing page screenshot saved');

  // 2. Check that the hero title is visible
  const heroTitle = await page.locator('h1').filter({ hasText: 'Tube Shadowing' }).first();
  const titleCount = await page.locator('h1').count();
  console.log('h1 count:', titleCount);

  // 3. Check there's no YouTube player visible yet
  const playerVisible = await page.locator('#yt-player').isVisible().catch(() => false);
  console.log('YouTube player visible:', playerVisible);

  // 4. Load a demo video by clicking in the hero search and selecting a demo
  await page.locator('input[placeholder*="YouTube URL"]').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/hero-dropdown.png' });
  console.log('Hero dropdown screenshot saved');

  // 5. Click first demo video
  const demoBtn = page.locator('button').filter({ hasText: "Steve Jobs" }).first();
  await demoBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/hero-after-load.png' });
  console.log('After load screenshot saved');

  // 6. Check that two-panel layout now shows
  const mainVisible = await page.locator('main').isVisible().catch(() => false);
  console.log('Main two-panel layout visible:', mainVisible);
} finally {
  await browser.close();
}
