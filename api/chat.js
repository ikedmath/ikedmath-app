/* =======================================================
   IKED ENGINE v2026: THE REALITY CHECK ✅
   Architect: The World's Best Programmer
   Status: 1.5 is DEAD. Long live 2.0 & 2.5!
   Models (Strictly from User List):
    1. gemini-2.0-flash (The Standard)
    2. gemini-2.0-flash-lite (The Speedster)
    3. gemini-2.5-flash (The New Brain)
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
           2. THE VALID MODEL LIST (من قائمتك فقط - بدون 1.5) 📋
           استخدمنا الأسماء القصيرة الموجودة في القائمة لتفادي 404
           ======================================================= */
        const modelsToTry = [
            "gemini-2.0-flash",       // الخيار 1: الموديل الرسمي والمستقر
            "gemini-2.0-flash-lite",  // الخيار 2: الموديل الخفيف (Quota Friendly)
            "gemini-2.5-flash"        // الخيار 3: الموديل الجديد
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
           4. EXECUTION LOOP (التبديل الذكي) 🔄
           ======================================================= */
        let stream = null;
        let activeModel = "";
        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Attempting: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContentStream(fullPrompt);
                
                stream = result.stream;
                activeModel = modelName;
                break; // نجحنا!
            } catch (error) {
                // console.warn(`Failed: ${modelName}`);
                lastError = error.message;
                continue; // دوز للي موراه
            }
        }

        if (!stream) {
            // رسالة خطأ واضحة في حالة فشل الجميع
            const errorMsg = lastError.includes("404") ? "Models not found (Check API names)" : "Server Busy";
            throw new Error(`All models failed. Last Error: ${errorMsg}`);
        }

        // إرسال البيانات
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Critical Failure:", error);
        // رسالة الطوارئ
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: كاين مشكل فالاتصال (${error.message}). عاود المحاولة.`);
        res.end();
    }
}
