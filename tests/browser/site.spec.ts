import { expect, test } from '@playwright/test';
import rawSite from '../../src/content/site.json' with { type: 'json' };
import { siteSchema, youtubeEmbed } from '../../src/lib/content.ts';

const site = siteSchema.parse(rawSite);

test('artist pages, local assets, theme switch and responsive layout work', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(site.artist.tagline);
  await expect(page.locator('html')).toHaveAttribute('data-theme', site.appearance.theme);
  await page.getByRole('button', { name: 'Switch to alternate theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', site.appearance.theme === 'midnight' ? 'paper' : 'midnight');
  const release = site.releases.find((item) => item.published);
  if (release && site.sections.includes('music')) await expect(page.getByRole('heading', { name: release.title, exact: true })).toBeVisible();
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) =>
      element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  if (release && site.sections.includes('music')) {
    await page.getByRole('link', { name: 'Explore the music' }).click();
    await expect(page).toHaveURL(/#music$/);
  }
});

test('YouTube content is not requested until the visitor loads the player', async ({ page }) => {
  const video = site.videos.find((item) => item.published);
  test.skip(!video || !site.sections.includes('videos'), 'No published video section in this configuration.');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/youtube|soundcloud|spotify|apple\.com/.test(request.url())) requests.push(request.url());
  });
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({
    contentType: 'text/html', body: '<html><body>Mock video player</body></html>',
  }));
  await page.goto('./');
  expect(requests).toHaveLength(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load video player' }).first().click();
  await expect(page.locator('iframe')).toHaveAttribute('src', youtubeEmbed(video!.url)!);
  await expect(page.getByRole('status').first()).toContainText('Player loaded');
});

test('unconfigured editor reports missing authentication and offers real repository editing', async ({ page }) => {
  test.skip(Boolean(process.env.PUBLIC_CMS_AUTH_ORIGIN), 'This check applies only before OAuth setup.');
  await page.goto('./admin/');
  await expect(page.getByRole('heading', { name: 'Authentication setup required' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open content editor' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit content in GitHub' })).toHaveAttribute('href',
    `https://github.com/${process.env.PUBLIC_GITHUB_REPOSITORY || 'spaceturismo/vibeout-artist-site-template'}/edit/main/src/content/site.json`);
  await page.getByRole('link', { name: /Read the administration guide/ }).click();
  await expect(page.getByRole('heading', { name: 'Updating your artist website' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Publish and verify' })).toBeVisible();
});
