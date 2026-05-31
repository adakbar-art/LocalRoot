const { MongoClient, ObjectId } = require('mongodb');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    try {
        const { id, newNameEn, newNameAr } = JSON.parse(event.body);
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        
        const collection = client.db("localroot_db").collection("products");
        
        // Update both English and Arabic names
        await collection.updateOne(
            { _id: new ObjectId(id) }, 
            { $set: { name: newNameEn, nameAr: newNameAr } }
        );
        
        await client.close();
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};