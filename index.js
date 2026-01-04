const express = require("express");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@portfolio-cluster1.ea8n2bl.mongodb.net/?appName=portfolio-cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    const db = client.db("Farm_db");
    const cropsCollection = db.collection("crops");
    const usersCollection = db.collection("users");

    //  user data post apis
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({
          message: "user already exits. do not need to insert again",
        });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    //   latest crops
    app.get("/latestCrops", async (req, res) => {
      const cursor = cropsCollection.find().sort({ createdAt: -1 }).limit(8);
      const result = await cursor.toArray();
      res.send(result);
    });

    //       My interest
    // My Interests API

    app.get("/myInterests", async (req, res) => {
      const email = req.query.email;

      try {
        // Find all crops where this user has sent an interest
        const cropsWithInterest = await cropsCollection
          .find({ "interests.userEmail": email })
          .toArray();

        // Map to only include the interest for this user
        const userInterests = cropsWithInterest.map((crop) => {
          const interest = crop.interests.find((i) => i.userEmail === email);
          return {
            cropId: crop._id,
            cropName: crop.name,
            ownerName: crop.owner.ownerName,
            quantity: interest.quantity,
            message: interest.message,
            status: interest.status,
          };
        });

        res.send(userInterests);
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ success: false, message: "Failed to fetch interests" });
      }
    });

    //  GET  allCrops
    app.get("/crops", async (req, res) => {
  const {
    search = "",
    type,
    location,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 8,
  } = req.query;

  const query = {};

  //  Search (name, type, location)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  //  Filter by type
  if (type) query.type = type;

  // Filter by location
  if (location) query.location = location;

  //  Price filter
  if (minPrice || maxPrice) {
    query.pricePerUnit = {};
    if (minPrice) query.pricePerUnit.$gte = Number(minPrice);
    if (maxPrice) query.pricePerUnit.$lte = Number(maxPrice);
  }

  //  Sorting
  let sortQuery = {};
  if (sort === "price_asc") sortQuery.pricePerUnit = 1;
  if (sort === "price_desc") sortQuery.pricePerUnit = -1;
  if (sort === "latest") sortQuery.createdAt = -1;

  const skip = (page - 1) * limit;

  const crops = await cropsCollection
    .find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(Number(limit))
    .toArray();

  const total = await cropsCollection.countDocuments(query);

  res.send({
    total,
    page: Number(page),
    limit: Number(limit),
    crops,
  });
});

// GET unique crop categories
app.get("/cropCategories", async (req, res) => {
  try {
    const result = await cropsCollection
      .aggregate([
        { $group: { _id: "$type" } },
        { $project: { _id: 0, type: "$_id" } }
      ])
      .toArray();

    const categories = result.map(item => item.type);

    res.send(categories);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to load categories" });
  }
});



    //  single crop find
    app.get("/crops/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cropsCollection.findOne(query);
      res.send(result);
    });

    //    UPDATE
    app.patch("/myCrops/:id", async (req, res) => {
      const id = req.params.id;
      const updatedCrop = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedCrop.name,
          type: updatedCrop.type,
          pricePerUnit: updatedCrop.pricePerUnit,
          unit: updatedCrop.unit,
          quantity: updatedCrop.quantity,
          description: updatedCrop.description,
          location: updatedCrop.location,
          image: updatedCrop.image,
          updatedAt: new Date(),
        },
      };

      const options = {};
      const result = await cropsCollection.updateOne(query, update, options);

      if (result.modifiedCount > 0) {
        res.send({ success: true, message: "Crop updated successfully" });
      } else {
        res
          .status(500)
          .send({ success: false, message: "Failed to update crop" });
      }
    });

    //  POST
    app.post("/crops", async (req, res) => {
      const newCrops = req.body;
      const result = await cropsCollection.insertOne(newCrops);
      res.send(result);
    });

    //  my post page api
    app.get("/myCrops", async (req, res) => {
      const email = req.query.email;
      const query = { "owner.ownerEmail": email };
      const result = await cropsCollection.find(query).toArray();
      res.send(result);
    });

    // my crops delete
    app.delete("/myCrops/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cropsCollection.deleteOne(query);
      res.send(result);
    });

    // crop details interset post api
    app.post("/crops/:id/interests", async (req, res) => {
      const cropId = req.params.id;
      const interest = req.body;
      // crop find  kora

      const query = { _id: new ObjectId(cropId) };
      const crop = await cropsCollection.findOne(query);

      if (!crop) {
        return res.status(404).send({ message: "Crop not found" });
      }

      // owner nija jno crop patate na para check
      if (crop.owner.ownerEmail === interest.userEmail) {
        return res
          .status(400)
          .send({ message: "Owner cannot send interest to own crop" });
      }

      // already user interest patiya se kina check
      const alreadyInterested = crop.interests?.find(
        (user) => user.userEmail === interest.userEmail
      );

      if (alreadyInterested) {
        return res
          .status(400)
          .send({ message: "You have already sent an interest for this crop" });
      }

      //  interest ar unique id create kora
      const interestId = new ObjectId();
      // new object
      const newInterest = {
        _id: interestId,
        cropId: cropId,
        userEmail: interest.userEmail,
        userName: interest.userName,
        quantity: interest.quantity,
        message: interest.message,
        status: "pending",
      };

      // interest array te push
      const result = await cropsCollection.updateOne(
        { _id: new ObjectId(cropId) },
        { $push: { interests: newInterest } }
      );

      if (result.modifiedCount > 0) {
        res.send({
          success: true,
          message: "Interest submitted successfully!",
          interest: newInterest,
        });
      } else {
        res
          .status(500)
          .send({ success: false, message: "Failed to add interest" });
      }
    });

    // PATCH interest status (Accept/Reject)
    app.patch("/interests/:id", async (req, res) => {
      const interestId = req.params.id;
      const { cropsId, status, quantity } = req.body;

      if (!["accepted", "rejected"].includes(status)) {
        return res
          .status(400)
          .send({ success: false, message: "Invalid status" });
      }

      try {
        // Update interest status
        const result = await cropsCollection.updateOne(
          {
            _id: new ObjectId(cropsId),
            "interests._id": new ObjectId(interestId),
          },
          { $set: { "interests.$.status": status } }
        );

        // If accepted → reduce crop quantity
        if (status === "accepted") {
          await cropsCollection.updateOne(
            { _id: new ObjectId(cropsId) },
            { $inc: { quantity: -quantity } }
          );
        }

        if (result.modifiedCount > 0) {
          res.send({
            success: true,
            message: `Interest ${status} successfully`,
          });
        } else {
          res
            .status(500)
            .send({ success: false, message: "Failed to update interest" });
        }
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

// normal get
app.get("/", (req, res) => {
  res.send("Krishi Farm is running");
});

// listen
app.listen(port, () => {
  console.log(`Krishi Farm is running on port: ${port}`);
});
