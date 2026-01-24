/* =======================================================
   IKED ENGINE vFINAL: THE V1BETA ENFORCER 🚧
   Architect: The World's Best Programmer
   Goal: Force access to 'v1beta' to find 2026 models.
   Model: gemini-2.0-flash-lite-preview-02-05 (Quota Safe)
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
           2. THE MODEL LIST (V1BETA EXCLUSIVES) 🧪
           هاد الموديلات ما كيخدمو غير ف v1beta.
           اختارينا "Lite" هو اللول باش نتفاداو Quota Exceeded.
           ======================================================= */
        const modelsToTry = [
            "gemini-2.0-flash-lite-preview-02-05", // المحاولة 1: الخيار الأذكى والأخف (من قائمتك)
            "gemini-2.0-flash-exp",                 // المحاولة 2: الاحتياطي القوي
        ];

        /* =======================================================
           3. SYSTEM PROMPT (SM Level) 📐
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, Expert Math Tutor (2 Bac Sciences Maths - Morocco).
        
        ⚡ PROTOCOL:
        1. Response format: JSON_METADATA + "|||STREAM_DIVIDER|||" + EXPLANATION.
        2. DO NOT use markdown code blocks (\`\`\`) for the JSON part. Raw JSON only.
        
        --- PART 1: METADATA (JSON) ---
        {
            "visuals": { "type": "SVG", "code": "Generate SVG code for geometry/functions IF needed. Else null." },
            "gamification": { "xp": 20, "badge": "Badge Name OR null" },
            "analogy": "Short Darija analogy."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: EXPLANATION ---
        - Start directly (e.g. "مرحباً...").
        - Use LaTeX for ALL math: $$ f(x) = ... $$.
        - Explain reasoning clearly (Sciences Maths style).
        `;

        const studentLevel = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${studentLevel}]\n[Question]: ${prompt}`;

        /* =======================================================
           4. EXECUTION LOOP (With Forced v1beta) 🔄
           ======================================================= */
        let stream = null;
        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                // 🔥 THE FIX: Enforcing v1beta explicitly
                // هاد السطر هو اللي غايحل مشكل 404
                const model = genAI.getGenerativeModel({ 
                    model: modelName
                }, { 
                    apiVersion: 'v1beta' 
                });

                const result = await model.generateContentStream(fullPrompt);
                stream = result.stream;
                break; // الاتصال نجح
            } catch (error) {
                lastError = error.message;
                // كنتسناو شوية قبل المحاولة التالية
                await new Promise(r => setTimeout(r, 500)); 
                continue; 
            }
        }

        if (!stream) {
            // تفسير الخطأ للمستخدم
            let errorMsg = "Server Busy";
            if (lastError.includes("404")) errorMsg = "Model Not Found in v1beta";
            if (lastError.includes("429")) errorMsg = "Quota Limit (Try again in 1 min)";
            throw new Error(errorMsg);
        }

        // إرسال البيانات
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Final Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: ${error.message}`);
        res.end();
    }
}
