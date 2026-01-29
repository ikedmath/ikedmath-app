/* =======================================================
   IKED ENGINE v2026: STABLE CORE (NO HALLUCINATIONS) 💎
   Model: gemini-2.0-flash (The smartest & most stable)
   Fixes: Anti-SQLAlchemy, Anti-Echo, Extended Timeout
   ======================================================= */

// 🔥 هاد السطر ضروري باش Vercel يصبر 60 ثانية فالرسم وما يعطيش Error
export const config = {
    maxDuration: 60,
};

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

// تعريف أداة الرسم بدقة باش يفهمها الموديل دغيا
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Generates a math graph SVG. Use this for ANY visual request (plot, draw, graph).",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "SVG code only. viewBox='-10 -10 20 20'. No <script>. No markdown."
                    }
                },
                required: ["svg_code"]
            }
        }
    ]
};

const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

export default async function handler(req, res) {
    // إعدادات CORS
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, userProfile, image } = req.body;
    
    if (!prompt && !image) {
        res.write(JSON.stringify({ type: "error", message: "Input required" }) + "\n");
        res.end(); return;
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { 
        res.write(JSON.stringify({ type: "error", message: "API Key Error" }) + "\n"); 
        res.end(); return; 
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // 🛑 التغيير الحاسم: كنخدمو غير بـ gemini-2.0-flash
        // حيت هو الوحيد اللي ذكي ومستقر من القائمة ديالك
        // الموديلات الأخرى (lite/preview) هي اللي كتعطي SQLAlchemy
        const modelName = "gemini-2.0-flash";

        const userName = userProfile?.name || "Student";
        const userXP = userProfile?.xp || 0;

        const model = genAI.getGenerativeModel({ 
            model: modelName,
            tools: [renderGraphTool],
            toolConfig: { functionCallingConfig: { mode: "AUTO" } },
            safetySettings: safetySettings,
        }, { apiVersion: 'v1beta' });

        // 🛑 تعليمات صارمة جداً باش ما يعاودش يدوخ
        const systemInstruction = `
            You are **IKED**, an elite Math Tutor for 2 Bac SM (Morocco).
            Current User: ${userName}.
            
            🛑 RULES:
            1. **Identity:** You are a helpful tutor. NEVER output random definitions (like SQLAlchemy or Python tutorials).
            2. **Context:** The user prompt might contain "[HISTORY]". Do NOT repeat it in your output. Read it silently.
            3. **Drawing:** If asked to draw/plot, IMMEDIATELY call 'render_math_graph'.
            4. **No Code:** Do NOT write python code blocks.
            5. **Language:** Moroccan Darija (Arabic script).
        `;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemInstruction }] },
                { role: "model", parts: [{ text: "فهمت. أنا IKED، مستعد نعاونك فالماط بالدارجة." }] }
            ]
        });

        let messageParts = [];
        if (prompt) messageParts.push({ text: prompt });
        
        if (image) {
            const base64Data = image.split(',')[1] || image;
            messageParts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                }
            });
        }

        const result = await chat.sendMessageStream(messageParts);
        
        for await (const chunk of result.stream) {
            const calls = chunk.functionCalls();
            if (calls && calls.length > 0) {
                const call = calls[0];
                if (call.name === "render_math_graph") {
                    const svgCode = call.args.svg_code;
                    
                    // إرسال الرسم
                    res.write(JSON.stringify({
                        type: "visual",
                        data: { type: "SVG", code: svgCode },
                        gamification: { xp: 50 }
                    }) + "\n");

                    // إخبار الموديل بأن الرسم تم بنجاح ليكمل الشرح
                    const result2 = await chat.sendMessageStream([{
                        functionResponse: {
                            name: "render_math_graph",
                            response: { status: "success", content: "Graph rendered." }
                        }
                    }]);

                    for await (const chunk2 of result2.stream) {
                        const text2 = chunk2.text();
                        if (text2) res.write(JSON.stringify({ type: "text", content: text2 }) + "\n");
                    }
                }
            } else {
                const text = chunk.text();
                if (text) res.write(JSON.stringify({ type: "text", content: text }) + "\n");
            }
        }

        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        // رسالة خطأ واضحة
        res.write(JSON.stringify({ type: "error", message: "تعذر الاتصال بالموديل. حاول مجدداً." }) + "\n");
        res.end();
    }
}
