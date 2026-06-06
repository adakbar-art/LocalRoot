const { schedule } = require('@netlify/functions');
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// This function will automatically run in the background
const handler = async function(event, context) {
    try {
        await client.connect();
        const database = client.db("localroot_db");
        const leads = database.collection("marketing_leads");

        // 1. Find 100 emails that haven't been sent yet
        const batch = await leads.find({ status: "pending" }).limit(50).toArray();

        if (batch.length === 0) {
            console.log("No more pending emails in the database!");
            return { statusCode: 200 };
        }

        console.log(`Preparing to send ${batch.length} emails...`);

        // 2. Loop through the 100 emails
        for (const lead of batch) {
            
            const emailHtml = `
                <div style="font-family: sans-serif; color: #333;">
                    <p>Hi there,</p>
                    <p>As a valued customer of my other business, I wanted to personally invite you to check out my new project: <strong>LocalRoot Kuwait</strong>.</p>
                    <p>We are growing fresh, farm-to-table produce right here in Kuwait and delivering it directly to your door.</p>
                    <p>Check out what we harvested today at <a href="https://localroot.me" style="color: #6A1B9A;">localroot.me</a></p>
                    <br>
                    <p>Best regards,</p>
                    <p>The LocalRoot Team</p>
                    <p style="font-size: 10px; color: #999;">If you don't want to receive updates about this new project, simply reply 'unsubscribe'.</p>
                </div>
            `;

            try {
                // Send via Resend
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'LocalRoot <hello@localroot.me>', 
                        to: [lead.email], 
                        subject: 'A new local farm project in Kuwait 🌱',
                        html: emailHtml
                    })
                });

                // 3. Mark as sent in the database so they don't get emailed again tomorrow
                await leads.updateOne(
                    { _id: lead._id },
                    { $set: { status: "sent", sentAt: new Date() } }
                );

            } catch (err) {
                console.error(`Failed to send to ${lead.email}`);
            }
        }

        console.log("Daily batch completed.");
        return { statusCode: 200 };

    } catch (error) {
        console.error("Database Error:", error);
        return { statusCode: 500 };
    } finally {
        await client.close();
    }
};

// Schedule this to run once a day at 10:00 AM UTC
exports.handler = schedule("0 10 * * *", handler);