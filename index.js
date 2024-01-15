const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;



app.use(express.json());
app.use(cors());


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



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
    const firstCollection = client.db("trendFirst").collection("firstOne");
    const payCollection = client.db("paymentOne").collection("payments");
    const userPremium = client.db("userPremium").collection("premium");
    const userSubCollection = client.db("userSubscribe").collection("subOne")
    const commentCollection = client.db("userComment").collection("comments")




    // jwt related api

    app.post("/jwt", async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '24h'
      })
      res.send({ token })
    })

    // middleware


    const verifyToken = (req, res, next) => {
      console.log("Inside verified token", req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };



    const verifyAdmin = async (req, res, next) => {

      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }



    // user related api
    app.get("/trend", async (req, res) => {
      const result = await trendCollection.find().toArray();
      res.send(result)
    })
    app.get("/pre", async (req, res) => {
      const result = await userSubCollection.find().toArray();
      res.send(result)
    })

    app.get("/first", async (req, res) => {
      const result = await firstCollection.find().toArray();
      res.send(result)
    })


    app.post("/users", async (req, res) => {
      const user = req.body
      const query = {
        email: user?.email,
        name: user?.name
      }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })


    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })


    app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(401).send({ message: 'unauthorize access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })



    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)

    })

    // admin api

    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)

    })




    app.post('/subscribe', async (req, res) => {
      const { email, subscriptionPeriod } = req.body;
      const currentDate = new Date();
      let subscriptionEndDate = currentDate;

      if (subscriptionPeriod === "1min") {
        subscriptionEndDate.setMinutes(currentDate.getMinutes() + 1);
      } else if (subscriptionPeriod === "5days") {
        subscriptionEndDate.setDate(currentDate.getDate() + 5);
      } else if (subscriptionPeriod === "10days") {
        subscriptionEndDate.setDate(currentDate.getDate() + 10);
      }

      try {
        const user = await userPremium.findOneAndUpdate(
          { email },
          { $set: { premiumTaken: subscriptionEndDate } },
          { returnOriginal: false, upsert: true }
        );

        if (user && user.value) {
          // Access 'value' property when 'user' is not null and 'value' is defined
          return res.status(200).json(user.value);
        } else {
          return res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error subscribing user:', error);
        return res.status(500).json({ error: 'Could not subscribe user' });
      }
    });





    app.post("/add", async (req, res) => {

      const item = req.body
      const result = await addCollection.insertOne(item)
      res.send(result)

    })

    app.get("/add", async (req, res) => {
      const result = await addCollection.find().toArray()
      res.send(result);
    })


    app.get("/articles", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
    
        if (limit > 50) {
          return res.status(400).send({ message: 'Limit should not exceed 50' });
        }
    
        const query = addCollection.find();
        const articles = await query.skip(offset).limit(limit).toArray();
        
        const totalCount = await addCollection.countDocuments();
        
        res.send({ articles, totalCount });
      } catch (error) {
        console.error("Error fetching articles:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });
    

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;

      if (!price || isNaN(price) || typeof price !== 'number') {
        return res.status(400).send({ error: 'Invalid price value' });
      }

      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent');

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });

        res.send({
          clientSecret: paymentIntent.client_secret
        });
      } catch (err) {
        // Handle Stripe errors, including authentication errors
        console.error('Stripe Error:', err.message);
        res.status(500).send({ error: 'Failed to create payment intent' });
      }
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body
      const paymentResult = await payCollection.insertOne(payment)
      res.send(paymentResult);

    })


    // comment
    app.post("/comment", async (req, res) => {
      try {
        const item = req.body;nod
        const result = await commentCollection.insertOne(item);
        res.status(200).json({ message: 'Comment inserted successfully', result });
      } catch (error) {
        console.error('Error inserting comment:', error);
        res.status(500).json({ message: 'Failed to insert comment' });
      }
    });
    ;
    
    app.get('/comment', async (req, res) => {
      try {
        const result = await commentCollection.find().toArray(); 
        res.status(200).json({ message: 'Comments retrieved successfully', comments: result });
      } catch (error) {
        console.error('Error retrieving comments:', error);
        res.status(500).json({ message: 'Failed to get comments' });
      }
    });
    

 


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('the server is running at 5000')

})

app.listen(port, () => {
  console.log(`the server is running ${port}`)
})