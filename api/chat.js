/* =======================================================
   IKED ENGINE v2026: PROACTIVE & FAST ⚡
   Fixes: Auto-detects need for drawing (not just keywords)
   Speed: Optimized SVG precision for faster tokens
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. STRATEGY: SMART DETECTION
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    
    // وسعنا قائمة الكلمات باش يفهم أي تلميح للرسم
    const visualKeywords = [
        "رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph", 
        "دالة", "function", "courbe", "trace", "representation", 
        "tamthil", "tamtil", "bayan", "mabyan", "handasa"
    ];
    
    const needsVisuals = visualKeywords.some(k => q.includes(k));

    if (needsVisuals) {
        // نستخدم الموديلات القوية للرسم
        return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    }
    // للأسئلة النصية الخفيفة
    return ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite-preview-02-05", "gemini-flash-lite-latest"]; 
}

/* =======================================================
   2. GENERATION LOGIC
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.6, 
                    maxOutputTokens: 5000, // كافي للرسم والشرح
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            // تقليص وقت الانتظار لتسريع التجاوب عند الخطأ
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

        // 🔥 SYSTEM PROMPT: PROACTIVE VISUALS & OPTIMIZED SPEED 🔥
        const systemInstruction = `
        You are **IKED**, a smart Moroccan Math Tutor.

        ⚡ **BEHAVIOR RULES:**
        1. **Proactive Visuals:** - IF the user asks about a **Function ($f(x)$)**, **Geometry**, or **Graphing** -> **YOU MUST DRAW IT.**
           - Don't wait for the word "Draw". If the context is visual, provide the JSON.
           - If strictly text (e.g., "Solve x+1=0"), output \`{"visuals": null}\`.

        2. **Concise & Moroccan:** - Answer directly using **Darija** + **Arabic Math Terms**.
           - Don't write long paragraphs unless asked to explain deeply.
           - Example: "Hada howa l-monhana, kima katchouf fih moqarib..."

        3. **Formatting:** Use LaTeX ($...$) for math.

        🚀 **SVG OPTIMIZATION (FOR SPEED):**
        - **Precision:** Limit coordinates to 2 decimal places (e.g., 3.14, not 3.141592).
        - **Invert Y:** y_svg = -1 * y_math.
        - **ViewBox:** "-10 -10 20 20".
        - **Simplicity:** Use simple <path> commands.

        🚨 **OUTPUT FORMAT:**
        1. JSON Object.
        2. "|||STREAM_DIVIDER|||"
        3. Text Response.

        --- TEMPLATE ---
        { "visuals": { "type": "SVG", "code": "..." }, "gamification": {"xp": 10} }
        |||STREAM_DIVIDER|||
        Lina n3tabir ad-dala $f(x) = x^2$. Hada howa l-monhana dyalha:
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[User]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 ROBUST JSON EXTRACTION 🔥
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawBuffer = parts[0]; 
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        // Extraction Logic: Find first { and last }
                        const firstBrace = rawBuffer.indexOf('{');
                        const lastBrace = rawBuffer.lastIndexOf('}');

                        if (firstBrace !== -1 && lastBrace !== -1) {
                            let cleanJson = rawBuffer.substring(firstBrace, lastBrace + 1);
                            // Validate JSON
                            JSON.parse(cleanJson);
                            res.write(cleanJson + DIVIDER + content);
                        } else {
                            // No valid JSON block found
                            res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                        }
                    } catch (e) {
                        // JSON parsing failed, hide it and show text
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        if (!isHeaderSent && buffer) {
             res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ IKED: Please retry.`);
        res.end();
    }
}
