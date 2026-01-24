/* =======================================================
   IKED ENGINE vFINAL: THE LITE SAVIOR 🛡️
   Architect: The World's Best Programmer
   Problem: Quota Exceeded on Experimental Models.
   Solution: Prioritize "Lite" versions from User List.
   API Version: v1beta (Strictly)
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
           2. THE LITE-FIRST STRATEGY (أسبقية الخفيف) 📋
           كنسبقو Lite حيت هو الوحيد اللي عندو Quota طالعة ومستحيل يتبلوكا
           ======================================================= */
        const modelsToTry = [
            "gemini-2.0-flash-lite-preview-02-05", // المحاولة 1: هذا محدد جداً وخفيف
            "gemini-2.0-flash-lite",                // المحاولة 2: الاسم العام للخفيف
            "gemini-2.0-flash-exp",                 // المحاولة 3: القوي (احتياط)
            "gemini-2.5-flash-lite-preview-09-2025" // المحاولة 4: خيار مستقبلي
        ];

        /* =======================================================
           3. SYSTEM PROMPT 📐
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
           4. EXECUTION LOOP (Force v1beta) 🔄
           ======================================================= */
        let stream = null;
        let activeModel = "";
        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Trying Lite Model: ${modelName}`);
                
                // 🔥 ضروري: v1beta باش يلقى موديلات Preview
                const model = genAI.getGenerativeModel({ 
                    model: modelName
                }, { 
                    apiVersion: 'v1beta' 
                });

                const result = await model.generateContentStream(fullPrompt);
                
                stream = result.stream;
                activeModel = modelName;
                break; 
            } catch (error) {
                // console.warn(`Model ${modelName} Quota/Error: ${error.message}`);
                lastError = error.message;
                // كنتسناو 1 ثانية قبل ما ندوزو للموديل التالي باش نعطيو فرصة للسيرفر
                await new Promise(r => setTimeout(r, 1000));
                continue; 
            }
        }

        if (!stream) {
            // رسالة واضحة
            let finalMsg = lastError;
            if (lastError.includes("429")) finalMsg = "الضغط بزاف على السيرفر (Quota). تسنا شوية.";
            throw new Error(finalMsg);
        }

        // إرسال البيانات
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Critical Failure:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: ${error.message}`);
        res.end();
    }
}
