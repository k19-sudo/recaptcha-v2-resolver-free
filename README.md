# reCaptcha v2 Resolver (Free & Local) 🚀

A powerful, 100% free, and completely local library for solving reCAPTCHA v2 audio challenges. Built with **TypeScript**, **Playwright**, and the state-of-the-art **Whisper** model via `@xenova/transformers`.

## Why this resolver?

Unlike other services that charge per solution or require sending data to third-party servers, this project runs entirely on your machine.

*   **100% Free**: No subscription fees or API credits required.
*   **Privacy Focused**: Audio data is processed locally in-memory. Zero data leakage. 🛡️
*   **Modern Stack**: Built for the modern web with current TypeScript standards.

## Installation

```bash
bun install recaptche-v2-resolver-free
# or
npm install recaptche-v2-resolver-free
```

> **Note:** This package requires `playwright` to control the browser and `fluent-ffmpeg` for audio conversion.

## Usage

Simply verify the page using Playwright and pass the `Page` object to the solver.

```typescript
import { chromium } from 'playwright';
import solveRecaptcha from 'recaptche-v2-resolver-free';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.google.com/recaptcha/api2/demo');

    // Attempt to solve the captcha
    const result = await solveRecaptcha(page);

    if (result) {
        console.log('✅ Capthca solved successfully!');
        // Proceed with your automation...
    } else {
        console.log('❌ Failed to solve captcha.');
    }

    await browser.close();
})();
```

## ⚠️ Important Disclaimer & Best Practices

**This tool is strictly for educational purposes and testing your own systems.**

While this library can accurately transcribe audio challenges, Google's defense mechanisms are sophisticated.

*   **IP Rotation is Critical**: Solving the puzzle is only half the battle. If you attempt too many requests from a single IP, Google will block the audio challenge entirely ("Your computer or network may be sending automated queries"). **You MUST use high-quality residential proxies and rotate IPs.**
*   **Browser Fingerprinting**: Use realistic User-Agents and browser profiles.
*   **Behavioral Analysis**: This script handles the interaction, but adding random delays and human-like mouse movements elsewhere in your script can improve success rates.

*Disclaimer: This project is not affiliated with Google or reCAPTCHA.*
