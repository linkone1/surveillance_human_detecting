emailjs.init("[REDACTED]")

let detector;
let model = "movenet";
let video;
let canvas;
let ctx;
let isRunning = false;
let rafId;

let lastSMSTime = 0;
const smsCooldown = 60000;
let isEmailSending = false;

const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const modelSelect = document.getElementById('modelSelect');


init();

// Function to declare variables, initialize the canvas and video also add event listeners to the buttons.
async function init() {
    statusDiv.textContent = 'Loading TensorFlow.js...';

    await tf.ready();


    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    video = document.getElementById('video');

    // Setup event listeners
    startBtn.addEventListener('click', startCamera);
    stopBtn.addEventListener('click', stopCamera);
    modelSelect.addEventListener('change', changeModel);

    // Load the initial model
    await loadModel();

    statusDiv.textContent = 'Model loaded. Click "Start Camera" to begin.';
}

function makeSurePersonIsInFrame(poses) {
    if (!poses || poses.length == 0) {
        statusDiv.textContent = 'No person detected in the frame.';
        return false;
    }
    return true;
}



// Loading modules function and initializintg the model into the config.
async function loadModel() {
    if (detector) {
        detector.dispose();
    }

    statusDiv.textContent = `Loading ${model} model...`;

    try {
        let modelConfig;

        if (model === 'movenet') {
            modelConfig = {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
            };
        } else if (model === 'blazepose') {
            modelConfig = {
                runtime: 'tfjs',
                modelType: 'full'
            };
        } else if (model === 'posenet') {
            modelConfig = {
                architecture: 'MobileNetV1',
                outputStride: 16,
                inputResolution: { width: 640, height: 480 },
                multiplier: 0.75
            };
        }

        detector = await poseDetection.createDetector(
            model === 'movenet'
                ? poseDetection.SupportedModels.MoveNet
                : model === 'blazepose'
                    ? poseDetection.SupportedModels.BlazePose
                    : poseDetection.SupportedModels.PoseNet,
            modelConfig
        );

        statusDiv.textContent = `${model} model loaded!`;
    } catch (error) {
        statusDiv.textContent = `Error loading model: ${error.message}`;
        console.error(error);
    }
}


// Function to start the camera and display it in 640x480 resolution.
async function startCamera() {
    try {
        const constraints = {
            video: {
                width: 640,
                height: 480
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

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

function stopCamera() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    startBtn.disabled = false;
    stopBtn.disabled = true;
    modelSelect.disabled = false;
    isRunning = false;
    statusDiv.textContent = 'Camera stopped.';

    // Clear the canvas
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
                statusDiv.textContent = `Detecting poses using ${model}...`;

                const currentTime = Date.now();
                if (currentTime - lastSMSTime >= smsCooldown && !isEmailSending) {
                    isEmailSending = true;

                    const data = {
                        service_id: '[REDACTED]',
                        template_id: '[REDACTED]',
                        user_id: '[REDACTED]',
                        template_params: {
                            to: "[REDACTED]",
                            subject: "Intruder Alert!",
                            message: "<b>INTRUDER ALERT!</b> SOMEONE IS IN YOUR ROOM!"
                        }
                    };

                    $.ajax('https://api.emailjs.com/api/v1.0/email/send', {
                        type: 'POST',
                        data: JSON.stringify(data),
                        contentType: 'application/json'
                    })
                    .done(function(response) {
                        console.log('Email sent successfully:', response);
                        statusDiv.textContent = 'Intruder detected! Email sent.';
                        lastSMSTime = currentTime;
                    })
                    .fail(function(jqXHR, textStatus, errorThrown) {
                        const errorMessage = jqXHR.responseText || textStatus || errorThrown;
                        console.error('Error sending email:', jqXHR, textStatus, errorThrown);
                        statusDiv.textContent = `Error sending email: ${errorMessage}`;
                    })
                    .always(function() {
                        isEmailSending = false;
                    });
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
    // For each detected pose
    for (const pose of poses) {
        // Draw keypoints
        for (const keypoint of pose.keypoints) {
            if (keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();

                // Optionally draw keypoint name
                ctx.fillStyle = 'white';
                ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y + 5);
            }
        }

        // Draw skeleton (if available)
        if (pose.keypoints.length > 5) { // Basic check to ensure we have enough keypoints
            drawSkeleton(pose);
        }
    }
}

function drawSkeleton(pose) {
    // Define connections for a human skeleton
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

    // Create a map for fast keypoint lookup
    const keypointMap = {};
    pose.keypoints.forEach(keypoint => {
        keypointMap[keypoint.name] = keypoint;
    });

    // Draw connections
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