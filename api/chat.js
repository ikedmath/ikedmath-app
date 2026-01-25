/* =======================================================
   IKED ENGINE v2.1: PRODUCTION CORE (ESM FIX) 🛡️
   Architect: The World's Best Programmer
   Fix: Replaced 'require' with 'import' for "type": "module"
   ======================================================= */

// 🔥 التغيير هنا: استخدام import بدلاً من require
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Security: Allowed Origins 🔒
const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   HELPER: Smart Model Routing 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const complexityKeywords = [
        "رسم", "draw", "svg", "هندسة", "geometry", 
        "complex", "برهان", "proof", "دالة", "function"
    ];
    
    const isComplex = complexityKeywords.some(k => query.toLowerCase().includes(k));
    
    if (isComplex) {
        return ["gemini-2.0-flash", "gemini-1.5-pro"];
    }
    return ["gemini-2.0-flash-lite", "gemini-2.0-flash"]; 
}

/* =======================================================
   HELPER: Retry Logic with Exponential Backoff 🔄
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt, maxRetries = 3) {
    let lastError = null;

    for (const modelName of modelList) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                const result = await model.generateContentStream(fullPrompt);
                return result.stream; 

            } catch (error) {
                lastError = error;
                console.error(`[Metrics] Model: ${modelName} | Attempt: ${attempt + 1} | Error: ${error.message}`);
                
                if (error.message.includes("429") || error.message.includes("Quota")) {
                    const waitTime = 1000 * Math.pow(2, attempt); 
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }
                break; 
            }
        }
    }
    throw lastError || new Error("All models failed.");
}

/* =======================================================
   MAIN HANDLER
   ======================================================= */
export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Input Validation
    const { prompt, userProfile } = req.body;
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).write(JSON.stringify({ error: "Invalid input" }));
    }
    
    if (prompt.length > 5000) {
        return res.status(400).write(JSON.stringify({ error: "Message too long" }));
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("Critical: API Key missing");
        res.write(JSON.stringify({ error: "Service configuration error" }));
        res.end();
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // System Prompt
        const systemInstruction = `
        🔴 IDENTITY: IKED, Expert Math Tutor (2 Bac Sciences Maths - Morocco).
        
        ⚡ STRICT OUTPUT PROTOCOL:
        1. FIRST: Output valid JSON Metadata strictly inside <metadata> tags.
        2. SECOND: Output exactly "|||STREAM_DIVIDER|||".
        3. THIRD: The Pedagogical Response.

        🧠 PEDAGOGY RULES (SOCRATIC METHOD):
        - DO NOT give the full solution immediately.
        - Explain the logic/methodology first.
        - Stop at 70% of the solution or guide the student to finish the calculation.
        - End with a question to check understanding.

        🎨 VISUALS RULE (SVG):
        - IMPORTANT: Screen Y-axis is inverted (downwards). 
        - When generating function plots, YOU MUST FLIP Y-COORDINATES or multiply Y by -1 so the graph looks mathematically correct (upwards).

        --- FORMAT EXAMPLE ---
        <metadata>
        {
           "visuals": { "type": "SVG", "code": "<svg>...</svg>" },
           "gamification": { "xp": 15, "badge": null },
           "analogy": "Analogy in Darija"
        }
        </metadata>
        |||STREAM_DIVIDER|||
        Here is the method... $$ f(x) = ... $$
        Now, try to calculate the limit yourself?
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Student Level: ${level}]\n[Question]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Buffering Middleware
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawMeta = parts[0];
                    const contentStart = parts.slice(1).join(DIVIDER); 

                    try {
                        let cleanJsonStr = rawMeta
                            .replace(/<metadata>/g, "")
                            .replace(/<\/metadata>/g, "")
                            .replace(/```json/g, "")
                            .replace(/```/g, "")
                            .trim();

                        JSON.parse(cleanJsonStr); 

                        res.write(cleanJsonStr + DIVIDER + contentStart);
                    } catch (e) {
                        console.error("[JSON Parse Error]", e);
                        const defaultMeta = JSON.stringify({ visuals: null, gamification: {xp:5}, error: "Meta parse failed" });
                        res.write(defaultMeta + DIVIDER + rawMeta + contentStart); 
                    }
                    
                    isHeaderSent = true;
                    buffer = ""; 
                }
            } else {
                res.write(chunkText);
            }
        }

        if (!isHeaderSent && buffer.length > 0) {
            res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }

        res.end();

    } catch (error) {
        console.error("Final Handler Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED System: The brain is experiencing high traffic. Please try again in a moment.`);
        res.end();
    }
}

