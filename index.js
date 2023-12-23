const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000 ;



app.use(express.json());
app.use(cors());



const uri = `mongodb+srv://${process.env.USER_id}:${process.env.USER_pass}@cluster0.ubtwufv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {


const trendCollection = client.db("finalOne").collection("trend");

const addCollection = client.db("newsOne").collection("news");
const userCollection = client.db("userOne").collection("users");
const firstCollection = client.db("trendFirst").collection("firstOne")


app.get("/trend", async (req,res) =>{
  const result = await trendCollection.find().toArray();
  res.send(result)
})


app.get("/first", async(req,res) =>{
  const result = await firstCollection.find().toArray();
  res.send(result)
})


app.post("/users", async(req,res) =>{
 const user = req.body
 const query = {email: user.email}
 const existingUser = await userCollection.findOne(query)
 if(existingUser){
  return res.send({message: "user already exist", insertedId:null })
 }
const result = await userCollection.insertOne(user)
res.send(result)
})

  
app.get("/users", async(req,res) =>{
const result = await userCollection.find().toArray();
res.send(result);


})


app.post("/add", async(req,res) =>{
    
const item = req.body  
const result = await addCollection.insertOne(item)
res.send(result)

})

app.get("/add",async(req,res) =>{
  const result = await addCollection.find().toArray()
  res.send(result);
})


app.get("/articles", async(req,res) =>{
    const result = await addCollection.find().toArray();
    res.send(result)

})



app.patch('/trend/:id/view', async (req, res) => {
  const updates = { views: req.body.views }; 

  if (ObjectId.isValid(req.params.id)) {
    try {
      const result = await db.collection('trend').updateOne(
        { _id: ObjectId(req.params.id) },
        { $set: updates }
      );

      if (result.modifiedCount === 1) {
        res.status(200).json({ message: 'View count updated successfully' });
      } else {
        res.status(404).json({ error: 'Article not found or not updated' });
      }
    } catch (error) {
      console.error('Error updating view count:', error);
      res.status(500).json({ error: 'Error updating view count' });
    }
  } else {
    res.status(400).json({ error: 'Invalid article ID' });
  }
});




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
res.send('the server is running at 5000')

})

app.listen(port, () =>{
    console.log(`the server is running ${port}`)
})