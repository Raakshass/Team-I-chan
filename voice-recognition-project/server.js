require('dotenv').config();
const express = require('express');
const path = require('path');
const twilio = require('twilio');
const WebSocket = require('ws');
const app = express();

console.log(process.env.API_KEY);
const accountSid =process.env.API_KEY  // Replace with your Twilio Account SID
const authToken = process.env.API_TOKEN
console.log(accountSid); // Replace with your Twilio Auth Token
const client = twilio(accountSid, authToken);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error('Invalid JSON received:', error.message);
            return;
        }

        const { latitude, longitude, name, age, contact } = data;

        if (latitude && longitude && name && contact) {
            console.log(`Received location: Latitude ${latitude}, Longitude ${longitude}`);
            console.log(`User Info: Name ${name}, Age ${age}, Contact ${contact}`);

            client.messages.create({
                body: `Emergency! User ${name} (Age: ${age}) is in need of help. Location: https://www.google.com/maps?q=${latitude},${longitude}`,
                from: process.env.NUMBER_TOKEN , // Replace with your Twilio number
                to: contact // Send SMS to the provided contact number
            })
            .then(message => console.log(`Message sent to ${contact}: ${message.sid}`))
            .catch(error => console.error(`Failed to send message to ${contact}: ${error}`));
        } else {
            console.error('Incomplete user information or location data');
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});
