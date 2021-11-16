const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jlnis.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function verifyToken(req, res, next) {
  console.log("in vergy token");
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("MyCar");
    const carsCollection = database.collection("Cars");
    const usersCollection = database.collection("users");
    const ordersCollection = database.collection("orders");
    const reviewCollection = database.collection("review");

    app.get("/cars", async (req, res) => {
      const cursor = carsCollection.find({});
      const cars = await cursor.toArray();
      res.send(cars);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.get("/review", async (req, res) => {
      const cursor = reviewCollection.find({});
      const cars = await cursor.toArray();
      res.send(cars);
    });
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      let query;
      console.log(email);
      if (email) {
        query = { Email: email };
      } else {
        query = {};
      }
      console.log(query);
      const orders = await ordersCollection.find(query);
      const result = await orders.toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });
    app.post("/review", async (req, res) => {
      const user = req.body;
      const result = await reviewCollection.insertOne(user);
      res.json(result);
    });

    app.post("/order", async (req, res) => {
      const order = req.body;
      console.log(order);
      const result = await ordersCollection.insertOne(order);
      res.json(result);
    });
    app.post("/cars", async (req, res) => {
      const car = req.body;
      const result = await carsCollection.insertOne(car);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      console.log("put", user);
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

    // GET Single car
    app.get("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await carsCollection.findOne(query);
      res.json(result);
    });

    //   Delete Api
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.json(result);
    });

    app.delete("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await carsCollection.deleteOne(query);
      res.json(result);
    });

    app.put("/users/admin", async (req, res) => {
      const user = req.body;
      const requesterAccount = user.requester;
      const email = user.email;

      if (user) {
        const checkRequesterAccount = await usersCollection.findOne({
          email: requesterAccount,
        });

        if (checkRequesterAccount.role === "admin") {
          const filter = { email: email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "You do not have access to make admin" });
      }
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello MyCars ");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
