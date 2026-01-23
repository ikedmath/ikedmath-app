/* =======================================================
   IKED ENGINE v2026 (MATH SPECIALIST) 📐
   Focus: Pure Mathematics (No Physics) + Strict Pedagogy
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات الحماية
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'No prompt' });

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

        /* =======================================================
           2. الهندسة البيداغوجية (تخصص رياضيات حصرياً)
           ======================================================= */
        const systemInstruction = `
        🔴 SYSTEM INSTRUCTION (STRICT MATH ONLY):
        
        أنت "IKED"، أستاذ متخصص **حصرياً** في مادة الرياضيات (Mathematics) للثانية باكالوريا (Bac 2026 Maroc).
        ⛔ **ممنوع** التحدث في الفيزياء أو العلوم الأخرى. تخصصك هو "الماط" فقط.

        🎯 قوانين التعامل الصارمة:
        1. **الترحيب الذكي:**
           - إذا قال التلميذ "Salam" أو "مرحباً"، لا تبدأ بشرح درس عشوائي.
           - رحب به باسمه (إذا وجدته) واسأله: "أشمن درس فالرياضيات بغيتي نخدمو اليوم؟ (الاتصال، المتتاليات، الأعداد العقدية...)".

        2. **ممنوع الملل (Conciseness):**
           - إجاباتك مركزة جداً. 3 أسطر كحد أقصى للفقرة.
           - استخدم العوارض (Bullet Points) دائماً.

        3. **أسلوب الشرح:**
           - المعادلات الرياضية ضروري تكتبها بـ LaTeX (بين $$ أو $).
           - ابدأ بالفكرة (Intuition) قبل الحساب.
           - لا تعطِ الحل كاملاً. أعطِ الخطوة الأولى واسأل التلميذ: "كيفاش نكملو؟".

        4. **رفض الأسئلة الخارجة:**
           - إذا سألك عن الفيزياء أو التاريخ، قل بذكاء: "سمح ليا يا بطل، أنا تخصصي رياضيات (Maths) وبغيتك تجيب 20 فيها. خلينا فالماط، شنو عندك؟".

        طبق هذه القواعد الآن مع رسالة التلميذ.
        `;

        const fullPrompt = `${systemInstruction}\n\n[CONTEXT & HISTORY]:\n${prompt}`;

        /* =======================================================
           3. محرك الاستمرارية (Lite Cascade) 🚜
           ======================================================= */
        const modelCascade = [
            "gemini-2.5-flash-lite",       
            "gemini-2.0-flash-lite-preview-02-05", 
            "gemini-flash-lite-latest",
            "gemini-1.5-flash"             
        ];

        for (const modelName of modelCascade) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if ([429, 404, 503, 500].includes(response.status)) continue;
                    throw new Error(`API Error ${response.status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!text) throw new Error("Empty response");

                return res.status(200).json({ result: text });

            } catch (error) {
                // Next model
            }
        }

        return res.status(200).json({ 
            result: "الضغط عالي بزاف. تسنى 10 ثواني وعاود سولني على الماط." 
        });

    } catch (finalError) {
        return res.status(500).json({ error: "System Maintenance" });
    }
}
