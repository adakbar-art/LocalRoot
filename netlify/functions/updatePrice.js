const { MongoClient, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    try {
        await client.connect();
        const database = client.db("localroot_db");
        const { id, newPrice } = JSON.parse(event.body);

        await database.collection("products").updateOne(
            { _id: new ObjectId(id) },
            { $set: { price: parseFloat(newPrice) } }
        );
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    } finally { await client.close(); }
};
