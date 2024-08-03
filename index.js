const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 3000;
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");

app.use(express.json());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());

const uri = `mongodb+srv://Euro:${process.env.DB_PASSWORD}@cluster0.swwr6sg.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();
    const database = client.db("Euro");
    const agentCollection = database.collection("agent");
    const userCollection = database.collection("user");
    const admin = database.collection("admin");

    app.post("/agent", async (req, res) => {
      try {
        const { email, phone, pin, ...otherData } = req.body;
        const hashedPin = await bcrypt.hash(pin, 10);

        const existMail = await userCollection.findOne({ email });
        const existPhone = await userCollection.findOne({ phone });
        const existMail2 = await agentCollection.findOne({ email });
        const existPhone2 = await agentCollection.findOne({ phone });
        if (existMail || existPhone || existMail2 || existPhone2) {
          return res.status(409).json({ error: "Agent already exists" });
        }
        const newAgent = { email, phone, pin: hashedPin, ...otherData };
        const result = await agentCollection.insertOne(newAgent);
        res.send(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ error: "An error occurred while processing your request" });
      }
    });
    app.post("/user", async (req, res) => {
      try {
        const { email, phone, pin, ...otherData } = req.body;
        const hashedPin = await bcrypt.hash(pin, 10);

        const existMail = await userCollection.findOne({ email });
        const existPhone = await userCollection.findOne({ phone });
        const existMail2 = await agentCollection.findOne({ email });
        const existPhone2 = await agentCollection.findOne({ phone });

        if (existMail || existPhone || existMail2 || existPhone2) {
          return res.status(409).json({ error: "user already exists" });
        } else {
          console.log("its new one");
        }

        const newAgent = { email, phone, pin: hashedPin, ...otherData };
        const result = await userCollection.insertOne(newAgent);
        res.send(result);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ error: "An error occurred while processing your request" });
      }
    });

    app.post("/login", async (req, res) => {
      try {
        const { key, pin } = req.body;
        let user;

        if (key === "admin@admin.com" || key === "01581429924") {
          user = await admin.findOne({ email: "admin@admin.com" });
          console.log(user);
          console.log("user", user);
        } else {
          if (/^\d+$/.test(key)) {
            // key is a phone number
            user =
              (await userCollection.findOne({ phone: key })) ||
              (await agentCollection.findOne({ phone: key }));
          } else {
            // key is an email
            user =
              (await userCollection.findOne({ email: key })) ||
              (await agentCollection.findOne({ email: key }));
          }
          console.log("user", user);
        }

        if (user && (await bcrypt.compare(pin, user.pin))) {
          const token = jwt.sign(
            {
              uid: user._id,
              email: user.email,
              role: user.role,
              pin: user.pin,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: "2h",
            },
          );
          user.token = token;
          user.pin = undefined;
          user.uid = user._id;
          user._id = undefined;
          // cookie section
          const options = {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            httpOnly: true,
          };
          res.cookie("status", "true", {
            expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          });
          res.status(201).cookie("token", token, options).json({
            success: true,
            token,
            user,
          });
        } else {
          res.status(401).json({ error: "Invalid credentials" });
        }
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ error: "An error occurred while processing your request" });
      }
    });

    app.get("/dashboard", auth, async (req, res) => {
      const uid = req?.user?.uid;

      if (uid === process.env.ADMIN_UID) {
        let user = await admin.findOne({ _id: new ObjectId(uid) });
        user.pin = undefined;

        res.send(user);
      } else {
        let user =
          (await userCollection.findOne({ _id: new ObjectId(uid) })) ||
          (await agentCollection.findOne({ _id: new ObjectId(uid) }));
        user.pin = undefined;

        res.send(user);
      }
    });

    app.get("/logout", (req, res) => {
      res.clearCookie("status");
      res.clearCookie("token");
      res.status(200).send("Logged out");
    });

    app.get("/balance", auth, async (req, res) => {
      const uid = req.user.uid;

      if (uid === process.env.ADMIN_UID) {
        const find = await admin.findOne({ _id: new ObjectId(uid) });
        res.send(find?.balance);
      } else {
        const find =
          (await agentCollection.findOne({ _id: new ObjectId(uid) })) ||
          (await userCollection.findOne({ _id: new ObjectId(uid) }));
        res.send(find?.balance);
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensure client will close when you finish/error
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(port, () => {
  console.log("Server running on port " + port);
});
