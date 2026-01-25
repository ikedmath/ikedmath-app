/* =======================================================
   IKED ENGINE v2026: ULTIMATE EDITION 💎
   Architect: The World's Best Programmer
   Architecture: The 4-Layer Engineering Roadmap
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   LAYER 4: BRAIN & ROUTING (MODEL LOGIC) 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    
    // كلمات مفتاحية تتطلب "محرك الرسم" (Rendering Engine)
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function", "curve", "plot", "lim", "integral"].some(k => q.includes(k));

    if (isComplex) {
        // 🔥 القوة الضاربة (للرسم والتحليل)
        return [
            "gemini-2.5-flash",       // (001) الموديل الأساسي: ذكي وسريع
            "gemini-2.0-flash",       // (2.0) الاحتياطي المستقر
            "gemini-2.5-pro"          // (2.5) للتحليل العميق (عند الضرورة)
        ];
    }

    // 🔥 السرعة القصوى (للأسئلة النصية)
    return [
        "gemini-2.5-flash-lite",             // (001) الأسرع عالمياً
        "gemini-2.0-flash-lite-preview-02-05", // (preview) خيار مجاني ممتاز
        "gemini-2.0-flash-lite"              // الاحتياطي
    ]; 
}

/* =======================================================
   LAYER 3: DATA PIPELINE (RETRY & BACKOFF) 📈
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    let lastError = null;

    for (const modelName of modelList) {
        // محاولتان لكل موديل مع انتظار ذكي
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                // ملاحظة: موديلات 2026 تتطلب v1beta
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                const result = await model.generateContentStream(fullPrompt);
                return result.stream;

            } catch (error) {
                console.warn(`⚠️ [Retry] ${modelName} (Attempt ${attempt}): ${error.message}`);
                lastError = error;

                // استراتيجية التراجع الذكي (Exponential Backoff)
                if (error.message.includes("429") || error.message.includes("Quota")) {
                    const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s...
                    await new Promise(r => setTimeout(r, waitTime));
                    continue; 
                }
                
                // خطأ تقني (404) -> تجاوز الموديل فوراً
                break; 
            }
        }
    }
    throw new Error("IKED System Overload. Please wait 30 seconds.");
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

        // 🔥🔥🔥 LAYER 1 & 2: CALIBRATION & RENDERING ENGINE PROMPT 🔥🔥🔥
        const systemInstruction = `
        🔴 IDENTITY:
        أنت "IKED"، أستاذ رياضيات مغربي (2 Bac SM). صارم، دقيق، ومنهجي.

        ⚡ PROTOCOL (القواعد الصارمة):
        1. **اللغة:** الشرح بالعربية الفصحى مع الدارجة العلمية المغربية.
        2. **المنهجية:** تذكير (Rappel) -> تطبيق (Application) -> نتيجة.
        3. **الرياضيات:** LaTeX للمعادلات ($$...$$).

        🎨 GRAPHING ENGINE (LAYER 1 & 2 - GEOGEBRA STANDARD):
        - **Objective:** Create High-Fidelity Vector Plots.
        - **Unit Standardization:** Assume 1 Unit = 20px.
        
        1. **CALIBRATION (The Thin Pen Rule):**
           - **Grid:** <path ... stroke='#e2e8f0' stroke-width='0.05' /> (Must be extremely thin).
           - **Axes:** <line ... stroke='#0f172a' stroke-width='0.15' /> (Sharp and clear).
           - **Function:** <path ... stroke='#2563eb' stroke-width='0.2' /> (Professional Blue).

        2. **RENDERING LOGIC:**
           - **Gravity Inversion:** SVG Y-axis is down. You MUST calculate: **y_svg = -1 * y_math**.
           - **High Sampling Rate:** Calculate a point every **0.1 step** (e.g., for range -5 to 5, generate 100 points). Do NOT just connect integers.
           - **Dynamic Viewport:** Use viewBox="-10 -10 20 20" by default, but adjust if the function goes out of bounds.

        --- RESPONSE FORMAT (STRICT JSON) ---
        <metadata>
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='grid' width='1' height='1' patternUnits='userSpaceOnUse'><path d='M 1 0 L 0 0 0 1' fill='none' stroke='#e2e8f0' stroke-width='0.05'/></pattern></defs><rect width='100%' height='100%' fill='url(#grid)' x='-10' y='-10'/><line x1='-10' y1='0' x2='10' y2='0' stroke='black' stroke-width='0.15'/><line x1='0' y1='-10' x2='0' y2='10' stroke='black' stroke-width='0.15'/><path d='M -10 ...' fill='none' stroke='#2563eb' stroke-width='0.2'/></svg>"
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

        // 🔥 LAYER 3: DATA PIPELINE (BUFFERING)
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                // ننتظر حتى نجد الفاصل للتأكد من اكتمال الرأس
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawMeta = parts[0];
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        // تنظيف صارم للـ JSON
                        let cleanJson = rawMeta
                            .replace(/<metadata>/g, "")
                            .replace(/<\/metadata>/g, "")
                            .replace(/```json/g, "")
                            .replace(/```/g, "")
                            .trim();

                        // التحقق من الصلاحية
                        JSON.parse(cleanJson);
                        
                        // إرسال البيانات النظيفة
                        res.write(cleanJson + DIVIDER + content);
                    } catch (e) {
                        console.error("JSON Pipeline Error:", e);
                        // Fail-safe: إرسال بيانات فارغة لتجنب تشوه الشات
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                // البث المباشر للشرح (بعد اجتياز نقطة التفتيش)
                res.write(chunkText);
            }
        }
        
        if (!isHeaderSent && buffer) res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        res.end();

    } catch (error) {
        console.error("Handler Failure:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: النظام تحت الصيانة اللحظية (تحديث المعايير). يرجى المحاولة.`);
        res.end();
    }
}
