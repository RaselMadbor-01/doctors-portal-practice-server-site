const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
require("dotenv").config();
const port = process.env.PORT || 5000;

//user : doctorsDB
//password:Axx5bP90jc45DfpC
//doctors-portal-firebase-adminsdk.json

const serviceAccount = require("./doctors-portal-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vkos1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("doctor Portal connect with server");
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  const idToken = req.headers.authorization;
  if (idToken.startsWith("Bearer ")) {
    const token = idToken.split(" ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedToken.email;
    } catch {}
  }

  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("doctors-portal-database");
    const servicesCollection = database.collection("doctorServices");
    const appointmentCollection = database.collection("appointments");
    const usersCollection = database.collection("users");
    console.log("mongodb connect successfully");

    //GET
    app.get("/appointment", verifyToken,async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date };
      const cursor = appointmentCollection.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });

    //GET
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      let isAdmin = false;
      console.log(result);
      if (result?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    //POST
    app.post("/appointment", async (req, res) => {
      const body = req.body;
      const result = await appointmentCollection.insertOne(body);
      res.json(result);
    });

    //POST
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    //PUT
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
    //PUT
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;

      const requester = req.decodedEmail;
      if (requester) {
        const requesterAcount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAcount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      }

      
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Successfully connect with server and port is :", port);
});
