/* =======================================================
   IKED ENGINE: THE ULTIMATE MATH COACH ♾️📐
   Architecture: High IQ (2.5) -> High Quota (2.5 Lite)
   Goal: 24/7 Availability + Deep Math Reasoning.
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات الحماية والاتصال (Standard Headers)
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

        /* =======================================================
           2. الدماغ البيداغوجي (Pedagogical Brain) 🧠
           تصميم شخصية الأستاذ المثالي للثانية باك علوم رياضية
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY PROTOCOL:
        أنت "IKED"، المدرب الشخصي للنخبة (Coach) في الرياضيات (2 Bac SM / Sciences Maths).
        هدفك: جعل التلميذ يفهم "ما وراء المعادلات" (The Intuition).

        🧠 منهجية التفكير (Deep Reasoning):
        - قبل الإجابة، قم بتحليل "الفخ" (Piège) و "المفتاح" (Clé) في السؤال.
        - اشرح المنطق الرياضي: "لماذا نطبق هذه الخاصية هنا؟" وليس فقط "كيف نطبقها".
        - اربط المفاهيم ببعضها (مثلاً: الاتصال بالنهايات، الاشتقاق بالتغيرات).

        📝 أسلوب التعامل (Strict Style Guide):
        1. **ممنوع الملل:** لا تستخدم مقدمات طويلة (مثل "أهلاً يا بطل..."). ادخل في صلب الرياضيات فوراً.
        2. **التحدي:** ارفع المستوى. تعامل مع التلميذ بذكاء واحترام لعقله.
        3. **الوضوح البصري:**
           - المعادلات حصرياً بـ LaTeX (بين $$ أو $).
           - المصطلحات المهمة بـ **Gras**.
           - استخدم العوارض (Points) لتقسيم الأفكار.
        4. **اللغة:** دارجة مغربية سليمة + مصطلحات فرنسية علمية (Biof).

        ⛔ تحذير:
        - تخصصك رياضيات فقط. إذا سئلت عن الفيزياء، ارفض بأدب وعد للموضوع.
        - لا تعطِ الحل جاهزاً، بل قدّم "رأس الخيط" واترك التلميذ يكمل.
        `;

        const fullPrompt = `${systemInstruction}\n\n[USER INPUT]:\n${prompt}`;

        /* =======================================================
           3. مصفوفة الذكاء والاستمرارية (The Matrix) 💎
           ترتيب دقيق للموديلات من القائمة لضمان الجودة وعدم التوقف
           ======================================================= */
        const modelCascade = [
            "gemini-2.5-flash",             // 🥇 الأذكى والأسرع (Smartest)
            "gemini-2.5-flash-lite",        // 🥈 التوازن المثالي: ذكاء 2.5 مع كوطا Lite (Workhorse)
            "gemini-flash-lite-latest",     // 🥉 شبكة الأمان (Fallback)
            "gemini-1.5-flash"              // 🛡️ الملاذ الأخير (Legacy Stable)
        ];

        // 🔄 حلقة التنفيذ الذكية (Smart Execution Loop)
        for (const modelName of modelCascade) {
            try {
                // نعطي الموديل وقتاً كافياً للتفكير (18 ثانية)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 18000);

                // console.log(`🧠 Thinking with: ${modelName}...`);

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const status = response.status;
                    // إذا كان الخطأ 429 (الكوطا)، ننتقل فوراً للموديل التالي (Lite)
                    if ([429, 404, 503, 500].includes(status)) {
                        continue; 
                    }
                    throw new Error(`Google Error ${status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!text) throw new Error("Empty response");

                // ✅ تم الحصول على الجواب بنجاح
                return res.status(200).json({ result: text });

            } catch (error) {
                // فشل هذا الموديل، ننتقل للتالي بصمت
            }
        }

        // 🆘 في الحالة المستحيلة أن يفشل الجميع
        return res.status(200).json({ 
            result: "🤯 الضغط خيالي على الشبكة دابا. عافاك خذ استراحة 10 ثواني وعاود سولني، أنا كنتسناك." 
        });

    } catch (finalError) {
        console.error("Critical Error:", finalError);
        return res.status(500).json({ error: "Technical Issue" });
    }
}
