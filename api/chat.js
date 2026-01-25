/* =======================================================
   IKED ENGINE v2026: PURE JSON EDITION 💎
   Architect: The World's Best Programmer
   Models: STRICTLY FROM YOUR LIST
   Features: No XML Tags, Pure JSON Header, Robust Parsing
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "[https://h-app.vercel.app](https://h-app.vercel.app)", 
    "http://localhost:3000", 
    "[http://127.0.0.1:5500](http://127.0.0.1:5500)"
];

/* =======================================================
   1. STRATEGY: STRICT 2026 LIST (UNCHANGED) 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function", "curve", "plot"].some(k => q.includes(k));

    if (isComplex) {
        return [
            "gemini-2.5-flash",       // الخيار الأول
            "gemini-2.0-flash",       // الخيار الثاني
            "gemini-flash-latest"     // الخيار الثالث
        ];
    }

    return [
        "gemini-2.5-flash-lite",              
        "gemini-2.0-flash-lite-preview-02-05", 
        "gemini-flash-lite-latest"            
    ]; 
}

/* =======================================================
   2. RETRY LOGIC (BALANCED) ⚖️
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.5,       // متوازن: ذكي في الشرح ودقيق في الرسم
                    maxOutputTokens: 2500,  // مساحة كافية للرسم والشرح
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 1500)); 
            }
            continue; 
        }
    }
    throw new Error("IKED System Busy (All models overloaded).");
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

        // 🔥 SYSTEM PROMPT: PURE JSON PROTOCOL (NO XML) 🔥
        const systemInstruction = `
        🔴 IDENTITY: IKED, Prof de Maths (2 Bac SM Maroc). Professional, Warm, & Precise.

        ⚡ PROTOCOL (STRICT ORDER):
        1. **HEADER:** Output a valid JSON object strictly containing the visuals.
        2. **SEPARATOR:** Output exactly "|||STREAM_DIVIDER|||".
        3. **BODY:** Output the explanation text in Arabic/Darija.

        🎨 GRAPHING ENGINE (GeoGebra Style):
        - If NO graph is needed, output: {"visuals": null}
        - If graph IS needed:
          * **Y-Axis:** Invert Y (multiply by -1).
          * **ViewBox:** "-10 -10 20 20".
          * **Styling:** Grid stroke="0.05", Curve stroke="0.2" (Blue).
          * **Format:** Pure SVG code inside the JSON.

        --- OUTPUT TEMPLATE (DO NOT ADD MARKDOWN OR XML) ---
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-10 -10 20 20' xmlns='[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)'>...</svg>"
           }, 
           "gamification": {"xp": 10}
        }
        |||STREAM_DIVIDER|||
        [Start your explanation here...]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Question]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 ROBUST BUFFERING & PARSING 🔥
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                // البحث عن الفاصل
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawJson = parts[0]; // الجزء الأول هو الـ JSON
                    const content = parts.slice(1).join(DIVIDER); // الباقي هو الشرح

                    try {
                        // 🧹 تنظيف عميق جداً لإزالة أي شوائب
                        let cleanJson = rawJson
                            .replace(/```json/g, "")  // إزالة كود ماركداون
                            .replace(/```/g, "")      // إزالة الإغلاق
                            .replace(/<metadata>/g, "") // احتياطاً
                            .replace(/<\/metadata>/g, "")
                            .trim();

                        // التحقق من صحة الـ JSON قبل الإرسال
                        JSON.parse(cleanJson);
                        
                        // إرسال الهيدر النظيف
                        res.write(cleanJson + DIVIDER + content);
                    } catch (e) {
                        console.error("JSON Parse Error:", e);
                        // خطة الطوارئ: إذا فشل الـ JSON، أرسل null وأكمل الشرح
                        // هذا يمنع ظهور الكود للمستخدم
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                // إرسال الشرح مباشرة بعد تجاوز الهيدر
                res.write(chunkText);
            }
        }
        
        // إذا انتهى الرد ولم يتم العثور على الفاصل (حالة نادرة)، نرسل النص فقط
        if (!isHeaderSent && buffer) {
            res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: Server is busy, retrying...`);
        res.end();
    }
}
