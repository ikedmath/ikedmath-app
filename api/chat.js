/* =======================================================
   IKED ENGINE: GEOGEBRA EDITION 📐
   Focus: High-Fidelity Plotting, Grid Systems, & Precision
   Fixes: Empty Code Bug & JSON Leakage
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   HELPER: Smart Routing (Quality over Speed) 🧠
   للرسم نختار الموديل الأذكى وليس الأسرع
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const isComplex = ["رسم", "draw", "svg", "هندسة", "geometry", "دالة", "function", "curve"].some(k => q.includes(k));
    
    if (isComplex) {
        // للرسم الدقيق: نحتاج موديل قوي يتقن الحسابات
        return ["gemini-2.0-flash", "gemini-2.5-flash"]; 
    }
    // للأسئلة العادية
    return ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite-preview-02-05"]; 
}

/* =======================================================
   HELPER: Robust Retry 🔄
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    let lastError = null;
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
            const result = await model.generateContentStream(fullPrompt);
            return result.stream;
        } catch (error) {
            console.warn(`[Skip] ${modelName}: ${error.message}`);
            lastError = error;
            continue;
        }
    }
    throw new Error("All models busy.");
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
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "No input" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { res.write(JSON.stringify({ error: "Config Error" })); res.end(); return; }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // 🔥 SYSTEM PROMPT: GEOGEBRA STYLE 🔥
        const systemInstruction = `
        🔴 IDENTITY: IKED, Elite Math Tutor (GeoGebra Specialist).
        
        ⚡ CRITICAL OUTPUT RULES:
        1. **START IMMEDIATELY** with <metadata> tag. No text before it.
        2. Output valid JSON inside <metadata>...</metadata>.
        3. Output "|||STREAM_DIVIDER|||".
        4. Then output the Explanation.

        🎨 VISUALS PROTOCOL (GEOGEBRA STANDARD):
        - **Target:** Create high-precision math plots.
        - **Viewport:** Use viewBox="-12 -12 24 24" (Standard 24x24 grid).
        - **Elements Required:**
          1. **Grid:** Light gray lines every 1 unit (<path stroke="#334155" stroke-width="0.5" opacity="0.3".../>).
          2. **Axes:** Bold white lines for X and Y (<line stroke="white" stroke-width="1.5".../>).
          3. **Function:** - Calculate at least **100 points** for smooth curves.
             - **CRITICAL:** Multiply Y-coordinates by -1 (Invert Y).
             - Use a vibrant color (e.g., #6366f1) and stroke-width="2.5".
        - **DO NOT BE LAZY:** You MUST generate the full "d" attribute path. Do not leave it empty.

        --- FORMAT TEMPLATE ---
        <metadata>
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-12 -12 24 24' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='grid' width='1' height='1' patternUnits='userSpaceOnUse'><path d='M 1 0 L 0 0 0 1' fill='none' stroke='#334155' stroke-width='0.1'/></pattern></defs><rect width='100%' height='100%' fill='url(#grid)' x='-12' y='-12'/><line x1='-12' y1='0' x2='12' y2='0' stroke='#94a3b8' stroke-width='0.8'/><line x1='0' y1='-12' x2='0' y2='12' stroke='#94a3b8' stroke-width='0.8'/><path d='M -5 25 L ...' fill='none' stroke='#6366f1' stroke-width='2.5'/></svg>"
           }, 
           "gamification": {"xp": 20, "badge": "Graph Master"}
        }
        </metadata>
        |||STREAM_DIVIDER|||
        Here is the detailed analysis of the function...
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Request]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Buffering & Cleaning
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
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        // 🧹 تنظيف قوي جداً لضمان عدم تسرب الكود
                        let cleanJson = rawMeta
                            .replace(/<metadata>/g, "")
                            .replace(/<\/metadata>/g, "")
                            .replace(/```json/g, "")
                            .replace(/```xml/g, "") // أحيانا يظن الـ SVG هو XML
                            .replace(/```/g, "")
                            .trim();

                        // التحقق من صحة الكود
                        JSON.parse(cleanJson);
                        
                        // إرسال البيانات النظيفة
                        res.write(cleanJson + DIVIDER + content);
                    } catch (e) {
                        console.error("JSON Fix Failed:", e);
                        // Fallback: إرسال JSON فارغ آمن لتجنب ظهور الكود في الشات
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + rawMeta + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        if (!isHeaderSent && buffer) res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: System update in progress. Retry shortly.`);
        res.end();
    }
}
