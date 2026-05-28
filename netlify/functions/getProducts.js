const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

exports.handler = async (event, context) => {
    try {
        await client.connect();
        const database = client.db("localroot_db");
        const productsCollection = database.collection("products");

        // Fetch all products from the database, newest first
        const allProducts = await productsCollection.find({}).sort({ createdAt: -1 }).toArray();

        return {
            statusCode: 200,
            body: JSON.stringify(allProducts)
        };
    } catch (error) {
        console.error("Database Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch products" }) };
    } finally {
        await client.close();
    }
};
