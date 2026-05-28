const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

exports.handler = async (event, context) => {
    try {
        await client.connect();
        const database = client.db("localroot_db");
        const orders = database.collection("orders");

        // Fetch all orders from the database, newest first
        const allOrders = await orders.find({}).sort({ createdAt: -1 }).toArray();

        return {
            statusCode: 200,
            body: JSON.stringify(allOrders)
        };
    } catch (error) {
        console.error("Database Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch orders" }) };
    } finally {
        await client.close();
    }
};
