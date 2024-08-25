const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const saveUserInfoBtn = document.getElementById('save-user-info');
const saveGeofenceBtn = document.getElementById('save-geofence');
const geofenceToggle = document.getElementById('geofence-toggle');
const geofenceSettings = document.getElementById('geofence-settings');
const onboardingSection = document.getElementById('onboarding');
const geofenceSection = document.getElementById('geofence-section');
const emergencySystemSection = document.getElementById('emergency-system');
const statusText = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const popup = document.getElementById('popup'); // Popup element

let recognition;
let recognizing = false;
let helpCount = 0;
let socket;
let mediaRecorder;
let audioChunks = [];
let videoStream;

let geofencingEnabled = false;
let geofence = { lat: null, lng: null, radius: null };
let userInfo = { name: '', age: '', contact: '' };

// Show/hide geofence settings based on toggle
geofenceToggle.addEventListener('change', () => {
    geofencingEnabled = geofenceToggle.checked;
    geofenceSettings.classList.toggle('hidden', !geofencingEnabled);

    // Start monitoring geofence if enabled
    if (geofencingEnabled) {
        startGeofenceMonitoring();
    } else {
        stopGeofenceMonitoring();
    }
});

// Save user information
saveUserInfoBtn.addEventListener('click', () => {
    const name = document.getElementById('name').value;
    const age = document.getElementById('age').value;
    const contact = document.getElementById('contact').value;

    if (name && age && contact) {
        userInfo = { name, age, contact };
        onboardingSection.classList.add('hidden');
        geofenceSection.classList.remove('hidden');
        emergencySystemSection.classList.remove('hidden');
        alert('User information saved successfully.');
    } else {
        alert('Please fill out all fields.');
    }
});

// Save geofence settings
saveGeofenceBtn.addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('geofence-lat').value);
    const lng = parseFloat(document.getElementById('geofence-lng').value);
    const radius = parseFloat(document.getElementById('geofence-radius').value);

    if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
        geofence = { lat, lng, radius };
        alert('Geofence saved successfully.');
    } else {
        alert('Please enter valid geofence coordinates and radius.');
    }
});

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        recognizing = true;
        statusText.innerText = 'Voice recognition started. Listening...';
        transcriptDiv.innerText = ''; // Clear previous transcript
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }

            if (transcript.toLowerCase().includes('help')) {
                helpCount++;
                statusText.innerText = `"Help" recognized ${helpCount}/3 times`;
                if (helpCount >= 3) {
                    getLocationAndSend(); // Send location immediately
                    startRecording(); // Start recording audio
                    startCamera(); // Start camera
                    helpCount = 0; // Reset after sending location
                }
            }
        }

        transcriptDiv.innerText = finalTranscript + '\n' + interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        statusText.innerText = `Error occurred: ${event.error}`;
    };

    recognition.onend = () => {
        if (recognizing) {
            recognition.start(); // Restart recognition if it's still supposed to be running
        }
    };
} else {
    statusText.innerText = 'Speech recognition not supported in this browser.';
}

startBtn.addEventListener('click', () => {
    if (!recognizing && recognition) {
        helpCount = 0; // Reset the help counter
        recognizing = true;
        recognition.start();
        openWebSocketConnection(); // Open WebSocket connection
    }
});

stopBtn.addEventListener('click', () => {
    if (recognizing && recognition) {
        recognizing = false;
        recognition.stop();
        if (socket) {
            socket.close(); // Close WebSocket connection
        }
        stopRecording(); // Stop recording audio
        stopCamera(); // Stop camera
    }
});

function getLocationAndSend() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            sendLocation(latitude, longitude);
        }, error => {
            console.error('Error getting location:', error);
            statusText.innerText = 'Error getting location.';
        }, {
            enableHighAccuracy: true,
            timeout: 5000
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
        statusText.innerText = 'Geolocation is not supported by this browser.';
    }
}

function sendLocation(latitude, longitude) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const locationData = JSON.stringify({ 
            latitude, 
            longitude, 
            name: userInfo.name, 
            age: userInfo.age, 
            contact: userInfo.contact 
        });
        socket.send(locationData);
        statusText.innerText = 'Location and user info sent via WebSocket.';
    } else {
        statusText.innerText = 'WebSocket connection is not open.';
    }
}

function openWebSocketConnection() {
    socket = new WebSocket('ws://localhost:3000');

    socket.onopen = () => {
        console.log('WebSocket connection opened');
        statusText.innerText = 'WebSocket connection opened.';
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        statusText.innerText = 'WebSocket error occurred.';
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
        statusText.innerText = 'WebSocket connection closed.';
    };
}

// Function to start monitoring the geofence
function startGeofenceMonitoring() {
    if (geofencingEnabled) {
        setInterval(() => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const { latitude, longitude } = position.coords;
                    if (isOutsideGeofence(latitude, longitude)) {
                        if (!recognizing) {
                            startBtn.click(); // Automatically start recognition
                        }
                    }
                });
            }
        }, 5000); // Check every 5 seconds
    }
}

// Function to stop monitoring the geofence
function stopGeofenceMonitoring() {
    // Clear any geofencing intervals or listeners if necessary
}

// Function to check if the user is outside the geofence
function isOutsideGeofence(latitude, longitude) {
    if (!geofence.lat || !geofence.lng || !geofence.radius) {
        return false;
    }

    const distance = getDistanceFromLatLonInMeters(latitude, longitude, geofence.lat, geofence.lng);
    return distance > geofence.radius;
}

// Function to calculate the distance between two points in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of the Earth in meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters
    return distance;
}

// Convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Function to start audio recording
function startRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                
                mediaRecorder.ondataavailable = function(event) {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = function() {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    // You can upload or process the audioBlob here
                    audioChunks = []; // Reset for next recording
                };

                console.log('Audio recording started.');
                showPopup(); // Show red popup when recording starts
            })
            .catch(error => {
                console.error('Error accessing audio devices:', error);
            });
    } else {
        console.error('Audio recording not supported in this browser.');
    }
}

// Function to stop audio recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('Audio recording stopped.');
        hidePopup(); // Hide red popup when recording stops
    }
}

// Function to start the camera
function startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                videoStream = stream;
                const videoElement = document.getElementById('video');
                videoElement.srcObject = stream;
                document.getElementById('camera-feed').classList.remove('hidden');
                console.log('Camera started.');
            })
            .catch(error => {
                console.error('Error accessing camera:', error);
            });
    } else {
        console.error('Camera not supported in this browser.');
    }
}

// Function to stop the camera
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        document.getElementById('camera-feed').classList.add('hidden');
        console.log('Camera stopped.');
    }
}

// Function to show the red popup
function showPopup() {
    popup.innerText = 'Recording Started';
    popup.style.display = 'block';
}

// Function to hide the red popup
function hidePopup() {
    popup.style.display = 'none';
}
