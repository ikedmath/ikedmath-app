/* =======================================================
   IKED ENGINE v2026: STRICT LIST EDITION 🔒
   Architect: The World's Best Programmer
   Models: STRICTLY FROM YOUR PROVIDED LIST (No 1.5)
   Fixes: 404 Errors, Quota Management, Infinite Loops
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   1. STRATEGY: STRICT 2026 LIST 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function"].some(k => q.includes(k));

    if (isComplex) {
        // 🔥 القوة الضاربة (من لائحتك فقط)
        return [
            "gemini-2.5-flash",       // (001) - الخيار الأول: الأذكى
            "gemini-2.0-flash",       // (2.0) - الخيار الثاني: المشهور
            "gemini-flash-latest"     // (Latest) - الخيار الثالث: "الروكور" المنقذ
        ];
    }

    // 🔥 السرعة القصوى (من لائحتك فقط)
    return [
        "gemini-2.5-flash-lite",              // (001) - الجديد
        "gemini-2.0-flash-lite-preview-02-05", // (Preview) - غالباً الكوظا ديالو خاوية
        "gemini-flash-lite-latest"            // (Latest) - الاحتياطي
    ]; 
}

/* =======================================================
   2. RETRY LOGIC WITH BRAKES & v1beta 🛑
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            // ⚠️ هام: جميع موديلات 2026 تتطلب v1beta
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                // 🛑 الفرامل: لمنع التكرار اللانهائي والهذيان
                generationConfig: {
                    temperature: 0.4,       // رزين ودقيق
                    maxOutputTokens: 2000,  // حد أقصى للكلام
                    topP: 0.8,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            // تسجيل الخطأ والمرور للموديل التالي فوراً
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            
            // إذا كان الخطأ ضغطاً (429)، ننتظر ثانية ونمر للتالي
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 1500)); 
            }
            continue; 
        }
    }
    throw new Error("IKED System Busy (All 2026 models overloaded).");
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

        // 🔥 SYSTEM PROMPT: MOROCCAN TUTOR + VECTOR GRAPHICS 🔥
        const systemInstruction = `
        🔴 IDENTITY: IKED, Prof de Maths (2 Bac SM Maroc). Strict & Concise.

        ⚡ OUTPUT RULES:
        1. **Language:** Arabic (contextual Darija allowed).
        2. **Math:** LaTeX ($$).
        3. **Visuals:** Generate SVG ONLY inside JSON.

        🎨 SVG RULES (GeoGebra Style):
        - **Y-Axis:** Multiply Y by -1 (Invert).
        - **ViewBox:** "-10 -10 20 20".
        - **Precision:** Step 0.1 for curves.
        - **Style:** * Grid: stroke-width="0.05"
          * Axes: stroke-width="0.15"
          * Curve: stroke-width="0.2" (Blue #2563eb)

        --- STRICT RESPONSE FORMAT ---
        <metadata>
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='g' width='1' height='1' patternUnits='userSpaceOnUse'><path d='M1 0V1M0 1H1' fill='none' stroke='#e2e8f0' stroke-width='0.05'/></pattern></defs><rect width='100%' height='100%' fill='url(#g)' x='-10' y='-10'/><line x1='-10' y1='0' x2='10' y2='0' stroke='black' stroke-width='0.15'/><line x1='0' y1='-10' x2='0' y2='10' stroke='black' stroke-width='0.15'/><path d='...' fill='none' stroke='#2563eb' stroke-width='0.2'/></svg>"
           }, 
           "gamification": {"xp": 10, "badge": null}
        }
        </metadata>
        |||STREAM_DIVIDER|||
        [Explanation...]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Question]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Buffering
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
                        let cleanJson = rawMeta
                            .replace(/<metadata>/g, "")
                            .replace(/<\/metadata>/g, "")
                            .replace(/```json/g, "")
                            .replace(/```/g, "")
                            .trim();

                        JSON.parse(cleanJson);
                        res.write(cleanJson + DIVIDER + content);
                    } catch (e) {
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
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
        console.error("Final Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: Server overloaded. Please wait 10s and retry.`);
        res.end();
    }
}
