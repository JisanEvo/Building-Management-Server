const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 5000;

// middle wear
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
//   app.use(cookieParser())

console.log(process.env.DB_USER)
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qrw2ki7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        await client.connect();
        const apartCollection = client.db("heavenDB").collection("apartment")
        const userCollection = client.db("heavenDB").collection("users")
        // auth related api
        // app.post('/jwt', async (req, res) => {
        //     const user = req.body
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        //         expiresIn: '365d',
        //     })
        //     res
        //         .cookie('token', token, {
        //             httpOnly: true,
        //             secure: process.env.NODE_ENV === 'production',
        //             sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        //         })
        //         .send({ success: true })
        // })
        // // Logout
        // app.get('/logout', async (req, res) => {
        //     try {
        //         res
        //             .clearCookie('token', {
        //                 maxAge: 0,
        //                 secure: process.env.NODE_ENV === 'production',
        //                 sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        //             })
        //             .send({ success: true })
        //         console.log('Logout successful')
        //     } catch (err) {
        //         res.status(500).send(err)
        //     }
        // })
        //   save user data in server
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
            // get user  info from db
            app.get('/user/:email', async(req,res)=>{
                const email =req.params.email
                const result=await userCollection.findOne({email})
                res.send(result)
            })
    //    update a user role
    app.patch('/users/update/:email', async(req,res)=>{
        const email=req.params.email
        const user=req.body
        const query={email}
        const updateDoc={
            $set:{...user,timestamp: Date.now()}
        }
        const result=await userCollection.updateOne(query,updateDoc)
        res.send(result)
    })

        // get all users data from db
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })



        app.get('/apartment', async (req, res) => {
            const result = await apartCollection.find().toArray();
            res.send(result)
        })
        // get single room
        app.get('/room/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await apartCollection.findOne(query)
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