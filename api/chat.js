/* =======================================================
   IKED BRAIN v6.0 (Smart Fallback System)
   Try Gemini 2.5 -> If Quota Exceeded -> Switch to 1.5
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

        // شخصية الأستاذ IKED
        const systemInstruction = `
        🔴 تعليمات النظام (System Persona):
        أنت "IKED"، أستاذ رياضيات وفيزياء مغربي للثانية باكالوريا.
        - اشرح بالدارجة المغربية والمصطلحات العلمية الفرنسية.
        - طبق المنهجية البيداغوجية النشطة: لا تعطِ الحل، بل وجه التلميذ.
        - تعامل بذكاء وصبر، وشجع التلميذ دائماً.
        `;

        const fullPrompt = `${systemInstruction}\n\n👤 التلميذ: ${prompt}\n🎓 الأستاذ IKED:`;

        /* ==================================================
           محاولة 1: استعمال الموديل الخارق (Gemini 2.5)
           ================================================== */
        try {
            console.log("Attempting with Gemini 2.5 Flash...");
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });

            // إلا كان الرد 429 (تقادا الرصيد) أو 404 (مالقاش الموديل)، دوز للخطة ب
            if (response.status === 429 || response.status === 404) {
                throw new Error(`Primary model failed with status ${response.status}`);
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Google Error: ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            // نجحنا! نرجعو الجواب
            return res.status(200).json({ result: text });

        } catch (primaryError) {
            /* ==================================================
               محاولة 2: خطة الإنقاذ (Gemini 1.5 Flash)
               ================================================== */
            console.warn(`⚠️ Switching to Fallback Model (1.5) due to: ${primaryError.message}`);

            const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
            });

            if (!fallbackResponse.ok) {
                const errText = await fallbackResponse.text();
                throw new Error(`Backup model also failed: ${errText}`);
            }

            const data = await fallbackResponse.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            // نرجعو الجواب (التلميذ ما غايحس بوالو)
            return res.status(200).json({ result: text || "وصل الجواب فارغ." });
        }

    } catch (error) {
        console.error("Critical Server Error:", error);
        return res.status(500).json({ error: "سمح ليا، الخوادم مشغولة بزاف دابا. عاود سولني من دابا واحد شوية." });
    }
}
