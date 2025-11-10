const express = require('express');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;







// middleware
app.use(cors());
app.use(express.json())



// mongodb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@portfolio-cluster1.ea8n2bl.mongodb.net/?appName=portfolio-cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

 async function run(){
  try{
     await client.connect();

     const db = client.db("Farm_db")
     const cropsCollection = db.collection("crops")

    //  GET
    app.get('/crops', async (req,res)=>{
      const cursor = cropsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

  
    //  POST
    app.post('/crops', async (req, res) => {
     const newCrops = req.body;
      const result = await cropsCollection.insertOne(newCrops);
      res.send(result);
    });
    


     await client.db('admin').command({ping : 1})
     console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  }
  finally{

  }
 }
 run().catch(console.dir)



// normal get
app.get('/', (req,res)=>{
  res.send("Krishi Farm is running")
})

// listen
app.listen(port, ()=>{
  console.log(`Krishi Farm is running on port: ${port}`)
})