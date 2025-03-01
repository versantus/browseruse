#!/usr/bin/env python3
"""
Example script demonstrating how to use playwright-stealth to avoid captchas.
"""
import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

async def main():
    """
    Run a browser with stealth mode enabled to avoid captchas.
    """
    async with async_playwright() as p:
        # Launch the browser
        browser = await p.chromium.launch(headless=False)  # Set to True for headless mode
        
        # Create a new browser context
        context = await browser.new_context()
        
        # Create a new page
        page = await context.new_page()
        
        # Apply stealth mode to avoid detection
        await stealth_async(page)
        
        # Navigate to a website
        print("Navigating to a website...")
        await page.goto("https://bot.sannysoft.com/")
        
        # Wait for the page to load completely
        await page.wait_for_load_state("networkidle")
        
        # Take a screenshot to verify the results
        await page.screenshot(path="stealth_test.png")
        print(f"Screenshot saved as stealth_test.png")
        
        # Wait for user to see the results
        print("Press Enter to close the browser...")
        input()
        
        # Close the browser
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
