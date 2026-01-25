/* =======================================================
   IKED ENGINE v2026: FINAL PRODUCTION FIX 🚀
   Persona: Moroccan Math Tutor (Smart & engaging)
   Visuals: GeoGebra Vector Style (Hidden JSON)
   Models: Strict User List (No hallucinations)
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "[https://h-app.vercel.app](https://h-app.vercel.app)", 
    "http://localhost:3000", 
    "[http://127.0.0.1:5500](http://127.0.0.1:5500)"
];

/* =======================================================
   1. SMART MODEL STRATEGY 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function", "curve", "plot", "lim", "integral"].some(k => q.includes(k));

    if (isComplex) {
        return [
            "gemini-2.5-flash",       // الأذكى والأسرع (001)
            "gemini-2.0-flash",       // المستقر والقوي
            "gemini-flash-latest"     // المنقذ
        ];
    }

    return [
        "gemini-2.5-flash-lite",              
        "gemini-2.0-flash-lite-preview-02-05", 
        "gemini-flash-lite-latest"            
    ]; 
}

/* =======================================================
   2. ROBUST GENERATION LOGIC ⚙️
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.7,       // استعادة "روح" الأستاذ (ليس روبوتياً جداً)
                    maxOutputTokens: 3000,  // مساحة كافية للرسم والشرح المفصل
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            // انتظار ذكي عند الضغط
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 2000)); 
            }
            continue; 
        }
    }
    throw new Error("IKED System Busy (All models overloaded).");
}

export default async function handler(req, res) {
    // إعدادات الـ CORS والهيدر
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

        // 🔥 SYSTEM PROMPT: THE IKED PERSONA & GEOGEBRA SPECS 🔥
        const systemInstruction = `
        🔴 IDENTITY: You are **IKED**, a brilliant and engaging Moroccan Math Tutor (2 Bac SM). 
        - **Tone:** Encouraging, strict on logic, uses "Darija" for emphasis (e.g., "Radd lbal", "Chof mzyan").
        - **Goal:** Explain clearly, then illustrate perfectly.

        ⚡ OUTPUT PROTOCOL (STRICT ORDER):
        1. **JSON OBJECT:** A single line JSON containing the visuals. **NO MARKDOWN, NO CODE BLOCKS.** Start directly with \`{\`.
        2. **DIVIDER:** Exactly \`|||STREAM_DIVIDER|||\`.
        3. **TEXT:** The explanation in Arabic/Darija.

        🎨 VISUALS ENGINE (GeoGebra Style):
        - If the user asks for a drawing or function:
          * **Y-Axis:** Multiply all Y values by -1 (SVG coordinates).
          * **ViewBox:** "-10 -10 20 20".
          * **Grid:** stroke="#e2e8f0" stroke-width="0.05".
          * **Curve:** stroke="#2563eb" stroke-width="0.15" (Smooth, precision step 0.1).
        - If NO drawing is needed, output: \`{"visuals": null}\`

        --- EXAMPLE OUTPUT ---
        {"visuals": {"type": "SVG", "code": "<svg viewBox='-10 -10 20 20' xmlns='[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)'>...</svg>"}, "gamification": {"xp": 20}}
        |||STREAM_DIVIDER|||
        السلام عليكم! تمرين ممتاز. لاحظ أن الدالة معرفة على...
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Student Question]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 ROBUST STREAM BUFFERING & CLEANING 🔥
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                // ننتظر الفاصل
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawJson = parts[0]; 
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        // 🧹 تنظيف قوي جداً: إزالة أي ماركداون أو نصوص قبل الـ JSON
                        let cleanJson = rawJson.trim();
                        // إزالة ```json أو ``` في البداية والنهاية
                        cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
                        
                        // محاولة إيجاد JSON إذا كان هناك نص قبله
                        const jsonStartIndex = cleanJson.indexOf('{');
                        const jsonEndIndex = cleanJson.lastIndexOf('}');
                        if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                            cleanJson = cleanJson.substring(jsonStartIndex, jsonEndIndex + 1);
                        }

                        // التحقق النهائي
                        JSON.parse(cleanJson);
                        
                        // إرسال الهيدر النظيف + الفاصل + المحتوى
                        res.write(cleanJson + DIVIDER + content);
                    } catch (e) {
                        console.error("JSON Clean Error:", e);
                        // في حالة الفشل التام، نرسل null لتجنب ظهور الكود للمستخدم
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                // بعد إرسال الهيدر، نرسل باقي الشرح مباشرة
                res.write(chunkText);
            }
        }
        
        // إغلاق الستريم بأمان
        if (!isHeaderSent && buffer) {
            // إذا لم نجد الفاصل أبداً، نرسل النص فقط
            res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: Server reset. Please retry.`);
        res.end();
    }
}
