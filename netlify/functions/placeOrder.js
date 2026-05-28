const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

exports.handler = async (event, context) => {
    // Only allow POST requests (sending data)
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        await client.connect();
        const database = client.db("localroot_db");
        const orders = database.collection("orders");

        const orderData = JSON.parse(event.body);
        
        // Inject a real server timestamp and set initial status
        orderData.createdAt = new Date();
        orderData.status = "Pending";

        const result = await orders.insertOne(orderData);

        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, orderId: result.insertedId })
        };
    } catch (error) {
        console.error("Database Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to save order" }) };
    } finally {
        await client.close();
    }
};
