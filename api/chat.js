/* =======================================================
   IKED BRAIN v10.0 (The Immortal Engine) ♾️
   Architected for: Max Quality + Zero Downtime
   Powered by: Gemini 2.5 Flash -> 2.0 Lite -> Latest
   ======================================================= */

export default async function handler(req, res) {
    // 1. إعدادات الحماية والاتصال (CORS Security)
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

        // 💎 لائحة النخبة (The Elite Cascade)
        // تم اختيار هذه الموديلات بدقة من القائمة التي قدمتها لضمان عدم التوقف
        const modelCascade = [
            "gemini-2.5-flash",        // 🥇 الجودة العالية والسرعة (الأولوية القصوى)
            "gemini-2.0-flash-lite",   // 🥈 السلاح السري: موديل خفيف جداً لا يتوقف بسهولة (Anti-Quota)
            "gemini-flash-latest"      // 🥉 شبكة الأمان الأخيرة (Always Online)
        ];

        // 🧠 شخصية الأستاذ IKED (البيداغوجيا المغربية)
        const systemInstruction = `
        🔴 تعليمات النظام الصارمة (System Persona):
        أنت "IKED"، أستاذ رياضيات وفيزياء مغربي متميز للثانية باكالوريا.
        
        1. **الأسلوب:** تكلم بالدارجة المغربية الممزوجة بمصطلحات علمية فرنسية (Biof).
        2. **المنهجية:** لا تعطِ الحل جاهزاً أبداً. استخدم "الأسئلة الموجهة" (Scaffolding) لتقود التلميذ للحل بنفسه.
        3. **الدعم النفسي:** كن صبوراً، مشجعاً، واستعمل أمثلة من الواقع المغربي.
        4. **التنسيق:** اكتب المعادلات الرياضية بوضوح.
        `;

        const fullPrompt = `${systemInstruction}\n\n👤 التلميذ: ${prompt}\n🎓 الأستاذ IKED:`;

        let lastError = null;

        // 🔄 حلقة الدوران الذكية (Smart Execution Loop)
        for (const modelName of modelCascade) {
            try {
                // نضع مؤقتاً (Timeout) لكل محاولة: 12 ثانية كحد أقصى
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);

                console.log(`🚀 Trying Engine: ${modelName}...`);
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId); // إلغاء المؤقت عند الاستجابة

                if (!response.ok) {
                    const status = response.status;
                    
                    // 🛑 تحليل الأخطاء لاتخاذ القرار
                    if (status === 429) { 
                        console.warn(`⚠️ ${modelName} Quota Limit Reached. Switching to Lite tier...`);
                        continue; // تجاوز فوراً للموديل التالي (Lite)
                    }
                    if (status === 404 || status === 503) {
                        console.warn(`⚠️ ${modelName} Unavailable. Next...`);
                        continue;
                    }
                    
                    // أخطاء أخرى
                    const errText = await response.text();
                    throw new Error(`Model Error (${status}): ${errText}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!text) throw new Error("Empty response received");

                // ✅ نجاح! (Success)
                console.log(`✅ Served by: ${modelName}`);
                return res.status(200).json({ result: text });

            } catch (error) {
                console.error(`❌ Failure on ${modelName}:`, error.message);
                lastError = error.message;
                // نتابع الدوران للموديل التالي في القائمة
            }
        }

        // 🆘 في حالة فشل جميع الخطط (نادر جداً مع وجود Lite)
        // نرسل رسالة لطيفة للتلميذ بدل رسالة خطأ تقنية
        return res.status(200).json({ 
            result: "سمح ليا يا بطل، الشبكة عليها ضغط خيالي دابا! 🤯\n\nعافاك حسب حتى لـ 10 وعاود سولني، أنا معاك." 
        });

    } catch (finalError) {
        return res.status(500).json({ error: "System Overload" });
    }
}
