/* =======================================================
   IKED ENGINE v2026: NEXT GEN CORE 🚀
   Architect: The World's Best Programmer
   Models: Gemini 2.5 Flash / Lite (2026 Lineup)
   Strategy: Smart Routing + Fallback to Legacy 2.0
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Security: Allowed Origins 🔒
const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   HELPER: Smart Model Routing (2026 Edition) 🧠
   يختار الموديل المناسب حسب نوع السؤال لتوفير الجهد
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    
    // كلمات تدل على الصعوبة (رسم، هندسة، برهان)
    const complexityKeywords = [
        "رسم", "draw", "svg", "هندسة", "geometry", 
        "complex", "برهان", "proof", "دالة", "function",
        "limit", "integral", "analyse"
    ];

    // كلمات تدل على البساطة (ترحيب، سؤال خفيف)
    const simpleKeywords = [
        "hello", "مرحبا", "سلام", "شرح بسيط", "تلخيص", 
        "ما هو", "تعريف", "شكرا"
    ];

    const isComplex = complexityKeywords.some(k => q.includes(k));
    const isSimple = simpleKeywords.some(k => q.includes(k));

    if (isComplex) {
        // للمهام الصعبة: نستعمل أقوى وحدين في 2026
        return [
            "gemini-2.5-flash",       // الخيار الأول: التوازن المثالي
            "gemini-2.5-pro",         // الخيار الثاني: الذكاء الخارق (اذا فشل الاول)
            "gemini-2.0-flash"        // الخيار الثالث: القديم والمضمون
        ];
    }

    if (isSimple) {
        // للمهام السهلة: نستعمل الخفيف باش نوفروا Quota
        return [
            "gemini-2.5-flash-lite",  // جديد وسريع جداً
            "gemini-2.0-flash-lite",  // البديل الخفيف
            "gemini-2.5-flash"        // الاحتياط
        ];
    }

    // الوضع العادي (Default)
    return ["gemini-2.5-flash", "gemini-2.0-flash"]; 
}

/* =======================================================
   HELPER: Retry Logic with Exponential Backoff 🔄
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt, maxRetries = 3) {
    let lastError = null;

    for (const modelName of modelList) {
        // نحاول 3 مرات مع كل موديل قبل المرور للتالي
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // نستخدم v1beta لأن موديلات 2026 غالباً تحتاجها
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                
                const result = await model.generateContentStream(fullPrompt);
                return result.stream; // نجحنا!

            } catch (error) {
                lastError = error;
                console.error(`[Metrics] Model: ${modelName} | Attempt: ${attempt + 1} | Error: ${error.message}`);
                
                // معالجة أخطاء الضغط (Quota)
                if (error.message.includes("429") || error.message.includes("Quota")) {
                    // انتظار ذكي: 1.5 ثانية، 3 ثواني، 6 ثواني...
                    const waitTime = 1500 * Math.pow(2, attempt); 
                    await new Promise(r => setTimeout(r, waitTime));
                    continue;
                }
                
                // أخطاء أخرى (مثل 404 الموديل غير موجود)، نمر للموديل التالي فوراً
                break; 
            }
        }
    }
    throw lastError || new Error("All 2026 models failed. Server Busy.");
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

    // Validation
    const { prompt, userProfile } = req.body;
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).write(JSON.stringify({ error: "Invalid input" }));
    }
    if (prompt.length > 6000) {
        return res.status(400).write(JSON.stringify({ error: "Message too long" }));
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("Critical: API Key missing");
        res.write(JSON.stringify({ error: "Config Error" }));
        res.end();
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // System Prompt (نفس البرومبت البيداغوجي الناجح)
        const systemInstruction = `
        🔴 IDENTITY: IKED, Expert Math Tutor (2 Bac Sciences Maths - Morocco).
        
        ⚡ STRICT OUTPUT PROTOCOL:
        1. FIRST: Output valid JSON Metadata strictly inside <metadata> tags.
        2. SECOND: Output exactly "|||STREAM_DIVIDER|||".
        3. THIRD: The Pedagogical Response.

        🧠 PEDAGOGY RULES (SOCRATIC METHOD):
        - Stop at 70% of the solution.
        - Guide the student, don't just solve.
        - End with a checking question.

        🎨 VISUALS RULE (SVG):
        - IMPORTANT: Screen Y-axis is inverted (downwards). 
        - YOU MUST FLIP Y-COORDINATES (multiply Y by -1) for correct math plotting.

        --- FORMAT EXAMPLE ---
        <metadata>
        {
           "visuals": { "type": "SVG", "code": "<svg>...</svg>" },
           "gamification": { "xp": 10, "badge": null },
           "analogy": "Darija analogy"
        }
        </metadata>
        |||STREAM_DIVIDER|||
        Explanation... $$ f(x) = ... $$
        Question?
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Question]: ${prompt}`;

        // اختيار الاستراتيجية المناسبة
        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Buffering (صمام الأمان)
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

                        JSON.parse(cleanJsonStr); // Check validity

                        res.write(cleanJsonStr + DIVIDER + contentStart);
                    } catch (e) {
                        console.error("[JSON Fix]", e);
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
        console.error("Handler Error:", error);
        // رسالة لطيفة للمستخدم
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: الخوادم مشغولة قليلاً (تحديث الموديلات). حاول مرة أخرى.`);
        res.end();
    }
}
