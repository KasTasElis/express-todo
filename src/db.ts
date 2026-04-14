import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri!, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const db = client.db("todo");

export const connectDB = async () => {
  try {
    await client.connect();
    console.log("MongoDB Connected.");
  } catch (err) {
    console.error("MongoDB connection problem: ", err);
  }
};
