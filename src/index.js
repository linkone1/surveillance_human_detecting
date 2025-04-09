let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
const recordingDuration = 10000; // 10 seconds

let detector;
let model = "movenet";
let video;
let canvas;
let ctx;
let isRunning = false;
let rafId;

const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const modelSelect = document.getElementById('modelSelect');

init();

async function init() {
    statusDiv.textContent = 'Loading TensorFlow.js...';
    await tf.ready();

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    video = document.getElementById('video');

    startBtn.addEventListener('click', startCamera);
    stopBtn.addEventListener('click', stopCamera);
    modelSelect.addEventListener('change', changeModel);

    await loadModel();
    statusDiv.textContent = 'Model loaded. Click "Start Camera" to begin.';
}

function makeSurePersonIsInFrame(poses) {
    if (!poses || poses.length === 0) {
        statusDiv.textContent = 'No person detected in the frame.';
        return false;
    }
    return true;
}

async function loadModel() {
    if (detector) detector.dispose();
    statusDiv.textContent = `Loading ${model} model...`;

    try {
        let modelConfig;
        if (model === 'movenet') {
            modelConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
        } else if (model === 'blazepose') {
            modelConfig = { runtime: 'tfjs', modelType: 'full' };
        } else if (model === 'posenet') {
            modelConfig = {
                architecture: 'MobileNetV1',
                outputStride: 16,
                inputResolution: { width: 640, height: 480 },
                multiplier: 0.75
            };
        }

        detector = await poseDetection.createDetector(
            model === 'movenet' ? poseDetection.SupportedModels.MoveNet :
            model === 'blazepose' ? poseDetection.SupportedModels.BlazePose :
            poseDetection.SupportedModels.PoseNet,
            modelConfig
        );
        statusDiv.textContent = `${model} model loaded!`;
    } catch (error) {
        statusDiv.textContent = `Error loading model: ${error.message}`;
        console.error(error);
    }
}

async function startCamera() {
    try {
        const constraints = { video: { width: 640, height: 480 } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };
        mediaRecorder.onstop = sendVideoEmail;

        video.onloadedmetadata = () => {
            video.play();
            video.style.display = 'none';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            modelSelect.disabled = true;
            isRunning = true;
            statusDiv.textContent = 'Camera started. Detecting poses...';
            detectPose();
        };
    } catch (error) {
        statusDiv.textContent = `Error accessing camera: ${error.message}`;
        console.error(error);
    }
}

async function sendVideoEmail() {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const filename = `intruder_${new Date().toISOString()}.webm`;

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
        const base64Video = reader.result.split(',')[1]; // Remove prefix

        try {
            statusDiv.textContent = 'Sending email via SMTP...';
            const response = await fetch('/send-email', { // Relative URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoBase64: base64Video,
                    filename: filename
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }

            console.log('Email with video sent successfully');
            statusDiv.textContent = 'Intruder detected! Email with video sent.';
        } catch (error) {
            console.error('Error sending email:', error);
            statusDiv.textContent = `Error sending email: ${error.message}`;
        } finally {
            recordedChunks = [];
            isRecording = false;
        }
    };
}

function stopCamera() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    modelSelect.disabled = false;
    isRunning = false;
    statusDiv.textContent = 'Camera stopped.';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function changeModel() {
    model = modelSelect.value;
    await loadModel();
    statusDiv.textContent = `${model} model loaded. Click "Start Camera" to begin.`;
}

async function detectPose() {
    if (!isRunning) return;

    if (video.readyState === 4) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            if (!detector) {
                statusDiv.textContent = 'Detector not initialized. Please reload the page or check model loading.';
                console.error('Detector is undefined. Ensure loadModel completed successfully.');
                return;
            }

            const poses = await detector.estimatePoses(video);
            if (makeSurePersonIsInFrame(poses)) {
                drawPoses(poses);
                statusDiv.textContent = `Intruder detected using ${model}...`;

                if (!isRecording && mediaRecorder && mediaRecorder.state === 'inactive') {
                    console.log('Starting 10-second recording...');
                    isRecording = true;
                    recordedChunks = [];
                    mediaRecorder.start();
                    statusDiv.textContent = 'Intruder detected! Recording video...';

                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                            statusDiv.textContent = 'Recording complete. Sending video...';
                        }
                    }, recordingDuration);
                }
            } else {
                statusDiv.textContent = 'No person detected in the frame.';
            }
        } catch (error) {
            console.error('Error detecting poses:', error);
            statusDiv.textContent = 'Error detecting poses: ' + error.message;
        }
    }

    rafId = requestAnimationFrame(detectPose);
}

function drawPoses(poses) {
    for (const pose of poses) {
        for (const keypoint of pose.keypoints) {
            if (keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y + 5);
            }
        }
        if (pose.keypoints.length > 5) drawSkeleton(pose);
    }
}

function drawSkeleton(pose) {
    const connections = [
        ['nose', 'left_eye'], ['nose', 'right_eye'],
        ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
        ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
        ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
    ];

    const keypointMap = {};
    pose.keypoints.forEach(keypoint => keypointMap[keypoint.name] = keypoint);

    ctx.strokeStyle = 'green';
    ctx.lineWidth = 4;

    for (const [p1Name, p2Name] of connections) {
        const p1 = keypointMap[p1Name];
        const p2 = keypointMap[p2Name];
        if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }
}