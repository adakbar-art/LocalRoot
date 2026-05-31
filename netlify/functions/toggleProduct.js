const { MongoClient, ObjectId } = require('mongodb');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    try {
        const { id, isActive } = JSON.parse(event.body);
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        
        const collection = client.db("localroot_db").collection("products");
        
        // Update the item to set isActive to true or false
        await collection.updateOne(
            { _id: new ObjectId(id) }, 
            { $set: { isActive: isActive } }
        );
        
        await client.close();
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};