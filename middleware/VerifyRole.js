
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://Euro:${process.env.DB_PASSWORD}@cluster0.swwr6sg.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {


    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function verifyRole(role) {
    await client.connect();
    const database = client.db('Euro');
    const userCollection = database.collection('user');
    const agentCollection = database.collection('agent');

    return async (req, res, next) => {
        try {
            const token = req.cookies.token;
            if (!token) return res.status(401).send('Access denied. No token provided.');

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { uid } = decoded;

            let user = await userCollection.findOne({ _id: new ObjectId(uid) });
            if (!user) {
                user = await agentCollection.findOne({ _id: new ObjectId(uid) });
            }

            if (!user || user.role !== role) {
                return res.status(403).send('Access denied. Insufficient permissions.');
            }

            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            res.status(400).send('Invalid token.');
        }
    };
}

const verifyAdmin = verifyRole('admin');
const verifyAgent = verifyRole('agent');
const verifyUser = verifyRole('user');

module.exports = { verifyAdmin, verifyAgent, verifyUser };
