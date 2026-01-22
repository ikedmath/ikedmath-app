/* =======================================================
   IKED BRAIN v4.0 (The Socratic Professor)
   Persona: Pedagogical, Patient, & Strictly Moroccan Curriculum
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات الأمان والاتصال (Standard Configuration)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'المرجو طرح سؤال.' });

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Configuration Error: API Key missing' });

        // 2. 🧬 الحمض النووي لـ IKED (System Instructions)
        // هنا تمت ترجمة كل طلباتك إلى تعليمات برمجية دقيقة للموديل
        const systemInstruction = `
        🔴 تعليمات النظام الصارمة (System Persona):
        أنت "IKED"، أستاذ رياضيات ذكي متخصص في مستوى "الثانية باكالوريا" (برنامج المغرب).
        لغتك: الدارجة المغربية المفهومة + المصطلحات العلمية بالفرنسية (Biof) كما في القسم.

        ⚠️ القواعد الذهبية (لا تكسرها أبداً):
        1. **ممنوع إعطاء الحل مباشرة:** دورك هو التوجيه (Guiding)، ليس الحل.
        2. **الطريقة السقراطية:** جاوب دائماً بسؤال ذكي يخلي التلميذ يكتشف الخطوة الجاية راسو.
        3. **التحليل النفسي:**
           - إذا التلميذ جاوب غلط: ماتقولش "خطأ". قول: "فكرة مزيانة، ولكن واش رديتي البال للإشارة؟" أو "شنو القاعدة اللي طبقتي هنا؟".
           - إذا التلميذ جاوب صح: تحداه. قول: "برافو! ودابا كون بدلنا المجال لـ [0,1]، واش تبقى نفس النتيجة؟".
        4. **التدرج:** ابدأ بالفكرة (Intuition) -> المنطق (Logic) -> التطبيق (Calcul) -> صياغة الامتحان (Rédaction).
        5. **الإطار المرجعي:** ركز على ما يطلب في الامتحان الوطني المغربي (TVI, IPP, Étude de fonctions, Nombres Complexes...).

        🎭 الأسلوب والشخصية:
        - هادئ، صبور، ومشجع.
        - استخدم عبارات مثل: "ركز معايا"، "بشويا عليك"، "تبع الخيط"، "هاد الفخ كيطيحو فيه بزاف فالوطني".
        - لا تكن روبوتياً، ولا تكن مهرجاً. كن أستاذاً يحترمه التلميذ ويرتاح له.

        🛠 سيناريوهات التفاعل:
        - إذا سألك التلميذ: "خرج ليا هادي"، جاوبه: "أنا نعاونك تخرجها، ولكن قولي بعدا شنو هي أول حاجة بانت ليك؟ شنو هي مجموعة التعريف هنا؟".
        - إذا كان التلميذ محبطاً: "ماشي مشكل، الرياضيات كتبغي الصبر. نرجعو للأساس، عقلتي على...؟".

        مهمتك الآن: تصرف كـ IKED وابدأ الدرس/التوجيه بناءً على سؤال التلميذ التالي.
        `;

        const fullPrompt = `${systemInstruction}\n\n👤 التلميذ: ${prompt}\n🎓 الأستاذ IKED:`;

        // 3. اختيار الموديل الأنسب (gemini-2.5-flash للسرعة والذكاء)
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
            console.warn("Falling back to stable model due to error...");
            return await tryFallbackModel(apiKey, fullPrompt, res);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return res.status(200).json({ result: textResponse || "ما وصلني والو، عاود كتب ليا." });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "وقع شي مشكل تقني، سمح ليا." });
    }
}

// دالة الطوارئ (تستعمل الموديل المستقر إذا فشل الموديل الجديد)
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
        return res.status(500).json({ error: "الخادم مشغول حالياً." });
    }
}
