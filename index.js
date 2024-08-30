const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');

const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
// console.log(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 4000;

// middle wear
const corsOptions = {
    origin: ['http://localhost:5173','https://heaven-259e7.web.app'],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
  app.use(cookieParser())

// console.log(process.env.DB_USER)
const uri = `mongodb+srv://${process.env.DB_SUER}:${process.env.DB_PASS}@cluster0.qrw2ki7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const apartCollection = client.db("heavenDB").collection("apartment")
        const userCollection = client.db("heavenDB").collection("users")
        const cartCollection = client.db("heavenDB").collection("cart")
        const announceCollection = client.db("heavenDB").collection("announce")
        const PaymentCollection = client.db("heavenDB").collection("payment")

        const verifyAdmin = async (req, res, next) => {
            const user = req.user
            const query = { email: user?.email }
            const result = await userCollection.findOne(query)
            if (!result || result?.role !== 'admin') return res.status(401).send({ message: 'Forbidden Access' })
            next()
        }



        // save a user data in db
        app.put('/user', async (req, res) => {
            const user = req.body
            const query = { email: user?.email }
            // check if user already exists in db
            const isExist = await userCollection.findOne(query)
            if (isExist) {
                if (user.status === 'Requested') {
                    // if existing user try to change his role
                    const result = await userCollection.updateOne(query, {
                        $set: { status: user?.status },
                    })
                    return res.send(result)
                } else {
                    // if existing user login again
                    return res.send(isExist)
                }
            }

            // save user for the first time
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...user,
                    timestamp: Date.now(),
                },
            }
            const result = await userCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        // create-payment-intent
        app.post('/create-payment-intent', async (req, res) => {
            const price = req.body.price;
            // console.log(price)
             const priceInCent=parseFloat(price)*100;
            //  console.log(priceInCent)
           if(!price||priceInCent<1) return
             const {client_secret} = await stripe.paymentIntents.create({
                amount: priceInCent,
                currency: "usd",
                // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
                automatic_payment_methods: {
                    enabled: true,
                },
            })
            // send client secret
            res.send({clientSecret:client_secret})
        })
        // save payment in db
        app.post('/saving', async (req, res) => {
            const user = req.user
            const userEmail=user.email

            const paymentItem = req.body;
            paymentItem.userEmail = userEmail;

            const result = await PaymentCollection.insertOne(paymentItem);
            res.send(result);
        })

        //
        app.get('/saving/:email', async (req, res) => {
            const email = req.params.email
            const result = await PaymentCollection.findOne({ email })
            res.send(result)
        })
        // get user  info from db
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const result = await userCollection.findOne({ email })
            res.send(result)
        })
        //    update a user role
        app.patch('/users/update/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const query = { email }
            const updateDoc = {
                $set: { ...user, timestamp: Date.now() }
            }
            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        // get all users data from db
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })



        app.get('/apartment', async (req, res) => {
            const result = await apartCollection.find({}).toArray();
            res.send(result)
        })
        // get single room
        app.get('/room/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await apartCollection.findOne(query)
            res.send(result)
        })

        //    add to the cart in db
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem)
            res.send(result);
        })
        // get single user cart details
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })

        // make announce
        app.post('/announce', async (req, res) => {
            const announceItem = req.body;
            // console.log(announceItem)
            const result = await announceCollection.insertOne(announceItem)
            res.send(result);
        })
        // get announcement in backend
        app.get('/announce', async (req, res) => {
            const result = await announceCollection.find().toArray()
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('heaven is stay')
})

app.listen(port, () => {
    console.log(`heaven is stay on port ${port}`)
})