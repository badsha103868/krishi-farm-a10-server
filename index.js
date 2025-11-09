const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.port || 3000;



// middleware
app.use(cors());
app.use(express.json())


// normal get
app.get('/', (req,res)=>{
  res.send("Krishi Farm is running")
})

// listen
app.listen(port, ()=>{
  console.log(`Krishi Farm is running on port: ${port}`)
})