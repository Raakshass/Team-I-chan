const express = require('express');
const path = require('path');
const twilio = require('twilio');
const app = express();

// Twilio configuration
const accountSid = 'AC3f2e7c40f812fbb94a84aff6c7324471'; // Replace with your Twilio Account SID
const authToken = '3cb0d3afa12973dc8c5d42aa2285296e'; // Replace with your Twilio Auth Token
const client = twilio(accountSid, authToken);

const emergencyContacts = [
    '+918929098104' // Replace with actual emergency contact number
];

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/send-location', (req, res) => {
    const { latitude, longitude } = req.body;
    if (latitude && longitude) {
        console.log(`Received location: Latitude ${latitude}, Longitude ${longitude}`);
        // Send SMS to emergency contacts
        emergencyContacts.forEach(contact => {
            client.messages.create({
                body: `Emergency! User's location: Latitude ${latitude}, Longitude ${longitude}`,
                from: '+14702997828', // Replace with your Twilio number
                to: '+918839237559'
            })
            .then(message => console.log(`Message sent to ${contact}: ${message.sid}`))
            .catch(error => console.error(`Failed to send message to ${contact}: ${error}`));
        });
        res.json({ status: 'Location sent to emergency contacts' });
    } else {
        res.status(400).json({ status: 'Failed', message: 'Latitude and Longitude are required' });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
