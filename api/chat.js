/* =======================================================
   IKED ENGINE v2026: NATIVE TOOLS EDITION 🛠️⚡
   Architecture: Gemini Native Function Calling
   Benefits: Zero Latency Text, 100% Valid SVGs
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
            description: "Generates an SVG graph for functions, geometry, or plots. Call this whenever the user asks for a visual representation.",
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
   2. MODEL STRATEGY
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    // نستخدم الموديلات القوية للتعامل مع الأدوات
    return ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"];
}

/* =======================================================
   3. THE HANDLER (ORCHESTRATOR)
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
        
        // سنحاول مع الموديل الأول، وإذا فشل نمر للتالي
        let streamRequestFailed = true;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool], // تفعيل الأدوات
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                }, { apiVersion: 'v1beta' });

                const chat = model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: `
                                You are **IKED**, a Socratic Math Tutor (2 Bac SM).
                                
                                🛑 **RULES:**
                                1. **Language:** Arabic Script ONLY (الدارجة المغربية بالحرف العربي). No Latin script.
                                2. **Method:** Socratic. Ask questions, guide, don't just solve.
                                3. **Math:** Use LaTeX ($$).
                                4. **Visuals:** If a graph is needed, CALL the 'render_math_graph' function. DO NOT write JSON text manually.
                            ` }]
                        },
                        {
                            role: "model",
                            parts: [{ text: "مفهوم. أنا مستعد للمساعدة بالدارجة والرياضيات." }]
                        }
                    ]
                });

                // 🚀 Step 1: Send User Prompt
                const result = await chat.sendMessageStream(prompt);
                
                let functionCallFound = null;
                let functionArgs = "";
                let hasSentHeader = false;
                const DIVIDER = "|||STREAM_DIVIDER|||";

                // معالجة الستريم الأول (قد يحتوي على نص أو طلب دالة)
                for await (const chunk of result.stream) {
                    // A. هل هناك طلب دالة؟
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        const call = calls[0];
                        if (call.name === "render_math_graph") {
                            // تجميع الأرغمنتات (في حال كانت مقسمة)
                            // Gemini SDK usually gives full args in one go or handles it, 
                            // but for safety we grab the args object directly from the chunk if available.
                            // Note: In stream, we might need to rely on the final aggregation.
                            // For simplicity with JS SDK stream, we treat the FIRST function call signal as the mode switch.
                            functionCallFound = call;
                        }
                    }

                    // B. هل هناك نص؟ (فقط إذا لم نكن في وضع الرسم بعد)
                    if (!functionCallFound) {
                        const text = chunk.text();
                        if (text) {
                            // هذه أول كلمة نصية -> إذن لا يوجد رسم -> أرسل الهيدر الفارغ فوراً
                            if (!hasSentHeader) {
                                res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                                hasSentHeader = true;
                            }
                            res.write(text);
                        }
                    }
                }

                // 🚀 Step 2: Handle Function Call (If any)
                if (functionCallFound) {
                    // 1. استخراج كود SVG
                    const svgCode = functionCallFound.args.svg_code;

                    // 2. إرسال الهيدر للعميل (مع الرسم)
                    const visualsJson = JSON.stringify({
                        visuals: {
                            type: "SVG",
                            code: svgCode
                        },
                        gamification: { xp: 15 }
                    });
                    
                    if (!hasSentHeader) {
                        res.write(visualsJson + DIVIDER);
                        hasSentHeader = true;
                    }

                    // 3. إخبار الموديل أن الرسم تم، وطلب الشرح
                    const result2 = await chat.sendMessageStream([
                        {
                            functionResponse: {
                                name: "render_math_graph",
                                response: { status: "success", message: "Graph rendered for student." }
                            }
                        }
                    ]);

                    // 4. بث الشرح (Explanation Stream)
                    for await (const chunk2 of result2.stream) {
                        const text2 = chunk2.text();
                        if (text2) res.write(text2);
                    }
                } else if (!hasSentHeader) {
                    // حالة نادرة: الموديل لم يقل شيئاً ولم يرسم (فارغ)
                    // نرسل هيدر فارغ لإغلاق الطلب بأمان
                    res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                }

                streamRequestFailed = false;
                break; // نجحنا، نخرج من حلقة الموديلات

            } catch (innerError) {
                console.warn(`⚠️ [Model Fail] ${modelName}:`, innerError.message);
                if (innerError.message.includes("429")) {
                    await new Promise(r => setTimeout(r, 1000));
                }
                // Continue to next model
            }
        }

        if (streamRequestFailed) {
            throw new Error("All models failed.");
        }

        res.end();

    } catch (error) {
        console.error("Critical Handler Error:", error);
        // Fallback response
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ عذراً يا بطل، وقع خطأ تقني بسيط. عاود سولني.`);
        res.end();
    }
}
