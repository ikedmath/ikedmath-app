/* =======================================================
   IKED ENGINE v7.0: HYBRID STREAMING CORE 🌊⚡
   Architect: The World's Best Programmer
   Features:
   - Real-Time Streaming (Time-to-First-Token < 0.5s)
   - Dynamic Model Routing (Lite vs 2.5 Flash)
   - Dual-Stream Protocol (Metadata ||| Explanation)
   ======================================================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // 1. إعدادات الشبكة للتدفق (Streaming Headers)
    // هادي ضرورية باش الميساج يوصل مقطع (Chunked) ماشي دقة وحدة
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // للسماح للفرونت بالاتصال

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
           2. THE SMART ROUTER (توزيع المهام الذكي) 🧠
           كنحللو السؤال باش نعرفو شمن "عقل" نخدمو
           ======================================================= */
        // كلمات مفتاحية تدل على التعقيد (تستدعي الموديل الذكي 2.5)
        const complexKeywords = /برهان|تحليل|دالة|log|ln|exp|integral|تكامل|complex|عقدية|هندسة|physique|mécanique/i;
        const isComplex = complexKeywords.test(prompt);
        
        // الاختيار الاستراتيجي للموديلات من قائمتك
        // 1. للأسئلة المعقدة: gemini-2.5-flash (الجديد والذكي جداً)
        // 2. للأسئلة العادية: gemini-2.0-flash-lite-preview-02-05 (سريع ومجاني)
        const modelName = isComplex 
            ? "gemini-2.5-flash" 
            : "gemini-2.0-flash-lite-preview-02-05";

        const model = genAI.getGenerativeModel({ model: modelName });

        /* =======================================================
           3. THE HYBRID PROMPT (البروتوكول الهجين) 📜
           هنا كنفرضو عليه يقسم الجواب لجزئين بفاصل سري
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, Expert Math Tutor (2 Bac SM/PC - Morocco).
        
        ⚡ PROTOCOL:
        You MUST stream the response in TWO parts separated by exactly "|||STREAM_DIVIDER|||".
        
        --- PART 1: METADATA (Valid JSON Only) ---
        {
            "visuals": { 
                "type": "SVG", 
                "code": "Generate SVG code here IF needed (e.g. function plot, unit circle). Else null." 
            },
            "gamification": { 
                "xp": integer (10-50), 
                "badge": "Name of badge if earned (e.g. 'Logical Mind') OR null" 
            },
            "analogy": "A very short, concrete Darija analogy (e.g. 'بحال الميزان فالسوق')."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: EXPLANATION (Streaming Text) ---
        Start teaching here.
        - Use simple Darija + French terms (Biof).
        - Use LaTeX for math: $$ x^2 $$.
        - Be encouraging and clear.
        - Do NOT include markdown code blocks for the whole text, just write naturally.
        `;

        // دمج البروفايل باش يعرف المستوى
        const studentLevel = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Student: ${studentLevel}]\n[Question]: ${prompt}`;

        /* =======================================================
           4. START STREAMING 🌊 (التنفيذ)
           ======================================================= */
        const result = await model.generateContentStream(fullPrompt);

        // حلقة قراءة التدفق وإرساله للفرونت فوراً
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText); // إرسال القطعة فور وصولها
        }

        res.end(); // إنهاء الاتصال بنجاح

    } catch (error) {
        console.error("Stream Error:", error);
        // في حالة الخطأ، نرسل رسالة خطأ للعميل ليقرأها
        res.write(JSON.stringify({ error: "System Error", details: error.message }));
        res.end();
    }
}
