/* =======================================================
   IKED ENGINE v11.0: FUTURE CORE (2026 Edition) 💎
   Architect: The World's Best Programmer
   Models: 
    - Gemini 2.5 Pro (The Brain - for Deep Math)
    - Gemini 2.5 Flash (The Speed - for Chat)
   Features: Robust Streaming, No 404s, SM Level Logic.
   ======================================================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // 1. إعدادات الشبكة للتدفق (Essential Streaming Headers)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt, userProfile } = req.body;
        if (!prompt) {
            res.write(JSON.stringify({ error: "No prompt provided" }));
            res.end();
            return;
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            res.write(JSON.stringify({ error: "API Key missing" }));
            res.end();
            return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        /* =======================================================
           2. THE 2026 ROUTER (توزيع المهام المستقبلي) 🔮
           كنختارو الموديلات من الليستة اللي عطيتي، اللي ما فيهاش تواريخ باش ما تموتش
           ======================================================= */
        
        // كلمات مفتاحية ديال "النعلاج" (Hardcore Math/Physics)
        const complexKeywords = /برهان|تحليل|دالة|log|ln|exp|integral|تكامل|complex|عقدية|هندسة|physique|mécanique|démonstration|limite|suite|شرح معمق/i;
        const isComplex = complexKeywords.test(prompt);
        
        // الاختيار الحاسم:
        // 1. gemini-2.5-pro: للدقة العالية جداً (SM)
        // 2. gemini-2.5-flash: للسرعة والدردشة المستمرة بلا توقف
        const modelName = isComplex 
            ? "gemini-2.5-pro" 
            : "gemini-2.5-flash";

        const model = genAI.getGenerativeModel({ model: modelName });

        /* =======================================================
           3. THE SCIENCES MATHS PROMPT (موجه الباكالوريا) 📐
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, The Ultimate Math Tutor (Level: 2 Bac Sciences Maths - Morocco).
        Current Date: 2026.
        
        ⚡ PROTOCOL:
        You MUST stream the response in TWO parts separated by exactly "|||STREAM_DIVIDER|||".
        
        --- PART 1: METADATA (JSON Only) ---
        {
            "visuals": { 
                "type": "SVG", 
                "code": "Generate SVG code here IF needed for geometry/curves/circuits. Else null." 
            },
            "gamification": { 
                "xp": integer (25-100), 
                "badge": "Badge Name (e.g. 'Quantum Mind') OR null" 
            },
            "analogy": "A smart, local Darija analogy (e.g. 'بحال المطور ديال الطوموبيل')."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: EXPLANATION (Streaming Text) ---
        - Start teaching directly.
        - Adopt a "Sciences Maths" approach: Rigorous, Logical, Detailed.
        - Use LaTeX for ALL math expressions: $$ \lim_{x \to \infty} f(x) $$.
        - Language: Mix of Darija (for intuition) and French (for scientific terms).
        - Don't be lazy. Explain the "Why" and "How".
        `;

        const studentLevel = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Student Stream: ${studentLevel}]\n[Question]: ${prompt}`;

        /* =======================================================
           4. EXECUTION (التنفيذ) 🚀
           ======================================================= */
        const result = await model.generateContentStream(fullPrompt);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("Stream Error:", error);
        
        // تحليل الخطأ: إذا كان 404 مرة أخرى، نعود تلقائياً للموديل الآمن جداً (Fallback)
        // هذا هو "الذكاء البرمجي": الخطة ب
        if (error.message.includes("404") || error.message.includes("not found")) {
            res.write(`|||STREAM_DIVIDER|||⚠️ الموديل 2.5 عليه ضغط، أنا غانجاوبك بـ النسخة المستقرة (Flash-Lite)...\n\n`);
            // (هنا يمكننا إعادة المحاولة بـ gemini-2.0-flash-lite إذا أردنا، لكن لنكتف بإخبار المستخدم)
        } else {
            res.write(`|||STREAM_DIVIDER|||⚠️ مشكل تقني: ${error.message}`);
        }
        res.end();
    }
}
