const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://Euro:${process.env.DB_PASSWORD}@cluster0.swwr6sg.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const database = client.db('Euro');
        const agentCollection = database.collection('agent');
        const userCollection = database.collection('user');

        app.post('/agent', async (req, res) => {
            try {
                const { email, phone, pin, ...otherData } = req.body;
                const hashedPin = await bcrypt.hash(pin, 10);

                const existMail = await userCollection.findOne({ email });
                const existPhone = await userCollection.findOne({ phone });
                const existMail2 = await agentCollection.findOne({ email });
                const existPhone2 = await agentCollection.findOne({ phone });
                if (existMail || existPhone || existMail2 || existPhone2) {
                    return res.status(409).json({ error: 'Agent already exists' });
                }
                const newAgent = { email, phone, pin: hashedPin, ...otherData };
                const result = await agentCollection.insertOne(newAgent);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'An error occurred while processing your request' });
            }
        });
        app.post('/user', async (req, res) => {
            try {
                const { email, phone, pin, ...otherData } = req.body;
                const hashedPin = await bcrypt.hash(pin, 10);

                const existMail = await userCollection.findOne({ email });
                const existPhone = await userCollection.findOne({ phone });
                const existMail2 = await agentCollection.findOne({ email });
                const existPhone2 = await agentCollection.findOne({ phone });

                if (existMail || existPhone || existMail2 || existPhone2) {
                    return res.status(409).json({ error: 'user already exists' });
                } else {
                    console.log("its new one")
                }

                const newAgent = { email, phone, pin: hashedPin, ...otherData };
                const result = await userCollection.insertOne(newAgent);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'An error occurred while processing your request' });
            }
        });
        app.post('/login', async (req, res) => {
            try {
                const { key, pin } = req.body;
                let user;

                if (/^\d+$/.test(key)) {
                    // key is a phone number
                    user = await userCollection.findOne({ phone: key }) || await agentCollection.findOne({ phone: key });
                } else {
                    // key is an email
                    user = await userCollection.findOne({ email: key }) || await agentCollection.findOne({ email: key });
                }

                if (user && await bcrypt.compare(pin, user.pin)) {
                    res.status(200).json({ message: 'Login successful', user });
                } else {
                    res.status(401).json({ error: 'Invalid credentials' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'An error occurred while processing your request' });
            }
        });











        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensure client will close when you finish/error
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server running');
});

app.listen(port, () => {
    console.log('Server running on port ' + port);
});
