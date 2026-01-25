/* =======================================================
   IKED ENGINE v2026: THE MECHANICAL FIX 🔧
   Focus: Force-Render SVG, Auto-detect JSON End
   Models: User's Strict List
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   1. MODEL STRATEGY
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    // نستخدم 2.5 Flash لأنه الأسرع والأذكى في التقاط التعليمات
    return [
        "gemini-2.5-flash",       
        "gemini-2.0-flash",
        "gemini-flash-latest"
    ];
}

/* =======================================================
   2. RETRY LOGIC
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.6, // توازن بين الدقة والشرح
                    maxOutputTokens: 4000,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 1000));
            }
            continue; 
        }
    }
    throw new Error("IKED System Overload.");
}

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, userProfile } = req.body;
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "Input required" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { res.write(JSON.stringify({ error: "API Key Error" })); res.end(); return; }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // 🔥 SYSTEM PROMPT: FORCE JSON START & SIMPLE SVG 🔥
        const systemInstruction = `
        You are IKED, a Moroccan Math Tutor.
        
        🚨 **CRITICAL INSTRUCTION**: 
        1. You MUST start your response with a JSON block containing the 'visuals'.
        2. DO NOT write any text before the JSON.
        3. After the JSON, print exactly: "|||DIV|||"
        4. Then write your explanation in Arabic/Darija.

        🎨 **SVG INSTRUCTIONS (NO PATTERNS):**
        - Use simple <line> elements for the grid (Don't use <defs> or <pattern> - they break).
        - **ViewBox:** "-10 -10 20 20".
        - **Invert Y:** Multiply Y by -1.
        - **If no function asked:** Draw an empty grid with axes.

        👇 **STRICT OUTPUT FORMAT:**
        {
          "visuals": {
            "type": "SVG",
            "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'><g stroke='#e2e8f0' stroke-width='0.05'><line x1='-10' y1='-9' x2='10' y2='-9'/><line x1='-10' y1='-8' x2='10' y2='-8'/></g><line x1='-10' y1='0' x2='10' y2='0' stroke='black' stroke-width='0.15'/><line x1='0' y1='-10' x2='0' y2='10' stroke='black' stroke-width='0.15'/><path d='...' stroke='#2563eb' stroke-width='0.2' fill='none'/></svg>"
          },
          "gamification": {"xp": 10}
        }
        |||DIV|||
        [Explanation...]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[User]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 LOGIC: MANUAL JSON SURGERY 🔥
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||DIV|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                // 1. محاولة إيجاد الفاصل الصريح
                let splitIndex = buffer.indexOf(DIVIDER);
                
                // 2. خطة الطوارئ: إذا تعطل الفاصل، نبحث عن إغلاق JSON }
                if (splitIndex === -1 && buffer.length > 50) {
                    // نبحث عن أول سطر جديد بعد إغلاق JSON محتمل
                    const closingBrace = buffer.lastIndexOf('}');
                    if (closingBrace !== -1 && buffer.length > closingBrace + 10) {
                        // نتأكد أنه فعلاً نهاية JSON (تجربة Parse)
                        try {
                            const testJson = buffer.substring(0, closingBrace + 1);
                            JSON.parse(testJson); // إذا نجحت، فهذا هو الحد
                            splitIndex = closingBrace + 1;
                        } catch (e) {
                            // ليس نهاية JSON حقيقية، نتابع الانتظار
                        }
                    }
                }

                if (splitIndex !== -1) {
                    const rawJson = buffer.substring(0, splitIndex);
                    // نتجاهل الفاصل ونأخذ ما بعده
                    let contentStart = splitIndex;
                    if (buffer.substring(splitIndex).startsWith(DIVIDER)) {
                        contentStart += DIVIDER.length;
                    }

                    const content = buffer.substring(contentStart);

                    try {
                        let cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
                        JSON.parse(cleanJson); // Check validity
                        // Send correct signal
                        res.write(cleanJson + "|||STREAM_DIVIDER|||" + content);
                    } catch (e) {
                        // Fallback: Force a grid if JSON fails
                        const fallbackJSON = JSON.stringify({
                            visuals: {
                                type: "SVG",
                                code: `<svg viewBox="-10 -10 20 20" xmlns="http://www.w3.org/2000/svg"><line x1="-10" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.1"/><line x1="0" y1="-10" x2="0" y2="10" stroke="black" stroke-width="0.1"/></svg>`
                            }
                        });
                        res.write(fallbackJSON + "|||STREAM_DIVIDER|||" + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        // Final flush if header never found (Fail-safe)
        if (!isHeaderSent && buffer) {
             const fallbackJSON = JSON.stringify({ visuals: null });
             res.write(fallbackJSON + "|||STREAM_DIVIDER|||" + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ System Error. Retry.`);
        res.end();
    }
}
