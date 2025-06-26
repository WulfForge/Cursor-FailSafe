const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EXTENSION_ID = 'failsafe-cursor';
const EXTENSION_NAME = 'FailSafe';
const ICON_PATH = 'images/icon.png';
const MYTHOLOGIQ_PATH = 'images/MythologIQ.png';
const PACKAGE_JSON = require('../package.json');

// Helper to get version
const version = PACKAGE_JSON.version;

test.describe('FailSafe Branding', () => {
  test('Header and footer branding enforced', async ({ page }) => {
    // Open the extension's Preview panel (simulate command)
    await page.goto('http://localhost:3000/preview?tab=dashboard');

    // Header: icon + FailSafe
    const headerIcon = await page.locator(`header img[src*="icon.png"]`);
    await expect(headerIcon).toBeVisible();
    const headerText = await page.locator('header').textContent();
    expect(headerText).toContain('FailSafe');

    // Footer: version + MythologIQ logo
    const footer = await page.locator('footer');
    await expect(footer).toBeVisible();
    const footerText = await footer.textContent();
    expect(footerText).toContain(version);
    const mythologiqLogo = await footer.locator(`img[src*="MythologIQ.png"]`);
    await expect(mythologiqLogo).toBeVisible();
  });
}); 