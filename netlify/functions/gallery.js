const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

exports.handler = async (event, context) => {
    try {
        await client.connect();
        const database = client.db("localroot_db");
        const gallery = database.collection("gallery");

        // GET: Fetch all images
        if (event.httpMethod === "GET") {
            const images = await gallery.find({}).sort({ uploadedAt: -1 }).toArray();
            return { statusCode: 200, body: JSON.stringify(images) };
        }

        // POST: Upload a new image
        if (event.httpMethod === "POST") {
            const data = JSON.parse(event.body);
            const newImage = {
                imageData: data.imageData,
                uploadedAt: new Date()
            };
            await gallery.insertOne(newImage);
            return { statusCode: 201, body: JSON.stringify({ success: true }) };
        }

        // ✨ NEW: DELETE an image by its ID
        if (event.httpMethod === "DELETE") {
            const data = JSON.parse(event.body);
            const result = await gallery.deleteOne({ _id: new ObjectId(data.id) });
            
            if (result.deletedCount === 1) {
                return { statusCode: 200, body: JSON.stringify({ success: true }) };
            } else {
                return { statusCode: 404, body: JSON.stringify({ error: "Image not found" }) };
            }
        }

        return { statusCode: 405, body: "Method Not Allowed" };
    } catch (error) {
        console.error("Database Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Database error" }) };
    } finally {
        await client.close();
    }
};