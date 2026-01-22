/* =======================================================
   IKED BRAIN v2026 (Next-Gen)
   Powered by Gemini 2.5 Flash 🚀
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'فين السؤال؟' });

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

        // 2. شخصية الأستاذ IKED (Persona)
        const systemInstruction = `
        🔴 تعليمات النظام (System Persona):
        أنت "IKED"، أستاذ رياضيات وفيزياء مغربي للثانية باكالوريا (Bac 2026).
        - اشرح بالدارجة المغربية والمصطلحات العلمية الفرنسية.
        - طبق المنهجية البيداغوجية النشطة: لا تعطِ الحل، بل وجه التلميذ.
        - تعامل بذكاء وصبر، وشجع التلميذ دائماً.
        `;

        const fullPrompt = `${systemInstruction}\n\n👤 التلميذ: ${prompt}\n🎓 الأستاذ IKED:`;

        // 3. الاتصال بالموديل الحديث (Gemini 2.5 Flash)
        // ملاحظة: نستخدم الاسم كما ظهر في القائمة لديك
        const modelName = "gemini-2.5-flash"; 
        
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        console.log(`📡 Connecting to ${modelName}...`);

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }]
            })
        });

        // 4. معالجة دقيقة للأخطاء (باش نعرفو السبب الحقيقي)
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Google API Error:", errorText);
            
            // هنا كنرد ليك الخطأ بالتفصيل باش تشوفو
            throw new Error(`Google Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error("وصل الجواب ولكن كان فارغاً (Empty Response).");
        }

        return res.status(200).json({ result: textResponse });

    } catch (error) {
        console.error("Server Function Error:", error);
        // إرسال تفاصيل الخطأ للتطبيق
        return res.status(500).json({ error: error.message });
    }
}
