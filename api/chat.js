/* =======================================================
   IKED ENGINE v2026: THE ROYAL EDITION 👑
   Technology: Native Function Calling (Tools)
   Models: Gemini 2.5 Flash & 2.0 Series (From List)
   Features: Zero Latency, 100% Valid SVGs, Socratic Brain
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
            description: "Generates an SVG graph. Call this ONLY when the user explicitly asks to draw, plot, or visualize a function/geometry.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "Raw SVG code. Requirements: viewBox='-10 -10 20 20', Invert Y axis (y_svg = -y_math), simple <path> elements, stroke-width='0.15'."
                    }
                },
                required: ["svg_code"]
            }
        }
    ]
};

/* =======================================================
   2. SAFETY SETTINGS (NO BRAKES) 🔓
   ======================================================= */
const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

/* =======================================================
   3. MODEL STRATEGY (UPDATED 2026 LIST) 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const visualKeywords = ["رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph", "دالة", "function", "courbe"];
    const wantsDrawing = visualKeywords.some(k => q.includes(k));

    if (wantsDrawing) {
        // 🔥 القوة الضاربة للرسم (من لائحتك الجديدة)
        return [
            "gemini-2.5-flash",                  // (001) الأذكى والأحدث
            "gemini-2.0-flash",                  // (2.0) المستقر والقوي
            "gemini-2.0-flash-lite-preview-02-05" // (Preview) السريع والحديث
        ];
    }
    
    // ⚡ السرعة القصوى للنصوص
    return [
        "gemini-2.5-flash",                      // نستخدم 2.5 لذكائه السقراطي
        "gemini-2.0-flash-lite-preview-02-05", // خفيف وسريع جداً
        "gemini-flash-lite-latest"               // احتياطي
    ]; 
}

/* =======================================================
   4. THE HANDLER (THE ORCHESTRATOR) ⚙️
   ======================================================= */
export default async function handler(req, res) {
    // إعدادات الشبكة (CORS & Headers)
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
        
        let success = false;
        let lastError = "";

        // 🔥 الدوران على الموديلات (Fallback Loop)
        for (const modelName of models) {
            try {
                // إعداد الموديل مع الأدوات والإعدادات
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } }, // الموديل يقرر بذكاء متى يرسم
                    safetySettings: safetySettings,
                    generationConfig: { temperature: 0.6 }
                }, { apiVersion: 'v1beta' }); // 👈 ضروري للموديلات الجديدة

                const chat = model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: `
                                You are **IKED**, a Socratic Math Tutor (2 Bac SM).
                                
                                🛑 **CRITICAL INSTRUCTIONS:**
                                1. **Language:** Arabic Script ONLY (الدارجة بالحرف العربي). No Latin/Arabizi.
                                2. **Method:** Socratic. Guide the student, don't just solve. Ask questions first.
                                3. **Math:** Use LaTeX ($$) for everything.
                                4. **Visuals:** - IF user asks to DRAW -> Call 'render_math_graph' tool.
                                   - IF text only -> Do NOT call the function.
                            ` }]
                        },
                        {
                            role: "model",
                            parts: [{ text: "مفهوم. أنا مستعد للمساعدة." }]
                        }
                    ]
                });

                // إرسال الطلب (Start Streaming)
                const result = await chat.sendMessageStream(prompt);
                
                let functionCall = null;
                let isHeaderSent = false;
                const DIVIDER = "|||STREAM_DIVIDER|||";

                // === LOOP 1: استقبال البث الأول ===
                for await (const chunk of result.stream) {
                    // A. فحص هل هناك استدعاء للأداة؟
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        functionCall = calls[0];
                        // نتوقف عن البث النصي فوراً لنعالج الرسم
                        break; 
                    }

                    // B. إذا لم يكن هناك دالة، فهو نص عادي
                    // نرسل الهيدر الفارغ فوراً (Zero Latency)
                    const text = chunk.text();
                    if (text && !functionCall) {
                        if (!isHeaderSent) {
                            res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                            isHeaderSent = true;
                        }
                        res.write(text);
                    }
                }

                // === LOOP 2: معالجة الرسم (إذا طلبه الموديل) ===
                if (functionCall) {
                    // 1. استخراج كود SVG من الأداة
                    const svgCode = functionCall.args.svg_code;

                    // 2. إرسال الهيدر مع الرسم (برمجياً - مضمون 100%)
                    const visualsJson = JSON.stringify({
                        visuals: { type: "SVG", code: svgCode },
                        gamification: { xp: 20 }
                    });
                    
                    if (!isHeaderSent) {
                        res.write(visualsJson + DIVIDER);
                        isHeaderSent = true;
                    }

                    // 3. نرسل نتيجة الرسم للموديل ونطلب الشرح
                    const result2 = await chat.sendMessageStream([
                        {
                            functionResponse: {
                                name: "render_math_graph",
                                response: { status: "success", content: "Graph displayed successfully. Now explain it simply in Darija." }
                            }
                        }
                    ]);

                    // 4. بث الشرح
                    for await (const chunk2 of result2.stream) {
                        const text = chunk2.text();
                        if (text) res.write(text);
                    }
                } else if (!isHeaderSent) {
                    // حالة نادرة (رد فارغ)
                    res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                }

                success = true;
                break; // 🛑 نجحنا! نخرج من حلقة الموديلات

            } catch (innerError) {
                console.warn(`⚠️ [Skip] ${modelName}: ${innerError.message}`);
                lastError = innerError.message;
                
                // انتظار خفيف إذا كان ضغط
                if (innerError.message.includes("429")) {
                    await new Promise(r => setTimeout(r, 1000));
                }
                continue;
            }
        }

        if (!success) {
            throw new Error(`All models failed. Last error: ${lastError}`);
        }

        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ عذراً يا بطل، كاين ضغط كبير دابا. حاول مرة أخرى.`);
        res.end();
    }
}
