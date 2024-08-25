const express = require('express');
const path = require('path');
const twilio = require('twilio');
const WebSocket = require('ws');
const app = express();

// Twilio configuration
const accountSid = 'AC771657507b7f31db32ded432de68a418'; // Replace with your Twilio Account SID
const authToken = '1bdda51acfa37ed92f58088148217092'; // Replace with your Twilio Auth Token
const client = twilio(accountSid, authToken);

const emergencyContacts = [
    '+919829232689' // Replace with actual emergency contact number
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create WebSocket server
const server = app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error('Invalid JSON received:', error.message);
            return;
        }

        const { latitude, longitude } = data;

        if (latitude && longitude) {
            console.log(`Received location: Latitude ${latitude}, Longitude ${longitude}`);

            // Send SMS to emergency contacts
            emergencyContacts.forEach(contact => {
                client.messages.create({
                    body: `Emergency! User's location: https://www.google.com/maps?q=${latitude},${longitude}`,
                    from: '+12512202081', // Replace with your Twilio number
                    to: contact // Correctly use the contact variable here
                })
                .then(message => console.log(`Message sent to ${contact}: ${message.sid}`))
                .catch(error => console.error(`Failed to send message to ${contact}: ${error}`));
            });
        } else {
            console.error('Latitude and Longitude are required');
        }
    });

    // Handle WebSocket close event
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});
