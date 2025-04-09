# Surveillance Camera with Pose Detection

![Project Logo](https://miro.medium.com/v2/resize:fit:640/format:webp/1*zlqbgFqsE97S-_BmsykLDA.jpeg)  
**A cutting-edge surveillance system powered by TensorFlow.js and EmailJS**

---

## Overview

This project leverages the power of **TensorFlow.js** to detect humanoid figures in real-time using pre-trained machine learning models. By integrating pose detection with a lightweight surveillance system, it overlays a skeletal "mesh" on detected individuals and sends automated email alerts via **EmailJS** when a person is spotted. Whether you're monitoring your room or experimenting with computer vision, this tool combines accessibility with functionality.

The skeleton mesh is drawn using keypoint connections (defined in lines 250–261 of the code), visualizing body parts like shoulders, elbows, and knees. When a human is detected, an email notification is dispatched to your chosen address using a customizable EmailJS template.

---

## Features

- **Real-Time Pose Detection**: Utilizes TensorFlow.js models (MoveNet, BlazePose, or PoseNet) to identify and track human figures.
- **Skeleton Visualization**: Draws a green skeletal mesh over detected individuals for visual feedback.
- **Email Alerts**: Automatically sends an intruder alert email via EmailJS with a 60-second cooldown.
- **Model Flexibility**: Switch between MoveNet, BlazePose, or PoseNet models via a dropdown menu.
- **Web-Based**: Runs in the browser with a simple HTML interface.

---

## How It Works

1. **Pose Detection**: TensorFlow.js processes video input from your webcam, detecting humanoid shapes using pre-trained models.
2. **Skeleton Rendering**: When a person is detected, a skeletal mesh is overlaid on the video feed, connecting keypoints like the nose, shoulders, and hips.
3. **Email Notification**: Upon detection, an email is sent via EmailJS to your specified address, using a predefined template (e.g., "INTRUDER ALERT!").
4. **Cooldown Mechanism**: A 60-second cooldown prevents email spam during continuous detection.

---

## Prerequisites

- **Node.js**: Required for package management and running a local server.
- **ngrok**: Used to expose your local server to the internet, bypassing CORS issues with EmailJS.
- **EmailJS Account**: Needed to configure email services and obtain API credentials.

---

## Setup Instructions

Follow these steps to get the surveillance camera up and running:

```bash
# 1. Clone the Repository
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
# 2. Install Dependencies
npm install
# 3. Install ngrok
npm install -g ngrok
or
choco install ngrok
# 4 Configure EmailJS
emailjs.init("PUB_KEY")
service_id: "SERVICE_ID"
template_id: "TEMPLATE_ID"
user_id: "USER_ID"
to: "YOUR_EMAIL_ADDRESS"

#5 Start the Ngrok server
ngrok http <available_port>

#6 Navigate to templates/index.html
Open it and now it should be running
