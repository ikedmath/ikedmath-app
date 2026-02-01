/* =======================================================
   IKED ENGINE v2026: THE SURVIVOR EDITION 💎
   Target: Working 2.0 Models on Free Tier
   Strategy: Flash Stable -> Lite Snapshot -> Experimental
   ======================================================= */

export const config = {
    maxDuration: 60, // 60 Seconds Timeout
};

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

// 🛑 اللائحة المختارة بعناية من قائمتك (الأكثر احتمالاً للعمل)
const CANDIDATE_MODELS = [
    "gemini-2.0-flash",                     // 1. المحاولة الأولى: الموديل القياسي القوي
    "gemini-2.0-flash-lite-preview-02-05", // 2. المحاولة الثانية: النسخة الخفيفة المحدثة
    "gemini-exp-1206"                       // 3. المحاولة الثالثة: الموديل التجريبي (الجوكر)
];

// الأداة: استخراج المعادلة فقط (Backend Logic)
const mathPlotTool = {
    functionDeclarations: [
        {
            name: "plot_function",
            description: "Extracts the mathematical expression to be plotted by the client engine. Call this whenever the user asks to draw a function.",
            parameters: {
                type: "OBJECT",
                properties: {
                    expression: { 
                        type: "STRING", 
                        description: "The math expression in JavaScript format (e.g. 'x**2', 'Math.sin(x)', 'x + 5'). Use 'x' as the variable." 
                    },
                    xMin: { type: "NUMBER", description: "Start of x domain (default -10)" },
                    xMax: { type: "NUMBER", description: "End of x domain (default 10)" }
                },
                required: ["expression"]
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
    // 1. إعدادات CORS
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
        res.write(JSON.stringify({ type: "error", message: "MISSING_API_KEY" }) + "\n"); 
        res.end(); return; 
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const userName = userProfile?.name || "Student";
        
        let success = false;
        let lastError = null;

        // 🛑 Loop of Survival: تجربة الموديلات بالترتيب
        for (const modelName of CANDIDATE_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [mathPlotTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings,
                }, { apiVersion: 'v1beta' });

                const systemInstruction = `
                    You are **IKED**, an elite Math Tutor for 2 Bac SM (Morocco).
                    Current User: ${userName}.
                    
                    🚨 PROTOCOL (HYBRID ENGINE):
                    1. **Drawing Task:** If asked to draw/plot, extract the formula and CALL 'plot_function'. DO NOT generate SVG or ASCII art.
                    2. **Example:** "Draw x squared" -> Call plot_function({ expression: "x**2" }).
                    3. **No Code:** Do not write python code or markdown blocks.
                    4. **Lang:** Moroccan Darija (Arabic script).
                `;

                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: systemInstruction }] },
                        { role: "model", parts: [{ text: "مفهوم. سأقوم باستخراج المعادلات ليرسمها المحرك." }] }
                    ]
                });

                let messageParts = [];
                if (prompt) messageParts.push({ text: prompt });
                if (image) {
                    const base64Data = image.split(',')[1] || image;
                    messageParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
                }

                const result = await chat.sendMessageStream(messageParts);
                
                for await (const chunk of result.stream) {
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        const call = calls[0];
                        if (call.name === "plot_function") {
                            // إرسال أمر الرسم للمحرك (Frontend)
                            res.write(JSON.stringify({
                                type: "command",
                                cmd: "PLOT",
                                data: call.args,
                                gamification: { xp: 20 }
                            }) + "\n");

                            // إخبار الموديل بالنجاح ليكمل الشرح
                            const result2 = await chat.sendMessageStream([{
                                functionResponse: {
                                    name: "plot_function",
                                    response: { status: "success", content: "Command sent to rendering engine." }
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

                success = true;
                break; // الموديل خدم، نخرج من الحلقة

            } catch (innerError) {
                lastError = innerError;
                // إذا فشل الموديل (404 أو 429)، نسجلو الخطأ وندوزو للي موراه
                console.warn(`Model ${modelName} failed, switching to next candidate...`);
                continue; 
            }
        }

        if (!success) {
            // إذا فشلوا كاملين، نرجعو رسالة واضحة
            throw new Error(`All High-End models failed. Last Error: ${lastError?.message}`);
        }

        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        res.write(JSON.stringify({ type: "error", message: `System Error: ${error.message}` }) + "\n");
        res.end();
    }
}
