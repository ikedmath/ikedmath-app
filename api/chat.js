/* =======================================================
   IKED ENGINE v2026: THE NUCLEAR FIX ☢️
   Focus: Aggressive JSON Extraction & Token Boosting
   Logic: "Find the braces, ignore the rest"
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. STRATEGY: STRICT 2026 LIST
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function"].some(k => q.includes(k));

    if (isComplex) {
        return [
            "gemini-2.5-flash",       // (001) الذكي
            "gemini-2.0-flash",       // (2.0) المستقر
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
   2. GENERATION LOGIC (MAX TOKENS)
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 8192, // ⚠️ رفعنا الحد للأقصى باش الرسم مايتقطعش
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 2000)); 
            }
            continue; 
        }
    }
    throw new Error("System Overload.");
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

        // 🔥 SYSTEM PROMPT: FORCE RAW FORMAT 🔥
        const systemInstruction = `
        You are IKED, a Moroccan Math Tutor.
        
        🚨 **CRITICAL OUTPUT RULES**: 
        1. FIRST output the Visuals JSON. 
        2. THEN output "|||STREAM_DIVIDER|||".
        3. THEN output the Explanation.

        ⚠️ **DO NOT USE MARKDOWN.** Do NOT write \`\`\`json. Just write the raw JSON.

        🎨 **SVG RULES (GeoGebra Style):**
        - **Invert Y:** y_svg = -1 * y_math.
        - **ViewBox:** "-10 -10 20 20".
        - **Elements:** Simple <path> and <line> tags. No complex definitions.

        --- TEMPLATE ---
        { "visuals": { "type": "SVG", "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'>...</svg>" }, "gamification": {"xp": 10} }
        |||STREAM_DIVIDER|||
        [Explanation...]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[User]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 LOGIC: SURGICAL JSON EXTRACTION 🔥
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
                    const rawBuffer = parts[0]; 
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        // 🛠️ عملية الجراحة: البحث عن أول { وآخر }
                        // هذا يتجاهل تماماً أي نص أو ماركداون قبل أو بعد الـ JSON
                        const firstBrace = rawBuffer.indexOf('{');
                        const lastBrace = rawBuffer.lastIndexOf('}');

                        if (firstBrace !== -1 && lastBrace !== -1) {
                            let cleanJson = rawBuffer.substring(firstBrace, lastBrace + 1);
                            
                            // التحقق من الصحة
                            JSON.parse(cleanJson);
                            
                            // إرسال الـ JSON النظيف فقط
                            res.write(cleanJson + DIVIDER + content);
                        } else {
                            throw new Error("No JSON found");
                        }
                    } catch (e) {
                        console.error("JSON Extraction Failed:", e);
                        // 🛑 Fail-Safe: إذا فشل الاستخراج، نرسل null لنخفي الكود ونظهر الشرح فقط
                        // لن يظهر للمستخدم أي كود مخربق بعد الآن
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        // إغلاق آمن
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
