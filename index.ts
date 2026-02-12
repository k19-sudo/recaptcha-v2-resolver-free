import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import WaveFile from 'wavefile';
import type { Page } from 'playwright';
import ffmepInstaller from '@ffmpeg-installer/ffmpeg';
import { pipeline, type AutomaticSpeechRecognitionOutput } from '@xenova/transformers';

ffmpeg.setFfmpegPath(ffmepInstaller.path);

/**
 * Automatically detect reCaPTCHA v2, solve audio challenge using Whisper model, and return the result.
 * @param page Playwright's page
 * @returns boolean indicating whether the reCAPTCHA was successfully solved
 */
const solveRecaptcha = async (page: Page): Promise<boolean> => {
    try {
        // reCAPTCHA v2 iframe
        const reCaptchaFrame = page.frameLocator('iframe[src*="recaptcha/api2/anchor"]');
        
        // Is it visible ? (Checkbox)
        if (await reCaptchaFrame.locator('#recaptcha-anchor').isVisible().catch(() => false)) {
            console.log("--> reCAPTCHA detected, solving...");
            
            // Click the checkbox
            await reCaptchaFrame.locator('#recaptcha-anchor').click();
            await page.waitForTimeout(1000);
            
            // Block control (After anchor, it may exit immediately)
            // If the tick appears immediately (green tick), bframe may not be visible.
            
            // Switch to challenge frame
            const challengeFrame = page.frameLocator('iframe[src*="recaptcha/api2/bframe"]');
            
            // Wait for the challenge frame to be visible / check
            if (await challengeFrame.locator('body').isVisible({timeout: 5000}).catch(()=>false)) {
                
                // GENERAL BLOCK CONTROL (Screenshot situation)
                // Is the text "Daha sonra tekrar deneyin" in the body?
                const bodyText = await challengeFrame.locator('body').innerText().catch(() => '');
                if (bodyText.toLowerCase().includes('try again later')) {
                    return false;
                }

                // Check if the audio button is available
                if (await challengeFrame.locator('#recaptcha-audio-button').isVisible().catch(() => false)) {
                    await challengeFrame.locator('#recaptcha-audio-button').click();
                    
                    const errorMsg = challengeFrame.locator('.rc-audiochallenge-error-message');
                    if (await errorMsg.isVisible({ timeout: 2000 })) {
                        return false;
                    }
                    
                    // Check again for general text (It may appear after clicking audio)
                    const bodyTextAfter = await challengeFrame.locator('body').innerText().catch(() => '');
                    if (bodyTextAfter.toLowerCase().includes('try') || bodyTextAfter.toLowerCase().includes('try again later')) {
                        return false;
                    }

                    // Download the audio file
                    const audioUrl = await challengeFrame.locator('#audio-source').getAttribute('src');
                    
                    if (audioUrl) {
                        try {
                            console.log("--> Audio challenge detected, processing...");
                            const response = await page.request.get(audioUrl);
                            console.log("--> Audio file downloaded, transcribing...");
                            const audioBuffer = await response.body();
                            console.log("--> Audio file transcribed, entering response...");
                            const text = await solveWhisper(audioBuffer);
                            console.log(`--> Transcribed text: ${text}`);

                            // Enter text and verify
                            await challengeFrame.locator('#audio-response').fill(text);
                            await challengeFrame.locator('#recaptcha-verify-button').click();
                            
                            await page.waitForTimeout(1500); // Wait after verification
                            return true;
                        } catch (e) {
                            console.error("Error handling audio challenge:", e);
                            return false;
                        }
                    }
                }

                return false; // No audio option, likely a different challenge type
            }
            return true; // Interacted with the frame in any case
        }
        return false; // No captcha
    } catch (error) {
        console.error("Error solving captcha:", error);
        return false;
    }
}


/**
 * Converts audio buffer to text using Whisper model.
 * @param audioBuffer Buffer
 * @returns {string} Transcribed text
 */
async function solveWhisper(audioBuffer: Buffer): Promise<string> {

    // Load Local Whisper Model
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
    
    // Create temporary files to store the audio data
    const tempMp3 = path.join(import.meta.dirname, 'temp_audio.mp3');
    const tempWav = path.join(import.meta.dirname, 'temp_audio.wav');

    fs.writeFileSync(tempMp3, audioBuffer);

    // MP3 -> WAV Conversion (16kHz, Mono - Required for Transformers.js)
    await new Promise((resolve, reject) => {
        ffmpeg(tempMp3)
            .toFormat('wav')
            .audioFrequency(16000)
            .audioChannels(1)
            .on('end', resolve)
            .on('error', reject)
            .save(tempWav);
    });

    // Read WAV file and convert to Float32Array format
    const wavBuffer = fs.readFileSync(tempWav);
    const wav = new WaveFile.WaveFile(wavBuffer);
    wav.toBitDepth('32f'); // 32-bit float
    let audioData = wav.getSamples();
    
    // If stereo, convert to mono by taking the first channel
    if (Array.isArray(audioData)) audioData = audioData[0];

    // Delete temporary files
    if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
    if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
    
    // Transcribe audio
    const output: AutomaticSpeechRecognitionOutput | Array<AutomaticSpeechRecognitionOutput> = await transcriber(audioData);
    return Array.isArray(output) ? output.map(o => o.text).join(' ') : output.text;
}

export default solveRecaptcha;