const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusText = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');

let recognition;
let recognizing = false;
let helpCount = 0;

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
                    sendLocation();
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
        recognizing = false;
        statusText.innerText = 'Voice recognition stopped.';
    };
} else {
    statusText.innerText = 'Speech recognition not supported in this browser.';
}

startBtn.addEventListener('click', () => {
    if (!recognizing && recognition) {
        helpCount = 0; // Reset the help counter
        recognition.start();
    }
});

stopBtn.addEventListener('click', () => {
    if (recognizing && recognition) {
        recognition.stop();
    }
});

function sendLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            console.log(`Location: ${latitude}, ${longitude}`);
            fetch('/send-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude })
            })
            .then(response => response.json())
            .then(data => {
                alert('Emergency location sent to contacts!');
                statusText.innerText = 'Emergency location sent.';
            })
            .catch(error => {
                console.error('Error sending location:', error);
                statusText.innerText = 'Error sending location.';
            });
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
        statusText.innerText = 'Geolocation is not supported by this browser.';
    }
}
