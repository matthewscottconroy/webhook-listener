const https = require('https');
const fs = require('fs');
const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.raw({type: 'application/json'}));

const crypto = require('crypto');

const SECRET = process.env.WEBHOOK_SECRET; 

if (!SECRET) {
    console.error('Error: WEBHOOK_SECRET environment variable is not set.');
    process.exit(1); 
}

function verifySignature(req, res, next) {
    console.log("Inside verifySignature");

    const payload = req.body.toString();

    console.log("Raw Payload: ", payload);
    console.log("Headers: ", req.headers);

    const signature = `sha256=${crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex')}`;

    if (req.headers['x-hub-signature-256'] !== signature) {
	console.error("Signature mismatch");
        console.error(`Computed: ${signature}`);
        console.error(`Received: ${req.headers['x-hub-signature-256']}`);
        return res.status(401).send('Unauthorized');
    }

    console.log("Signature verifed successfully");
    next();
}


// Load SSL/TLS certificates
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/tribefires.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/tribefires.com/fullchain.pem'),
};

app.get('/health/ping', (req, res) => {
  res.send('Server is healthy');
});

// Webhook endpoint
app.post('/webhook', verifySignature, (req, res) => {
    let payload = req.body;
 
    console.log("KABOOM!: " + payload);
    console.log("payload.ref: " + payload.ref);
  
    payload = JSON.parse(payload);
    console.log("payload.ref after JSON.parse: " + payload.ref);

    if (payload.ref === 'refs/heads/main') {
        console.log('Received push event. Deploying application...');
	
	const owner = payload.repository.owner.name;
	const repo = payload.repository.name;
	
	console.log(`Owner is: ${owner}. Repository is: ${repo}`);
	    
        exec(`./deploy.sh ${owner} ${repo}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Deployment error: ${error.message}`);
                return res.status(500).send('Deployment failed');
            }
            if (stderr) console.error(`Stderr: ${stderr}`);
            console.log(`Stdout: ${stdout}`);
        });
    } else {
      console.log("Else of ref check hit");
    }

    res.status(200).send('Webhook received');
});

const PORT = 5443;
https.createServer(options, app).listen(PORT, () => {
    console.log(`Webhook listener running securely on port ${PORT}`);
});

