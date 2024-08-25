const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const closeBtn = document.getElementById('close-btn'); // New close button
const statusText = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');

let recognition;
let recognizing = false;
let helpCount = 0;
let socket;

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true; // Continue listening after pauses
    recognition.interimResults = true; // Show results before finalizing
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

            // Check for the word "help" in the final transcript
            if (transcript.toLowerCase().includes('help')) {
                helpCount++;
                statusText.innerText = `"Help" recognized ${helpCount}/3 times`;
                if (helpCount >= 3) {
                    getLocationAndSend(); // Send location immediately
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
    }
});

closeBtn.addEventListener('click', () => {
    if (recognizing && recognition) {
        recognizing = false;
        recognition.stop();
    }
    if (socket) {
        socket.close(); // Close WebSocket connection
    }
    statusText.innerText = 'Application closed.';
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
        const locationData = JSON.stringify({ latitude, longitude });
        socket.send(locationData);
        statusText.innerText = 'Location sent via WebSocket.';
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
