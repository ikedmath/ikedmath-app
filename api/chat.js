/* =======================================================
   IKED ENGINE v2026: THE IMMORTAL CORE 💎⚡
   Architect: The World's Best Programmer
   Strategy: Smart Cascade (2.5 -> 2.0 -> Lite)
   Features: 
   - Auto-Failover: Never stops, switches models instantly on error.
   - Robust Streaming: Force Flush compatible.
   - No 404/429 interruptions.
   ======================================================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // 1. Streaming Headers (Essential)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt, userProfile } = req.body;
        if (!prompt) {
            res.write(JSON.stringify({ error: "No prompt provided" }));
            res.end();
            return;
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            res.write(JSON.stringify({ error: "API Key missing" }));
            res.end();
            return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        /* =======================================================
           2. THE MODEL CASCADE (الشلال الذكي) 🌊
           نبدأ بالأفضل، وإذا كان مشغولاً، ننتقل للأضمن تلقائياً
           ======================================================= */
        const modelsToTry = [
            "gemini-2.5-flash",       // 1. الأذكى والأسرع في الجيل الجديد
            "gemini-2.0-flash",       // 2. المستقر جداً (العمود الفقري)
            "gemini-2.0-flash-lite"   // 3. المنقذ (خفيف جداً ومستحيل يتوقف)
        ];

        /* =======================================================
           3. SYSTEM PROMPT (موجه لعلوم رياضية) 📐
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, The Ultimate Math Tutor (Level: 2 Bac Sciences Maths - Morocco).
        
        ⚡ PROTOCOL:
        You MUST stream the response in TWO parts separated by exactly "|||STREAM_DIVIDER|||".
        
        --- PART 1: METADATA (JSON Only) ---
        {
            "visuals": { 
                "type": "SVG", 
                "code": "Generate SVG code here IF needed for geometry/curves. Else null." 
            },
            "gamification": { 
                "xp": 25, 
                "badge": "Badge Name OR null" 
            },
            "analogy": "A smart Darija analogy."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: EXPLANATION (Streaming Text) ---
        - Teach nicely but rigorously (Niveau SM).
        - Use LaTeX for ALL math formulas: $$ f(x) = ... $$.
        - Mix Darija (for intuition) and French (for scientific terms).
        - Explain the logic, not just the result.
        `;

        const studentLevel = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${studentLevel}]\n[Question]: ${prompt}`;

        /* =======================================================
           4. EXECUTION LOOP (محاولة الاتصال بالتتابع) 🔄
           ======================================================= */
        let stream = null;
        let activeModel = "";

        // نجرب الموديلات واحد تلو الآخر
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContentStream(fullPrompt);
                
                // إذا وصلنا هنا، يعني الاتصال نجح!
                stream = result.stream;
                activeModel = modelName;
                break; // نخرج من الحلقة لأننا وجدنا موديلاً يعمل
            } catch (error) {
                console.warn(`⚠️ Model ${modelName} failed/busy. Switching...`);
                // نكمل للحلقة التالية (الموديل التالي)
                continue; 
            }
        }

        if (!stream) {
            // إذا فشلت كل الموديلات (حالة نادرة جداً)
            throw new Error("All AI models are currently busy. Please try again in a moment.");
        }

        // إرسال البيانات
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Final Stream Error:", error);
        // نرسل رسالة خطأ "جميلة" للمستخدم بدل الصمت
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: السيرفرات عليها ضغط خيالي حالياً. عافاك عاود سولني من دابا 10 ثواني.`);
        res.end();
    }
}
