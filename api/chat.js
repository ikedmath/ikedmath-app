/* =======================================================
   IKED ENGINE v2026: THE ULTIMATE PERFORMANCE 🚀
   Architect: The World's Best Programmer
   Selected Models: Gemini 2.5 Family (Flash & Lite)
   Optimization: SVG Size Reduction + Fail-Fast Routing
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Security & Configuration 🔒
const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   STRATEGY: THE 2026 ROUTING LOGIC 🧠
   ختارينا ليك "الكريمة" ديال الموديلات من اللائحة ديالك
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    
    // واش السؤال فيه رسم أو حساب معقد؟
    const isComplex = [
        "رسم", "draw", "svg", "هندسة", "geometry", 
        "منحنى", "curve", "plot", "function", "دالة"
    ].some(k => q.includes(k));

    if (isComplex) {
        // 🔥 للخام الصعبة: كنخدمو 2.5 Flash هو اللول (سريع وذكي)
        // وموراه 2.0 Flash Lite Preview (حيت الـ Quota ديالو مرخوفة)
        return [
            "gemini-2.5-flash", 
            "gemini-2.0-flash-lite-preview-02-05", 
            "gemini-2.0-flash"
        ];
    }

    // 🔥 للأسئلة العادية: كنخدمو 2.5 Lite الجديد
    return [
        "gemini-2.5-flash-lite", 
        "gemini-2.0-flash-lite-preview-02-05", 
        "gemini-2.5-flash"
    ]; 
}

/* =======================================================
   LOGIC: FAIL-FAST GENERATION ⚡
   مكاينش "تسنى 40 ثانية". إلا الموديل مشغول، دوز للي بعدو فوراً.
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    let lastError = null;

    for (const modelName of modelList) {
        try {
            // جميع موديلات 2026 كتحتاج v1beta
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
            
            const result = await model.generateContentStream(fullPrompt);
            return result.stream; 

        } catch (error) {
            // نسجل الخطأ ولكن ما نحبسوش.. ندوزو للموديل التالي فـ 0.1 ثانية
            console.warn(`⚠️ [Skip] ${modelName} busy/error: ${error.message}`);
            lastError = error;
            continue;
        }
    }
    throw new Error("All 2026 models are busy. Please retry.");
}

/* =======================================================
   MAIN HANDLER
   ======================================================= */
export default async function handler(req, res) {
    // CORS Setup
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
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "No input" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        res.write(JSON.stringify({ error: "Server Config Error" }));
        res.end();
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // 🔥 SYSTEM PROMPT: SPEED & ACCURACY OPTIMIZED
        const systemInstruction = `
        🔴 IDENTITY: IKED, Expert Math Tutor (Morocco 2Bac SM).
        
        ⚡ RESPONSE PROTOCOL:
        1. FIRST: JSON Metadata inside <metadata> tags.
        2. SECOND: "|||STREAM_DIVIDER|||".
        3. THIRD: The Explanation.

        🎨 SVG DRAWING RULES (CRITICAL FOR SPEED):
        - **Invert Y-Axis:** Multiply all Y coordinates by -1 (Screen Y is down).
        - **Simplify:** Use minimal path points. Don't create huge files.
        - **ViewBox:** Use a standard logical viewBox (e.g., "-10 -10 20 20").
        - **Style:** Use stroke-width="2" and distinct colors.

        🧠 PEDAGOGY (SOCRATIC):
        - Guide the student step-by-step.
        - Do not dump the final answer immediately.
        - End with a follow-up question.

        --- FORMAT EXAMPLE ---
        <metadata>
        {"visuals": {"type": "SVG", "code": "<svg>...</svg>"}, "gamification": {"xp": 10, "badge": null}}
        </metadata>
        |||STREAM_DIVIDER|||
        Here is the graph analysis...
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Question]: ${prompt}`;

        // اختيار الموديلات
        const models = selectModelStrategy(prompt);
        // التنفيذ
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Buffering (صمام الأمان)
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                // واش كملنا الهيدر؟
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawMeta = parts[0];
                    const contentStart = parts.slice(1).join(DIVIDER);

                    try {
                        // تنظيف الـ JSON
                        let cleanJson = rawMeta
                            .replace(/<metadata>/g, "")
                            .replace(/<\/metadata>/g, "")
                            .replace(/```json/g, "")
                            .replace(/```/g, "")
                            .trim();

                        JSON.parse(cleanJson); // تأكد من الصحة
                        res.write(cleanJson + DIVIDER + contentStart);
                    } catch (e) {
                        // Fallback سريع
                        const fallbackMeta = JSON.stringify({ visuals: null, error: "Meta Error" });
                        res.write(fallbackMeta + DIVIDER + rawMeta + contentStart);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                // إرسال مباشر للشرح
                res.write(chunkText);
            }
        }

        // إرسال ما تبقى
        if (!isHeaderSent && buffer) {
            res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }

        res.end();

    } catch (error) {
        console.error("Handler Failure:", error);
        // رسالة الخطأ كتبان "برو"
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: Network traffic high. Switched to fallback nodes. Please retry.`);
        res.end();
    }
}
