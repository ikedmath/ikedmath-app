/* =======================================================
   IKED ENGINE v2026: THE REAL LIST EDITION 💎
   Architect: The World's Best Programmer
   Target: 2 Bac Sciences Maths (Morocco)
   Models (From User List): 
    1. gemini-2.5-flash (Smartest Flash)
    2. gemini-2.0-flash (Stable)
    3. gemini-2.0-flash-lite (Unstoppable/High Limits)
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
           2. THE 2026 MODEL CASCADE (الشلال المصحح) 🌊
           كنستعملو غير الموديلات اللي كاينين فالليستة ديالك
           ======================================================= */
        const modelsToTry = [
            "gemini-2.5-flash",       // الأولوية 1: الذكاء الجديد (من قائمتك)
            "gemini-2.0-flash",       // الأولوية 2: الاستقرار
            "gemini-2.0-flash-lite"   // الأولوية 3: السرعة والكوتا العالية (المنقذ)
        ];

        /* =======================================================
           3. SYSTEM PROMPT (رفع مستوى الذكاء للموديلات الخفيفة) 🧠
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, Elite Math Tutor (2 Bac Sciences Maths - Morocco).
        
        ⚡ RESPONSE PROTOCOL:
        1.  Response format: JSON_METADATA + "|||STREAM_DIVIDER|||" + EXPLANATION.
        2.  Strictly NO markdown code blocks (\`\`\`) wrapping the JSON.
        
        --- PART 1: METADATA (JSON Only) ---
        {
            "visuals": { "type": "SVG", "code": "Generate valid SVG code for geometry/curves IF needed. Else null." },
            "gamification": { "xp": 25, "badge": "Badge Name OR null" },
            "analogy": "Short Darija analogy."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: EXPLANATION (Text) ---
        - Start teaching directly.
        - Adopt a "Sciences Maths" rigor.
        - Use LaTeX for ALL math: $$ f(x) = ... $$.
        - Explanation must be step-by-step logic, not just results.
        `;

        const studentLevel = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${studentLevel}]\n[Question]: ${prompt}`;

        /* =======================================================
           4. EXECUTION LOOP 🔄
           ======================================================= */
        let stream = null;
        let activeModel = "";

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Trying model: ${modelName}...`); 
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContentStream(fullPrompt);
                
                // إذا داز الستريم مزيان، كنحبسو التجريب
                stream = result.stream;
                activeModel = modelName;
                break; 
            } catch (error) {
                // console.warn(`Model ${modelName} failed/busy. Switching...`);
                continue; // جرب الموديل اللي تابعو
            }
        }

        if (!stream) {
            // إلا فشلو كاملين (حالة نادرة جدا مع Lite)
            throw new Error("All models are busy. Please check Quota.");
        }

        // إرسال البيانات
        for await (const chunk of stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ عذرًا، كاين ضغط على Google API حالياً. عاود سولني دابا.`);
        res.end();
    }
}
