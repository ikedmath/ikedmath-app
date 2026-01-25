/* =======================================================
   IKED ENGINE v2026: MASTERPIECE EDITION 🏆
   Architect: The World's Best Programmer
   Models: STRICTLY FROM YOUR 2026 LIST
   Logic: High IQ Persona + Precision Engineering
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app" // أضفت هذا احتياطاً
];

/* =======================================================
   1. STRATEGY: THE 2026 ELITE SQUAD 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function", "curve", "plot", "lim", "integral"].some(k => q.includes(k));

    if (isComplex) {
        // 🔥 القوة الضاربة (للرسم والتحليل المعقد)
        return [
            "gemini-2.5-flash",       // (001) الأذكى والأسرع
            "gemini-2.0-flash",       // (2.0) المستقر
            "gemini-flash-latest"     // (Latest) المنقذ
        ];
    }

    // 🔥 السرعة القصوى (للأسئلة العادية)
    return [
        "gemini-2.5-flash-lite",              // (001) الصاروخ
        "gemini-2.0-flash-lite-preview-02-05", // (Preview) المجاني
        "gemini-flash-lite-latest"            // (Latest)
    ]; 
}

/* =======================================================
   2. GENERATION LOGIC WITH SMART RETRY ⚙️
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.7,       // استعادة "ذكاء" الأستاذ (Creativity)
                    maxOutputTokens: 3000,  // مساحة كافية للشرح والرسم
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            // انتظار ذكي عند الضغط (Exponential Backoff Lite)
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 1500)); 
            }
            continue; 
        }
    }
    throw new Error("IKED System Busy (High Traffic). Please retry.");
}

export default async function handler(req, res) {
    // CORS & Headers
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

        // 🔥 SYSTEM PROMPT: THE PERFECT BALANCE 🔥
        const systemInstruction = `
        🔴 IDENTITY: You are **IKED**, an engaging Moroccan Math Tutor (2 Bac SM).
        - **Tone:** Professional yet warm. Use "Darija" for emphasis.
        - **Method:** 1. Analyze 2. Visualize 3. Explain.

        ⚡ OUTPUT PROTOCOL (STRICT):
        1. **Start IMMEDIATELY** with a JSON object for the visuals.
        2. Follow with the separator: "|||STREAM_DIVIDER|||".
        3. Then write the explanation text.

        🎨 VISUALS ENGINE (GeoGebra Standard):
        - **Format:** SVG inside JSON.
        - **Coordinate System:**
          * **Invert Y:** SVG Y is down. You MUST calculate: y_svg = -1 * y_math.
          * **ViewBox:** "-10 -10 20 20".
        - **Styling:**
          * **Grid:** stroke="#e2e8f0" stroke-width="0.05" (Paper thin).
          * **Axes:** stroke="#0f172a" stroke-width="0.15" (Sharp).
          * **Curve:** stroke="#2563eb" stroke-width="0.2" (Professional Blue).
        - **No Graph Needed?** Output: {"visuals": null}

        --- TEMPLATE (DO NOT DEVIATE) ---
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'>...</svg>"
           }, 
           "gamification": {"xp": 15}
        }
        |||STREAM_DIVIDER|||
        [Explanation starts here...]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Question]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 CLEANING PIPELINE (The "Filter") 🔥
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
                        // 🧹 التنظيف الجراحي: إزالة أي ماركداون أو شوائب
                        let cleanJson = rawJson.trim();
                        // إزالة ```json أو ``` في البداية والنهاية
                        cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
                        
                        // محاولة استخراج JSON إذا كان وسط نص
                        const firstBrace = cleanJson.indexOf('{');
                        const lastBrace = cleanJson.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1) {
                            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
                        }

                        // التحقق النهائي
                        JSON.parse(cleanJson);
                        
                        // إرسال الهيدر النظيف + الفاصل + المحتوى
                        res.write(cleanJson + DIVIDER + content);
                    } catch (e) {
                        console.error("JSON Clean Error:", e);
                        // خطة الطوارئ: إرسال null لإخفاء الكود الفاشل
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                // البث المباشر لما بعد الفاصل
                res.write(chunkText);
            }
        }
        
        // إغلاق آمن
        if (!isHeaderSent && buffer) {
            // إذا لم نجد الفاصل، نرسل النص فقط ونخفي أي محاولة رسم فاشلة
            res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: System update. Please retry.`);
        res.end();
    }
}
