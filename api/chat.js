/* =======================================================
   IKED ENGINE vFINAL: THE BETA PROTOCOL 🧪🚀
   Architect: The World's Best Programmer
   Strategy: Force API version 'v1beta' to access Future Models.
   Models (Strictly from 2026 List):
    1. gemini-2.0-flash-exp (The Reliable Beast)
    2. gemini-2.0-flash-lite-preview-02-05 (The Speedster)
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
           2. THE MODEL LIST (BETA ACCESS) 🔓
           هذه الموديلات موجودة حصرياً في v1beta.
           ======================================================= */
        const modelsToTry = [
            "gemini-2.0-flash-exp",                 // الخيار 1: أقوى موديل تجريبي حالياً (مستقر)
            "gemini-2.0-flash-lite-preview-02-05", // الخيار 2: أخف موديل من قائمتك
            "gemini-2.5-flash"                      // الخيار 3: الذكاء الجديد
        ];

        /* =======================================================
           3. SYSTEM PROMPT (موجه العلوم الرياضية الصارم) 📐
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
           4. EXECUTION LOOP (مع إجبار V1BETA) 🔄
           ======================================================= */
        let stream = null;
        let activeModel = "";
        let lastError = "";

        for (const modelName of modelsToTry) {
            try {
                // HACK: هنا كنحاول نفرض الإعدادات باش يقلب ف v1beta
                // ملاحظة: أغلب النسخ الجديدة كتمشي ل v1beta بوحدها إلا لقات 'exp' أو 'preview' فالسمية
                const model = genAI.getGenerativeModel({ 
                    model: modelName
                }, { 
                    apiVersion: 'v1beta' // 🔥 المفتاح السحري
                });

                const result = await model.generateContentStream(fullPrompt);
                
                stream = result.stream;
                activeModel = modelName;
                // console.log(`Connected to: ${modelName}`);
                break; 
            } catch (error) {
                // console.warn(`Failed: ${modelName}`, error.message);
                lastError = error.message;
                continue; 
            }
        }

        if (!stream) {
            // تحليل الخطأ الأخير
            let errorMsg = lastError;
            if (lastError.includes("404")) errorMsg = "Models not found in v1beta (Check Name)";
            if (lastError.includes("429")) errorMsg = "Quota Exceeded (Server Busy)";
            
            throw new Error(`All models failed. Reason: ${errorMsg}`);
        }

        // إرسال البيانات
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Critical Failure:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: خطأ فالاتصال (${error.message}).`);
        res.end();
    }
}
