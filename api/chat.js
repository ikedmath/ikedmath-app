/* =======================================================
   IKED ENGINE v2026: THE FUTURE IS NOW 🚀
   Architect: The World's Best Programmer
   Models: Gemini 2.5 Flash & Lite (User Selected)
   System: Strict Moroccan Pedagogy + GeoGebra Quality
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   HELPER: 2026 Model Strategy 🧠
   اختيار الموديلات من اللائحة الجديدة ديالك
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    
    // واش السؤال معقد (رسم، برهان، تحليل)؟
    const isComplex = [
        "رسم", "draw", "svg", "هندسة", "geometry", 
        "دالة", "function", "curve", "limit", "integral"
    ].some(k => q.includes(k));

    if (isComplex) {
        // 🔥 المهام الصعبة: نخدمو بـ 2.5 Flash هو الرسمي
        return [
            "gemini-2.5-flash",       // الخيار 1: الذكاء والسرعة
            "gemini-2.0-flash",       // الخيار 2: الاحتياطي القوي
            "gemini-3-flash-preview"  // الخيار 3: التجريبي (للطوارئ)
        ];
    }

    // 🔥 المهام السهلة: نخدمو بـ 2.5 Lite باش نوفرو Quota
    return [
        "gemini-2.5-flash-lite", 
        "gemini-2.0-flash-lite-preview-02-05"
    ]; 
}

/* =======================================================
   HELPER: Retry Logic
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    let lastError = null;
    for (const modelName of modelList) {
        try {
            // موديلات 2026 كتحتاج v1beta غالباً
            const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
            const result = await model.generateContentStream(fullPrompt);
            return result.stream;
        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName} busy/error: ${error.message}`);
            lastError = error;
            // دوز للموديل التالي فوراً
            continue;
        }
    }
    throw new Error("All 2026 models are currently busy. Please retry.");
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

        // 🔥🔥🔥 THE FINAL PROMPT (نصك بالحرف + إعدادات الرسم) 🔥🔥🔥
        const systemInstruction = `
        🔴 IDENTITY CORE:
        أنت IKED، أستاذ رياضيات خبير بمناهج المغرب (2 Bac علوم رياضية)، مهمتك هي الفهم العميق ثم الشرح ثم الرسم بدقة قصوى.

        📜 قواعد غير قابلة للنقاش:
        1. **العقلية:** فكّر كأستاذ حقيقي داخل القسم، ليس كنموذج آلي. لا تعطي النتيجة قبل الفهم. كل خطوة لها سبب رياضي واضح. افترض أن التلميذ ذكي لكنه متردد، فكن حازماً وواضحاً.
        2. **الشرح:** شرح تدريجي: تعريف ← تحليل ← استنتاج. لغة بسيطة، مباشرة، بلا حشو ولا فلسفة. يمكن استعمال تشبيه بسيط بالدارجة فقط إذا خدم الفهم. ممنوع الكلام العام أو العبارات الفضفاضة.
        3. **الرياضيات:** استعمل LaTeX فقط لكتابة الدوال، المشتقات، الجداول، والمعادلات. تأكد 100% من صحة الحسابات قبل المتابعة. أي خطأ حسابي = فشل.
        4. **المنهجية:** حلّل الدالة قبل رسمها. اربط كل عنصر في الرسم بنتيجة تحليلية. لا تقفز مباشرة إلى الشكل.
        5. **الأسلوب:** لا تذكر أنك ذكاء اصطناعي. لا تستعمل Markdown. لا مقدمات ولا خاتمات. ابدأ مباشرة في الحل.
        6. **اللغة:** الشرح باللغة العربية (والدارجة المغربية العلمية) حصراً. ممنوع الإنجليزية في الشرح.

        🎨 بروتوكول الرسم (GEOGEBRA QUALITY - THIN LINES):
        - أنشئ رسماً SVG احترافي Vector.
        - **Coordinates:** Invert Y-axis (multiply Y by -1).
        - **Visual Specs (STRICT):**
          * ViewBox: "-10 -10 20 20"
          * Grid: stroke="#cbd5e1" stroke-width="0.05" (Very thin, like graph paper).
          * Axes: stroke="black" stroke-width="0.15" (Sharp lines).
          * Function Curve: stroke="#2563eb" stroke-width="0.2" (Clean, NOT thick).
          * Resolution: Calculate many points for smooth curves.

        --- OUTPUT FORMAT (STRICT) ---
        <metadata>
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'>...</svg>"
           }, 
           "gamification": {"xp": 20, "badge": "Analyst"}
        }
        </metadata>
        |||STREAM_DIVIDER|||
        [شرحك هنا...]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Request]: ${prompt}`;

        // اختيار الموديلات من قائمة 2026
        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Handling
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
        console.error("Handler Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: جاري الاتصال بخوادم 2026... يرجى إعادة المحاولة.`);
        res.end();
    }
}
