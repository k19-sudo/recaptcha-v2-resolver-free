import { chromium } from "playwright";
import test, { expect } from "@playwright/test";
import solveRecaptcha from "../index";

test.describe("Checkpoint Tests", () => {
    test("Should solve reCAPTCHA and reach checkpoint", async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        // Go to the test page with reCAPTCHA
        await page.goto("https://www.google.com/recaptcha/api2/demo");
        
        // Call the solveRecaptcha function (Assuming it's exported from index.ts)
        const result = await solveRecaptcha(page);
        
        // Check if the result is true (captcha solved)
        if (result) {
            console.log("Checkpoint reached: reCAPTCHA solved successfully!");
        } else {
            console.log("Checkpoint failed: Could not solve reCAPTCHA.");
        }
        
        await page.screenshot({ path: 'test-results/checkpoint.png', fullPage: true });
        expect(result).toBe(true);
        await browser.close();
    });
});