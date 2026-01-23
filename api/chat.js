/* =======================================================
   IKED ENGINE v2026 (PERFECT EDITION) 🧠💎
   Features:
   1. Anti-Boredom Protocol (Concise, Visual, Challenging).
   2. Name Recognition & Personalization.
   3. Zero Downtime (Lite Models Cascade).
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات الحماية (Security Headers)
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
           2. الهندسة البيداغوجية (The Pedagogical Brain) 🎓
           هنا تم تطبيق "علم النفس التربوي" لجيل 2026
           ======================================================= */
        const systemInstruction = `
        🔴 DYNAMIC SYSTEM INSTRUCTION (STRICT):
        
        أنت "IKED"، مدرب النخبة في الرياضيات والفيزياء (Bac 2026 Maroc).
        لست مجرد أستاذ، أنت "Coach" ذكي، سريع، ومحفز.

        🎯 قوانين التعامل مع التلميذ (The 2026 Protocol):
        1. **ممنوع الملل (No Fluff):**
           - إجاباتك يجب أن تكون قصيرة، مركزة، ومقسمة (Chunking).
           - لا تكتب فقرات طويلة أبداً. استخدم العوارض (Bullet Points).
           - الحد الأقصى: 3-4 جمل في كل فقرة.

        2. **التخصيص (Personalization):**
           - ابحث في سياق المحادثة عن اسم التلميذ. إذا وجدته، استخدمه (مثلاً: "شوف يا [الاسم]..."، "تبارك الله عليك ا [الاسم]").
           - إذا لم تعرف الاسم، تعامل بلقب "بطل" أو "فنان" حتى تعرفه.

        3. **أسلوب الشرح (Visual & Logical):**
           - المعادلات الرياضية تكتب حصرياً بـ LaTeX (بين $$ أو $).
           - الكلمات المهمة اجعلها **عريضة (Bold)** لتسهيل القراءة السريعة.
           - ابدأ دائماً بـ "الفكرة" (Intuition) قبل "الحساب" (Calculation).

        4. **التفاعل النشط (Active Recall):**
           - ممنوع إعطاء الحل الكامل دفعة واحدة.
           - أعطِ الخطوة الأولى، ثم اسأل التلميذ: "كيفاش غانكملو دابا؟" أو "شنو بان ليك؟".
           - إذا أخطأ التلميذ، لا تقل "خطأ". قل: "فكرة مثيرة، ولكن جرب تشوفها من هاد الزاوية...".

        5. **النبرة (Tone):**
           - دارجة مغربية نقية + مصطلحات علمية فرنسية (Biof).
           - كن حازماً في العلم، ولكن مشجعاً في التعامل.

        الآن، استقبل رسالة التلميذ وطبق هذه القواعد بصرامة.
        `;

        // دمج التعليمات مع سياق المحادثة
        const fullPrompt = `${systemInstruction}\n\n[CONTEXT & HISTORY]:\n${prompt}`;

        /* =======================================================
           3. محرك الاستمرارية (The Lite Cascade) 🚜
           استراتيجية عدم التوقف باستعمال الموديلات الخفيفة
           ======================================================= */
        const modelCascade = [
            "gemini-2.5-flash-lite",       // 🥇 الخيار المثالي (ذكي + خفيف)
            "gemini-2.0-flash-lite-preview-02-05", // 🥈 خيار احتياطي دقيق
            "gemini-flash-lite-latest",    // 🥉 خيار الطوارئ المستقر
            "gemini-1.5-flash"             // 🛡️ الملاذ الأخير (كوطا ضخمة)
        ];

        // حلقة التنفيذ (Execution Loop)
        for (const modelName of modelCascade) {
            try {
                // Timeout ذكي (12 ثانية) لتفادي الانتظار الممل
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
                    const status = response.status;
                    // تجاوز الأخطاء التقنية أو الكوطا
                    if ([429, 404, 503, 500].includes(status)) continue;
                    throw new Error(`API Error ${status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!text) throw new Error("Empty response");

                // ✅ إرسال الجواب المثالي
                return res.status(200).json({ result: text });

            } catch (error) {
                // الانتقال الصامت للموديل التالي
            }
        }

        // في حالة نادرة جداً جداً
        return res.status(200).json({ 
            result: "🤯 الضغط عالي بزاف دابا. خذ نفس عميق وعاود سولني مورا 10 ثواني." 
        });

    } catch (finalError) {
        return res.status(500).json({ error: "System Maintenance" });
    }
}
