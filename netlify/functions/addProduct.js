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
        const productsCollection = database.collection("products");

        // Parse the new product information sent from our form
        const productData = JSON.parse(event.body);
        
        // Add a timestamp so we know when it was added
        productData.createdAt = new Date();

        // Insert the new product into the database
        const result = await productsCollection.insertOne(productData);

        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, productId: result.insertedId })
        };
    } catch (error) {
        console.error("Database Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to save product" }) };
    } finally {
        await client.close();
    }
};
