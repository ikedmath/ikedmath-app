/* =======================================================
   IKED BRAIN v8.0 (The Ultimate Waterfall) 🌊
   Strategy: Try ALL available models until one works.
   Zero Error Tolerance.
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

        // 📝 لائحة "النخبة" (Elite List) مرتبة بالأولوية
        // الكود غايجربهم واحد بواحد. اخترت ليك الأفضل من الليستة ديالك
        const modelCascade = [
            "gemini-2.5-flash",          // 1. الأسرع والأذكى (هدفنا الأول)
            "gemini-2.5-pro",            // 2. الذكاء الخارق (إلا 1 فشل)
            "gemini-3-flash-preview",    // 3. تكنولوجيا المستقبل (تجربة)
            "gemini-2.0-flash-001",      // 4. الاستقرار التام (Stable)
            "deep-research-pro-preview-12-2025", // 5. البحث العميق (للحالات الصعبة)
            "gemini-flash-latest",       // 6. الجوكر (ديما خدام - Fallback)
            "gemini-pro"                 // 7. الملاذ الأخير (Old but Gold)
        ];

        // شخصية الأستاذ IKED
        const systemInstruction = `
        🔴 تعليمات النظام (System Persona):
        أنت "IKED"، أستاذ رياضيات وفيزياء مغربي للثانية باكالوريا.
        - اشرح بالدارجة المغربية والمصطلحات العلمية الفرنسية.
        - طبق المنهجية البيداغوجية النشطة: لا تعطِ الحل، بل وجه التلميذ.
        - تعامل بذكاء وصبر، وشجع التلميذ دائماً.
        `;

        const fullPrompt = `${systemInstruction}\n\n👤 التلميذ: ${prompt}\n🎓 الأستاذ IKED:`;

        let lastError = null;
        let successModel = null;

        // 🔄 حلقة الدوران "المستميتة" (The Relentless Loop)
        for (const modelName of modelCascade) {
            try {
                // ملاحظة: كنستعملو AbortController باش إلا تعطل الموديل بزاف (أكثر من 8 ثواني) نقطعو عليه وندوزو للي موراه
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 ثواني حد أقصى لكل موديل

                console.log(`📡 Trying: ${modelName}...`);
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId); // حبس المؤقت إلا جاوب

                if (!response.ok) {
                    const status = response.status;
                    // الأخطاء اللي كتخلينا ندوزو للموديل التالي: 429 (Quota), 404 (Not Found), 503 (Overloaded)
                    if ([429, 404, 503, 500].includes(status)) {
                        console.warn(`⚠️ ${modelName} failed (${status}). Next!`);
                        continue; 
                    }
                    throw new Error(`API Error ${status}`);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!text) throw new Error("Empty response");

                // 🎉 صافي لقينا واحد خدام!
                successModel = modelName;
                console.log(`✅ Success with: ${successModel}`);
                return res.status(200).json({ result: text });

            } catch (error) {
                console.error(`❌ ${modelName} Error:`, error.message);
                lastError = error.message;
                // ما كنحبسوش، كنكملو للموديل التالي
            }
        }

        // 🛑 إلا وصلنا هنا، يعني "القضية حامضة" وكولشي فشل
        throw new Error(`All models failed. Last error: ${lastError}`);

    } catch (finalError) {
        return res.status(500).json({ 
            error: "IKED كيدير صيانة خفيفة دابا. عاود سولني من دابا دقيقة." 
        });
    }
}
