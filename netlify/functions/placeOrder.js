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

        // 📧 Send Emails via Resend
        try {
            // --- 1. EMAIL TO CUSTOMER ---
            const customerEmailHtml = `
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
                    html: customerEmailHtml
                })
            });

            // --- 2. ALERT EMAIL TO YOU (ADMIN) ---
            const adminEmailHtml = `
                <div style="font-family: sans-serif; color: #111;">
                    <h2 style="color: #d32f2f;">🚨 New Order Received!</h2>
                    <p><strong>Customer:</strong> ${orderData.customerName}</p>
                    <p><strong>Phone:</strong> ${orderData.phone}</p>
                    <p><strong>Address:</strong> ${orderData.address}</p>
                    <p><strong>Total:</strong> KWD ${Number(orderData.total).toFixed(2)}</p>
                    <p><strong>Order Ref:</strong> ${orderData.orderId}</p>
                    <hr>
                    <p>Log in to your Admin Dashboard or MongoDB to see the full list of items they purchased.</p>
                </div>
            `;

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'LocalRoot System <orders@localroot.me>', 
                    to: ['adakbar@firstline.com.kw'], // <-- CHANGE THIS TO YOUR ACTUAL EMAIL
                    subject: `🚨 New Order: KWD ${Number(orderData.total).toFixed(2)} from ${orderData.customerName}`,
                    html: adminEmailHtml
                })
            });

            console.log("Both customer and admin emails sent successfully!");
        } catch (emailError) {
            console.error("Email failed to send:", emailError);
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