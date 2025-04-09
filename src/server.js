import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..'); // Root directory (secCam/)

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(rootDir));

// SMTP Configuration
const transporter = nodemailer.createTransport({
    host: 'send.one.com',
    port: 465,
    secure: true,
    auth: {
        user: '[REDACTED_SENDER]',
        pass: '[REDACTED_SENDER_PASSWORD]' // Replace with your actual password
    }
});

// Function to convert WebM to MP4
async function convertWebmToMp4(videoData, filename) {
    const webmPath = join(__dirname, 'temp.webm');
    const mp4Path = join(__dirname, 'temp.mp4');
    const mp4Filename = filename.replace('.webm', '.mp4');

    try {
        // Write the Base64 WebM data to a temporary file
        await fs.writeFile(webmPath, Buffer.from(videoData, 'base64'));

        // Convert WebM to MP4 using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(webmPath)
                .output(mp4Path)
                .videoCodec('libx264') // H.264 codec for MP4 (iOS compatible)
                .audioCodec('aac')     // AAC audio (iOS compatible)
                .format('mp4')
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Read the converted MP4 file as Base64
        const mp4Data = await fs.readFile(mp4Path, 'base64');

        // Clean up temporary files
        await fs.unlink(webmPath);
        await fs.unlink(mp4Path);

        return { mp4Data, mp4Filename };
    } catch (error) {
        console.error('Error converting WebM to MP4:', error.message, error.stack);
        throw error;
    }
}

// Function to send the intruder alert email with MP4
async function sendIntruderAlert(videoData, filename) {
    try {
        // Convert WebM to MP4
        const { mp4Data, mp4Filename } = await convertWebmToMp4(videoData, filename);

        const mailOptions = {
            from: '[REDACTED_SENDER]',
            to: '[REDACTED_RECEIVER]',
            subject: '⚠️ INTRUDER ALERT - Security Camera Footage',
            html: `
                <div style="background-color: #ff0000; color: white; padding: 20px; text-align: center;">
                    <h1>⚠️ INTRUDER DETECTED! ⚠️</h1>
                    <p>An intruder was detected by your security camera.</p>
                    <p>Please find the 10-second video footage attached (MP4 format).</p>
                    <p>Detection Time: ${new Date().toLocaleString()}</p>
                </div>
            `,
            attachments: [
                {
                    filename: mp4Filename,
                    content: mp4Data,
                    encoding: 'base64',
                    contentType: 'video/mp4' // Explicitly set MIME type
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Alert email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error in sendIntruderAlert:', error.message, error.stack);
        return false;
    }
}

// API Endpoint
app.post('/send-email', async (req, res) => {
    const { videoBase64, filename } = req.body;

    if (!videoBase64 || !filename) {
        console.error('Missing videoBase64 or filename in request body:', req.body);
        return res.status(400).send('Missing video data or filename');
    }

    console.log('Received request to send email with video of size:', videoBase64.length);
    const success = await sendIntruderAlert(videoBase64, filename);
    if (success) {
        console.log('Email sent successfully');
        res.status(200).send('Email sent successfully');
    } else {
        console.error('Failed to send email');
        res.status(500).send('Failed to send email');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { sendIntruderAlert };