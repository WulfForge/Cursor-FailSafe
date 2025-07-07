const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EXTENSION_ID = 'failsafe-cursor';
const EXTENSION_NAME = 'FailSafe';
const PACKAGE_JSON = require('../../package.json');

test.describe('FailSafe Preview Panel', () => {
    let serverPort = 3000;

    test.beforeEach(async ({ page }) => {
        // Start the extension development host
        // This would typically be done via VS Code Extension Development Host
        // For testing, we'll simulate the preview panel directly
        
        // Check if the server is running
        try {
            const response = await page.goto(`http://localhost:${serverPort}/health`);
            if (!response.ok()) {
                throw new Error('Server not running');
            }
        } catch (error) {
            console.warn('Server not running, skipping preview panel tests');
            test.skip();
        }
    });

    test('Preview panel loads dashboard correctly', async ({ page }) => {
        // Navigate to the preview route
        await page.goto(`http://localhost:${serverPort}/preview?tab=dashboard`);
        
        // Wait for the page to load
        await page.waitForLoadState('networkidle');
        
        // Check that the dashboard content is present
        await expect(page.locator('body')).toContainText('FailSafe');
        
        // Check for dashboard-specific elements
        await expect(page.locator('.dashboard-content')).toBeVisible();
        
        // Check for header branding
        await expect(page.locator('header')).toContainText('FailSafe');
        
        // Check for footer with version
        await expect(page.locator('footer')).toContainText(PACKAGE_JSON.version);
        
        // Check for MythologIQ branding
        await expect(page.locator('footer')).toContainText('MythologIQ');
        
        // Verify the page has proper styling
        await expect(page.locator('body')).toHaveCSS('font-family', /Inter|system-ui/);
    });

    test('Preview panel supports tab switching', async ({ page }) => {
        const tabs = ['dashboard', 'console', 'logs', 'sprint', 'config'];
        
        for (const tab of tabs) {
            // Navigate to each tab
            await page.goto(`http://localhost:${serverPort}/preview?tab=${tab}`);
            await page.waitForLoadState('networkidle');
            
            // Check that the tab content is loaded
            await expect(page.locator('body')).toBeVisible();
            
            // Check for tab-specific content
            if (tab === 'dashboard') {
                await expect(page.locator('.dashboard-content')).toBeVisible();
            } else {
                await expect(page.locator(`.${tab}-preview`)).toBeVisible();
            }
        }
    });

    test('Preview panel shows spec-gate overlay when issues detected', async ({ page }) => {
        // This test would require setting up a scenario where spec-gate detects issues
        // For now, we'll test the overlay structure
        
        // Navigate to preview
        await page.goto(`http://localhost:${serverPort}/preview?tab=dashboard`);
        await page.waitForLoadState('networkidle');
        
        // Check if spec-gate overlay exists (may or may not be visible)
        const overlay = page.locator('div[style*="position: fixed"][style*="background: #dc3545"]');
        
        // The overlay should either not exist or be visible if there are issues
        const overlayExists = await overlay.count() > 0;
        if (overlayExists) {
            await expect(overlay).toContainText('Spec-Gate Issues Detected');
        }
    });

    test('Preview panel has proper MythologIQ theming', async ({ page }) => {
        await page.goto(`http://localhost:${serverPort}/preview?tab=dashboard`);
        await page.waitForLoadState('networkidle');
        
        // Check for MythologIQ theme tokens
        const body = page.locator('body');
        
        // Check for theme colors (these would be applied via CSS variables)
        await expect(body).toHaveCSS('color', /#f7f7f7|var\(--color-halo-white\)/);
        
        // Check for proper border radius
        const header = page.locator('header');
        await expect(header).toHaveCSS('border-radius', /12px|var\(--radius-lg\)/);
        
        // Check for transition duration
        const buttons = page.locator('button');
        if (await buttons.count() > 0) {
            await expect(buttons.first()).toHaveCSS('transition-duration', /150ms|var\(--duration-short\)/);
        }
    });

    test('Preview panel auto-refresh functionality', async ({ page }) => {
        // This test would require setting up file watching and triggering saves
        // For now, we'll test the basic structure
        
        await page.goto(`http://localhost:${serverPort}/preview?tab=dashboard`);
        await page.waitForLoadState('networkidle');
        
        // Check that the preview frame is present
        const previewFrame = page.locator('iframe');
        await expect(previewFrame).toBeVisible();
        
        // Check that the frame has a source URL
        const src = await previewFrame.getAttribute('src');
        expect(src).toContain(`http://localhost:${serverPort}/preview`);
    });

    test('Preview panel tab selector functionality', async ({ page }) => {
        // This test would be for the VS Code WebView panel interface
        // Since we're testing the preview route directly, we'll verify the route works
        
        const tabs = ['dashboard', 'console', 'logs', 'sprint', 'config'];
        
        for (const tab of tabs) {
            await page.goto(`http://localhost:${serverPort}/preview?tab=${tab}`);
            await page.waitForLoadState('networkidle');
            
            // Verify the correct tab content is loaded
            const content = await page.content();
            expect(content).toContain(`${tab}-preview`);
        }
    });

    test('Preview panel handles invalid tab gracefully', async ({ page }) => {
        await page.goto(`http://localhost:${serverPort}/preview?tab=invalid-tab`);
        await page.waitForLoadState('networkidle');
        
        // Should show an error message
        await expect(page.locator('body')).toContainText('Invalid tab specified');
    });

    test('Preview panel performance', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto(`http://localhost:${serverPort}/preview?tab=dashboard`);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        
        // Preview should load within 2 seconds
        expect(loadTime).toBeLessThan(2000);
        
        console.log(`Preview panel loaded in ${loadTime}ms`);
    });

    test('Preview panel accessibility', async ({ page }) => {
        await page.goto(`http://localhost:${serverPort}/preview?tab=dashboard`);
        await page.waitForLoadState('networkidle');
        
        // Check for proper heading structure
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        expect(headingCount).toBeGreaterThan(0);
        
        // Check for alt text on images
        const images = page.locator('img');
        const imageCount = await images.count();
        if (imageCount > 0) {
            for (let i = 0; i < imageCount; i++) {
                const alt = await images.nth(i).getAttribute('alt');
                expect(alt).toBeTruthy();
            }
        }
        
        // Check for proper color contrast (basic check)
        const body = page.locator('body');
        const backgroundColor = await body.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
        );
        const color = await body.evaluate(el => 
            window.getComputedStyle(el).color
        );
        
        // Basic contrast check - should not be the same color
        expect(backgroundColor).not.toBe(color);
    });
}); 