/* =======================================================
   IKED ENGINE v2026: PROFESSIONAL CORE 💎
   Architect: The World's Best Programmer
   Models: Gemini 2.5 Flash / Pro (Validated List)
   Features: Exponential Backoff, Vector Precision, Strict JSON
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   1. STRATEGIC MODEL ROUTING (FROM YOUR LIST) 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    
    // كلمات مفتاحية تتطلب ذكاء عالياً (رسم، تحليل، برهان)
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function", "analyse", "lim", "integral", "tableau"].some(k => q.includes(k));

    if (isComplex) {
        // 🔥 القوة الضاربة (للمهام المعقدة)
        return [
            "gemini-2.5-flash",       // (001) الأذكى والأسرع حالياً
            "gemini-2.5-pro",         // (2.5) للتحليل العميق جداً
            "gemini-2.0-flash"        // (2.0) الاحتياطي المستقر
        ];
    }

    // 🔥 السرعة القصوى (للمهام اليومية)
    return [
        "gemini-2.5-flash-lite",             // (001) صاروخ 2026
        "gemini-2.0-flash-lite-preview-02-05", // (preview) خيار مجاني ممتاز
        "gemini-2.0-flash-lite"              // الاحتياطي
    ]; 
}

/* =======================================================
   2. PROFESSIONAL RETRY LOGIC (EXPONENTIAL BACKOFF) 📈
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    let lastError = null;

    for (const modelName of modelList) {
        // نحاول مرتين مع كل موديل قبل الانتقال
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                // ملاحظة: موديلات 2026 تتطلب v1beta
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                const result = await model.generateContentStream(fullPrompt);
                return result.stream;

            } catch (error) {
                console.warn(`⚠️ [Retry] ${modelName} (Attempt ${attempt}): ${error.message}`);
                lastError = error;

                // إذا كان الخطأ ضغطاً (429) نطبق الانتظار المتضاعف
                if (error.message.includes("429") || error.message.includes("Quota")) {
                    const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s...
                    await new Promise(r => setTimeout(r, waitTime));
                    continue; // إعادة المحاولة مع نفس الموديل
                }
                
                // إذا كان خطأ تقنياً (404) ننتقل للموديل التالي فوراً
                break; 
            }
        }
    }
    throw new Error("IKED System Busy. Please wait 30 seconds.");
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

        // 🔥🔥🔥 SYSTEM PROMPT: MOROCCAN PEDAGOGY + VECTOR PRECISION 🔥🔥🔥
        const systemInstruction = `
        🔴 IDENTITY:
        أنت "IKED"، أستاذ رياضيات مغربي (2 Bac SM). صارم، دقيق، ومنهجي. لست روبوت دردشة.

        ⚡ PROTOCOL (القواعد الصارمة):
        1. **اللغة:** الشرح بالعربية الفصحى مع مصطلحات الدارجة العلمية المغربية (مثل: "نعتبر"، "لدينا"، "إذن"، "رد البال").
        2. **المنهجية:** - لا تعطِ الجواب النهائي فوراً.
           - ابدأ بـ "تذكير" (Rappel) الخاصية المستعملة.
           - طبق الخاصية خطوة بخطوة.
           - تحقق من النتيجة.
        3. **الرياضيات:** اكتب المعادلات بـ LaTeX فقط ($$...$$).

        🎨 GRAPHING ENGINE (SVG VECTOR):
        - **Objective:** GeoGebra-quality plotting.
        - **Y-Axis Correction:** SVG Y-axis points DOWN. You MUST calculate y_svg = -1 * y_math.
        - **Viewport:** viewBox="-10 -10 20 20" (Standard Grid).
        - **Elements:**
          * **Grid:** <path d='...' stroke='#e2e8f0' stroke-width='0.05' /> (Very faint).
          * **Axes:** <line ... stroke='#0f172a' stroke-width='0.15' /> (Sharp black).
          * **Function:** <path ... stroke='#2563eb' stroke-width='0.2' fill='none' /> (Professional Blue).
          * **Precision:** Use many points (step 0.1 or less) for smooth curves.

        --- RESPONSE FORMAT ---
        <metadata>
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'></svg>"
           }, 
           "gamification": {"xp": 10, "badge": "Analyst"}
        }
        </metadata>
        |||STREAM_DIVIDER|||
        [الشرح يبدأ هنا...]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Niveau: ${level}]\n[Question]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Processing
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
                        // Fail-safe: إرسال بيانات فارغة لتجنب تعليق الواجهة
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
        console.error("Critical Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: الضغط مرتفع جداً. يرجى الانتظار قليلاً.`);
        res.end();
    }
}
