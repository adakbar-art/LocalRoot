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

        // 📧 NEW: Send Branded Automated Email via Resend
        try {
            const emailHtml = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #e1bee7; border-radius: 8px; overflow: hidden;">
                    <div style="background: #6A1B9A; padding: 20px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">LocalRoot Kuwait</h1>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #6A1B9A; margin-top: 0;">Thank you for your order, ${orderData.customerName}!</h2>
                        <p style="font-size: 16px;">We have successfully received your order and are preparing your fresh produce from the farm.</p>
                        <div style="background: #f8f3fa; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px dashed #9c27b0;">
                            <strong>Order Reference:</strong> <span style="font-family: monospace; color: #6A1B9A; font-size: 16px;">${orderData.orderId}</span><br><br>
                            <strong>Order Total:</strong> KWD ${Number(orderData.total).toFixed(2)}
                        </div>
                        <p style="font-size: 14px; color: #555;">We will contact you at <strong>${orderData.phone}</strong> shortly to arrange delivery to:<br><em>${orderData.address}</em></p>
                        <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">© 2026 LocalRoot Kuwait. All rights reserved.</p>
                    </div>
                </div>
            `;

            // Call the Resend API
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'LocalRoot <orders@localroot.me>', 
                    to: [orderData.customerEmail], 
                    subject: `Your LocalRoot Order: ${orderData.orderId}`,
                    html: emailHtml
                })
            });
            console.log("Customer receipt email sent successfully!");
        } catch (emailError) {
            console.error("Email failed to send:", emailError);
            // Notice we don't fail the whole order just because the email glitches
        }

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