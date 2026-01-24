/* =======================================================
   IKED ENGINE vFINAL: THE PERSISTENT LITE 🔄
   Architect: The World's Best Programmer
   Strategy: 
    1. Use GENERIC names (avoid 404).
    2. Use LITE version (avoid Quota).
    3. Auto-Retry on Quota (Don't give up immediately).
   ======================================================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
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
           2. THE MODEL LIST (Generic & Clean) 📋
           استخدمنا الأسماء العامة الموجودة في قائمتك (بدون تواريخ) لضمان وجودها.
           ======================================================= */
        const modelsToTry = [
            "gemini-2.0-flash-lite", // المحاولة 1: الأخف والأضمن
            "gemini-2.0-flash",      // المحاولة 2: الرسمي
            "gemini-2.5-flash"       // المحاولة 3: الجديد
        ];

        /* =======================================================
           3. SYSTEM PROMPT 📐
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, Expert Math Tutor (2 Bac Sciences Maths - Morocco).
        
        ⚡ PROTOCOL:
        1. Response format: JSON_METADATA + "|||STREAM_DIVIDER|||" + EXPLANATION.
        2. DO NOT use markdown code blocks (\`\`\`) for the JSON part.
        
        --- PART 1: METADATA (JSON) ---
        {
            "visuals": { "type": "SVG", "code": "Generate SVG code for geometry/functions IF needed. Else null." },
            "gamification": { "xp": 20, "badge": "Badge Name OR null" },
            "analogy": "Short Darija analogy."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: EXPLANATION ---
        - Start directly.
        - Use LaTeX for ALL math: $$ f(x) = ... $$.
        - Explain reasoning clearly (SM style).
        `;

        const studentLevel = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${studentLevel}]\n[Question]: ${prompt}`;

        /* =======================================================
           4. EXECUTION LOOP (With Retry Logic) 🔄
           ======================================================= */
        let stream = null;
        let lastError = "";

        // نجرب كل موديل
        for (const modelName of modelsToTry) {
            // لكل موديل، نحاول 2 مرات (Retry) في حالة Quota
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    // console.log(`Trying ${modelName} (Attempt ${attempt})...`);
                    
                    // Force v1beta to access 2.0/2.5 models
                    const model = genAI.getGenerativeModel({ 
                        model: modelName
                    }, { 
                        apiVersion: 'v1beta' 
                    });

                    const result = await model.generateContentStream(fullPrompt);
                    stream = result.stream;
                    break; // نجحنا! نخرج من حلقة Retry
                } catch (error) {
                    lastError = error.message;
                    
                    // إذا كان الخطأ 404 (Not Found)، لا فائدة من الإعادة، ننتقل للموديل التالي
                    if (error.message.includes("404") || error.message.includes("not found")) {
                        break; 
                    }
                    
                    // إذا كان الخطأ 429 (Quota)، ننتظر قليلاً ثم نعيد المحاولة
                    if (error.message.includes("429") || error.message.includes("Quota")) {
                        await new Promise(r => setTimeout(r, 1500)); // انتظار 1.5 ثانية
                        continue;
                    }
                    
                    // أخطاء أخرى، نمر للموديل التالي
                    break;
                }
            }
            if (stream) break; // نجحنا! نخرج من حلقة الموديلات
        }

        if (!stream) {
            let errorMsg = "Server Busy";
            if (lastError.includes("404")) errorMsg = "Models Not Found (Check v1beta access)";
            if (lastError.includes("429")) errorMsg = "Server Busy (High Traffic)";
            throw new Error(errorMsg);
        }

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
