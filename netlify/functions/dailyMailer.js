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
                <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">

                <!-- Header Logo Section -->
                <div style="text-align: center; padding: 25px 0; background-color: #fcfcfc; border-bottom: 3px solid #6A1B9A;">
                <a href="https://localroot.me" target="_blank" style="text-decoration: none;">    
                <img src="https://localroot.me/logo1.png" alt="LocalRoot Kuwait Logo" style="max-width: 160px; height: auto; display: inline-block;" />
                </a>
                </div>

                <!-- ENGLISH SECTION -->
                <div style="padding: 30px 30px 15px 30px; color: #333333; border-bottom: 1px dashed #e0e0e0;">
                    <h2 style="color: #2E7D32; margin-top: 0;">Fresh from the farm to your door. 🌿</h2>
                    <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
                    <p style="font-size: 16px; line-height: 1.6;">You are receiving this because you have supported our other business, and I always appreciate your trust.</p>
                    <p style="font-size: 16px; line-height: 1.6;">I wanted to personally reach out and share a completely new project I have been working on: <strong>LocalRoot</strong>. We have built a local, farm-to-table service here in Kuwait that harvests fresh produce daily and delivers it straight to your door within hours.</p>
                   <!-- ENGLISH BUTTON -->
                    <div style="text-align: center; margin: 35px 0 15px 0;">
                        <a href="https://localroot.me" style="background-color: #2E7D32; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">Shop Today's Harvest 🌱</a>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">Taste the difference that true local freshness makes.</p>
                </div>

                <!-- ARABIC SECTION -->
                <div dir="rtl" style="padding: 15px 30px 30px 30px; color: #333333; text-align: right; font-family: Tahoma, Arial, sans-serif;">
                    <h2 style="color: #2E7D32; margin-top: 0;">طازج من المزرعة إلى باب بيتك. 🌿</h2>
                    <p style="font-size: 16px; line-height: 1.6;">مرحباً،</p>
                    <p style="font-size: 16px; line-height: 1.6;">تصلك هذه الرسالة لأنك من عملائنا الكرام في شكرتنا الثانيه ، وأنا ممتن دائماً لثقتك ودعمك.</p>
                    <p style="font-size: 16px; line-height: 1.6;">أود أن أشاركك شخصياً مشروعنا الجديد: <strong>لوكال روت (LocalRoot)</strong>. لقد قمنا بتأسيس خدمة محلية في الكويت لتوصيل المنتجات الزراعية الطازجة من المزرعة مباشرة إلى باب بيتك خلال ساعات من حصادها.</p>
                    <!-- ARABIC BUTTON -->
                    <div style="text-align: center; margin: 35px 0 25px 0;">
                        <a href="https://localroot.me" style="background-color: #2E7D32; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; font-family: Tahoma, Arial, sans-serif;">تسوق حصاد اليوم 🌱</a>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">تذوق الفرق الحقيقي للمنتجات المحلية الطازجة.</p>
                    <br>
                    <p style="font-size: 16px; margin: 0; font-weight: bold; color: #2E7D32;">The LocalRoot Team / فريق لوكال روت</p>
                    <p style="font-size: 14px; margin: 5px 0 0 0; color: #777;">Abdali, Kuwait / العبدلي، الكويت</p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9f9f9; padding: 15px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="font-size: 12px; color: #999999; margin: 0; margin-bottom: 5px;">
                        You are receiving this update as a past supporter. If you prefer not to receive updates about this new farm project, simply reply 'Unsubscribe'.
                    </p>
                    <p dir="rtl" style="font-size: 12px; color: #999999; margin: 0; font-family: Tahoma, Arial, sans-serif;">
                        تصلك هذه الرسالة كأحد عملائنا السابقين. يمكنك الرد بكلمة "إلغاء" إذا كنت لا تود استقبال المزيد من الرسائل حول هذا المشروع.
                    </p>
                </div>
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