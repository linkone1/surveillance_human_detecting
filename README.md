# ML-Powered Security Camera System

A real-time security camera system that uses TensorFlow.js for pose detection and automatically sends email alerts with video footage when an intruder is detected.

## Features

- Real-time pose detection using multiple AI models:
  - MoveNet (fastest)
  - BlazePose (Got some errors)
  - PoseNet (Got some errors) 
- Automatic 10-second video recording when movement is detected
- Instant email alerts with video attachment
- Live visualization of detected poses and skeletal structure
- Support for MP4 video conversion for maximum compatibility

## Tech Stack

- **Frontend:**
  - HTML5/CSS3
  - JavaScript (ES6+)
  - TensorFlow.js
  - MediaRecorder API

- **Backend:**
  - Node.js
  - Express.js
  - Nodemailer
  - Fluent-FFmpeg

## Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on the system
- Web camera
- One.com SMTP credentials

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/secCam.git
cd secCam
```

2. Install dependencies:
```bash
npm install
```

3. Configure your email settings in `src/server.js`:
```javascript
const transporter = nodemailer.createTransport({
    host: 'smtp-host-of-choice',
    port: 465,
    secure: true,
    auth: {
        user: 'your-email@domain.com',
        pass: 'your-password'
    }
});
```

4. Start the server:
```bash
#1
npm start (will run the server.js on port 3000)

#2
ngrok http 3000 (will run the ngrok server on port 3000 aswell)

#Explanation it will merge conflicts if you don't run both on the same port it could be any port but just the same ones to get the emailing working. If you do not want email-sending you could just run ngrok http 3000
```

5. Open `http://localhost:3000` in your browser

## Usage

1. Select your preferred pose detection model (MoveNet recommended for performance)
2. Click "Börja Inspelning" to start the camera
3. The system will automatically:
   - Detect human poses in the camera feed
   - Record 10 seconds of video when movement is detected
   - Send an email alert with the video attachment
4. Click "Stoppa Inspelning" to stop the camera

# And get the Intruder on camera

## Acknowledgments

- TensorFlow.js team for the pose detection models
- Node.js community for excellent tools and libraries
