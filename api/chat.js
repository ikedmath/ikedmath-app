/* =======================================================
   IKED BRAIN v3.0 (Powered by Gemini 2.5 Flash)
   Persona: Moroccan Math Tutor (Darija Mode)
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات CORS (باش التطبيق يتصل بحرية)
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

        // 2. هندسة الأوامر (Prompt Engineering)
        // هنا كنعطيو للذكاء "الشخصية" ديالو باش ما يجاوبش بحال الروبو
        const systemInstruction = `
            انت هو "IKED"، أستاذ رياضيات وفيزياء مغربي ذكي ومحترف.
            - شرحك دايما بالدارجة المغربية المفهومة والمبسطة.
            - كتستعمل أمثلة من الواقع المغربي باش التلميذ يفهم.
            - فاش تعطيك معادلة رياضية، حلها خطوة بخطوة (Step-by-step) وعاد عطيني النتيجة.
            - إلا كان السؤال خارج الدراسة، جاوب بلياقة ورجع الموضوع للقراية.
            - انت مشجع، إيجابي، وكتقول "تبارك الله عليك" و "يا بطل".
        `;

        // دمجنا السؤال ديال التلميذ مع الشخصية
        const fullPrompt = `${systemInstruction}\n\nسؤال التلميذ هو: ${prompt}`;

        // 3. الاتصال بالموديل المختار (Gemini 2.5 Flash)
        // اخترنا هذا الموديل من القائمة ديالك لأنه الأسرع والأذكى
        const modelName = "models/gemini-2.5-flash"; 
        
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            // في حالة فشل 2.5، سنحاول مع الموديل الاحتياطي (Latest)
            console.warn("Retrying with fallback model...", err);
            return await tryFallbackModel(apiKey, fullPrompt, res);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return res.status(200).json({ result: textResponse || "ما لقيتش جواب، عاود سولني!" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}

// دالة احتياطية: إلا ماخدمش الموديل الجديد، نرجعو للقديم المضمون
async function tryFallbackModel(apiKey, prompt, res) {
    try {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        const response = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return res.status(200).json({ result: text || "Error in fallback" });
    } catch (e) {
        return res.status(500).json({ error: "الخوادم مشغولة حالياً." });
    }
}
