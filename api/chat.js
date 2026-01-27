/* =======================================================
   IKED ENGINE v2026: FERRARI EDITION 🏎️
   Architecture: Native Tools + Safety Bypass + Two-Stage Stream
   Fixes: "Technical Error" on SVG generation
   Persona: Socratic Tutor (Arabic Script)
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. DEFINING THE TOOL (THE ARTIST) 🎨
   ======================================================= */
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Generates an SVG graph. Call this ONLY when the user EXPLICITLY asks to draw/plot/visualize something.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "The raw SVG code. Rules: viewBox='-10 -10 20 20', Invert Y (y_svg = -y_math), simple <path> elements."
                    }
                },
                required: ["svg_code"]
            }
        }
    ]
};

/* =======================================================
   2. SAFETY SETTINGS (DISABLE BRAKES) 🔓
   ======================================================= */
// ضروري جداً لتجنب "Technical Error" عند توليد أكواد SVG
const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

/* =======================================================
   3. MODEL STRATEGY
   ======================================================= */
function selectModelStrategy(query) {
    // نستخدم أقوى الموديلات للتعامل مع الأدوات
    return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
}

/* =======================================================
   4. THE HANDLER (ORCHESTRATOR)
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

    const { prompt, userProfile } = req.body;
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "Input required" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { res.write(JSON.stringify({ error: "API Key Error" })); res.end(); return; }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const models = selectModelStrategy(prompt);
        
        let streamRequestFailed = true;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool], 
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings, // ⚠️ إضافة إعدادات الأمان
                }, { apiVersion: 'v1beta' });

                const chat = model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: `
                                You are **IKED**, a Socratic Math Tutor (2 Bac SM).
                                
                                🛑 **LANGUAGE RULES:**
                                1. **Script:** Arabic Script ONLY (الدارجة المغربية بالحرف العربي). No Latin/Arabizi.
                                2. **Tone:** Warm, encouraging ("يا بطل"), professional.
                                
                                🧠 **METHODOLOGY (SOCRATIC):**
                                1. **Don't Solve Immediately:** Guide the student. Ask probing questions.
                                2. **Be Concise:** Short, impactful answers. No long lectures.
                                3. **Math:** Use LaTeX ($$) for everything.

                                🎨 **VISUALS:**
                                - If the user asks to **DRAW/PLOT**, call 'render_math_graph'.
                                - Otherwise, just reply with text.
                            ` }]
                        },
                        {
                            role: "model",
                            parts: [{ text: "مرحباً. أنا مستعد باش نعاونك فالرياضيات بطريقة ذكية وتفاعلية." }]
                        }
                    ]
                });

                // 🚀 STAGE 1: Send User Prompt & Listen for Intent
                const result = await chat.sendMessageStream(prompt);
                
                let toolCall = null;
                let hasSentHeader = false;
                const DIVIDER = "|||STREAM_DIVIDER|||";

                // نقرأ الستريم الأول: هل هو رسم أم نص؟
                for await (const chunk of result.stream) {
                    // فحص وجود استدعاء دالة
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        toolCall = calls[0];
                        // 🛑 توقف! وجدنا دالة. نخرج من الحلقة فوراً لمعالجتها.
                        // هذا يمنع تضارب الستريم
                        break; 
                    }

                    // إذا لم تكن دالة، فهو نص عادي. نرسله فوراً.
                    if (!toolCall) {
                        const text = chunk.text();
                        if (text) {
                            if (!hasSentHeader) {
                                res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                                hasSentHeader = true;
                            }
                            res.write(text);
                        }
                    }
                }

                // 🚀 STAGE 2: Handle Tool Execution (If any)
                if (toolCall) {
                    // 1. استخراج كود SVG
                    const svgCode = toolCall.args.svg_code;

                    // 2. إرسال الهيدر للعميل (الرسم وصل!)
                    const visualsJson = JSON.stringify({
                        visuals: {
                            type: "SVG",
                            code: svgCode
                        },
                        gamification: { xp: 20 }
                    });
                    
                    if (!hasSentHeader) {
                        res.write(visualsJson + DIVIDER);
                        hasSentHeader = true;
                    }

                    // 3. إرجاع النتيجة للموديل ليقوم بالشرح
                    const result2 = await chat.sendMessageStream([
                        {
                            functionResponse: {
                                name: "render_math_graph",
                                response: { status: "success", content: "Graph rendered successfully. Now explain it simply in Darija." }
                            }
                        }
                    ]);

                    // 4. بث الشرح
                    for await (const chunk2 of result2.stream) {
                        const text2 = chunk2.text();
                        if (text2) res.write(text2);
                    }
                } else if (!hasSentHeader) {
                    // حالة نادرة: رد فارغ
                    res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                }

                streamRequestFailed = false;
                break; // نجحنا

            } catch (innerError) {
                console.warn(`⚠️ [Model Fail] ${modelName}:`, innerError.message);
                // محاولة مع الموديل التالي
            }
        }

        if (streamRequestFailed) {
            throw new Error("All models failed.");
        }

        res.end();

    } catch (error) {
        console.error("Critical Handler Error:", error);
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ عذراً، كاين ضغط على السيرفر. حاول مرة أخرى.`);
        res.end();
    }
}
