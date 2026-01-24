/* =======================================================
   IKED ENGINE vFINAL 2026: EXACT VERSIONS EDITION 🎯
   Architect: The World's Best Programmer
   Strategy: Use EXACT "Lite" & "Preview" versions from User List.
   Why? To bypass "Quota" limits on generic aliases.
   ======================================================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // 1. Streaming Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt, userProfile } = req.body;
        if (!prompt) { res.write(JSON.stringify({ error: "No prompt" })); res.end(); return; }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) { res.write(JSON.stringify({ error: "API Key missing" })); res.end(); return; }

        const genAI = new GoogleGenerativeAI(apiKey);

        /* =======================================================
           2. THE EXACT MODEL LIST (من قائمتك حرفياً) 📋
           كنسبقو "Lite" حيت هو اللي فيه الكوتا طالعة ومستحيل يتبلوكا
           ======================================================= */
        const modelsToTry = [
            "gemini-2.0-flash-lite-preview-02-05",  // 1. الموديل الخفيف المحدد بالتاريخ (الأضمن)
            "gemini-2.5-flash-lite-preview-09-2025", // 2. موديل خفيف جديد (احتياط)
            "gemini-2.0-flash-exp",                 // 3. موديل تجريبي قوي (للحالات الصعبة)
            "gemini-flash-lite-latest"              // 4. آخر محاولة
        ];

        /* =======================================================
           3. SYSTEM PROMPT (موجه العلوم الرياضية) 📐
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, Expert Math Tutor (2 Bac Sciences Maths - Morocco).
        
        ⚡ PROTOCOL:
        1. Response format: JSON_METADATA + "|||STREAM_DIVIDER|||" + EXPLANATION.
        2. STRICTLY NO markdown code blocks (\`\`\`) wrapping the JSON.
        
        --- PART 1: METADATA (JSON Only) ---
        {
            "visuals": { "type": "SVG", "code": "Generate valid SVG code for geometry/curves IF needed. Else null." },
            "gamification": { "xp": 25, "badge": "Badge Name OR null" },
            "analogy": "Short Darija analogy."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: EXPLANATION ---
        - Start teaching directly.
        - Adopt a "Sciences Maths" rigor.
        - Use LaTeX for ALL math: $$ f(x) = ... $$.
        - Language: Mix of Darija (intuition) and French (terms).
        `;

        const studentLevel = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${studentLevel}]\n[Question]: ${prompt}`;

        /* =======================================================
           4. EXECUTION LOOP (الذكاء في التبديل) 🔄
           ======================================================= */
        let stream = null;
        let activeModel = "";
        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Trying: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContentStream(fullPrompt);
                
                stream = result.stream;
                activeModel = modelName;
                break; // نجح الاتصال!
            } catch (error) {
                // console.warn(`Failed: ${modelName}`, error.message);
                lastError = error.message;
                continue; // جرب التالي فوراً
            }
        }

        if (!stream) {
            // تحليل الخطأ الأخير لمعرفة السبب
            const errorDetails = lastError.includes("429") ? "Quota Exceeded" : lastError;
            throw new Error(`All models failed. Last error: ${errorDetails}`);
        }

        // إرسال البيانات
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Critical Failure:", error);
        // رسالة تظهر للمستخدم فالمربع
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: السيرفرات مشغولة (Quota). عافاك تسنا دقيقة وعاود.`);
        res.end();
    }
}
