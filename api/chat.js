/* =======================================================
   IKED SERVERLESS FUNCTION (No Dependencies Version)
   Connects to Google Gemini API using native fetch.
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات CORS (ضرورية باش الـ Frontend يقدر يتصل بالـ Backend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // التعامل مع طلبات Pre-flight (للمتصفح)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. السماح فقط بطلبات POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    try {
        // 3. قراءة السؤال من التطبيق
        // ملاحظة: Vercel يقوم بتحليل JSON تلقائياً في req.body
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'المرجو إرسال سؤال (prompt)' });
        }

        // 4. جلب الساروت من إعدادات Vercel
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ Error: GEMINI_API_KEY is missing in Vercel Environment Variables.");
            return res.status(500).json({ 
                error: 'Server Error: API Key not configured.',
                hint: 'Did you add GEMINI_API_KEY to Vercel Settings?' 
            });
        }

        // 5. الاتصال بـ Google Gemini مباشرة (REST API)
        // نستخدم موديل gemini-1.5-flash لأنه سريع جداً ومناسب للشات
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        // 6. التحقق من رد Gemini
        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Google API Error: ${geminiResponse.statusText}`);
        }

        const data = await geminiResponse.json();

        // 7. استخراج الجواب
        // Gemini يرد بهيكلة معقدة قليلاً، نحتاج للوصول للنص
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {
            throw new Error('No text returned from Gemini.');
        }

        // 8. إرسال الجواب للتطبيق
        return res.status(200).json({ result: aiText });

    } catch (error) {
        console.error("Server Function Error:", error);
        return res.status(500).json({ 
            error: 'حدث خطأ داخلي في الخادم',
            details: error.message 
        });
    }
}
