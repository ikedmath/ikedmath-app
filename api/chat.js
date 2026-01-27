/* =======================================================
   IKED ENGINE v2026: THE FERRARI (NATIVE TOOLS) 🏎️
   Powered by: @google/generative-ai (Latest)
   Features: Function Calling, Auto-Parsing, Zero Latency
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
   1. TOOL DEFINITION (The Artist) 🎨
   ======================================================= */
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Call this function ONLY when the user explicitly asks to draw, plot, or visualize a function/geometry.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "Raw SVG code. Requirements: viewBox='-10 -10 20 20', Invert Y axis (y_svg = -y_math), stroke-width='0.15'."
                    }
                },
                required: ["svg_code"]
            }
        }
    ]
};

/* =======================================================
   2. SAFETY SETTINGS (No Braking) 🔓
   ======================================================= */
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
    // نستخدم الموديلات الداعمة للأدوات بكفاءة
    return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
}

/* =======================================================
   4. THE HANDLER (The Driver)
   ======================================================= */
export default async function handler(req, res) {
    // إعدادات الاتصال
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

        for (const modelName of models) {
            try {
                // إعداد الموديل مع الأدوات
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings,
                    generationConfig: { temperature: 0.6 }
                }, { apiVersion: 'v1beta' });

                const chat = model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: `
                                You are **IKED**, a Socratic Math Tutor (2 Bac SM).
                                
                                🛑 **CRITICAL INSTRUCTIONS:**
                                1. **Language:** Arabic Script ONLY (الدارجة بالحرف العربي). No Latin/Arabizi.
                                2. **Method:** Socratic. Guide the student, don't just solve. Ask questions first.
                                3. **Visuals:** - If user asks to DRAW -> Call 'render_math_graph'.
                                   - If text only -> Do NOT call the function.
                            ` }]
                        },
                        {
                            role: "model",
                            parts: [{ text: "مفهوم. أنا مستعد للمساعدة." }]
                        }
                    ]
                });

                const result = await chat.sendMessageStream(prompt);
                
                let functionCall = null;
                let isHeaderSent = false;
                const DIVIDER = "|||STREAM_DIVIDER|||";

                // === LOOP 1: الفحص الأولي (رسم أم نص؟) ===
                for await (const chunk of result.stream) {
                    // 1. فحص هل هناك استدعاء للدالة؟
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        functionCall = calls[0];
                        break; // وجدنا الرسم! نخرج فوراً للمعالجة
                    }

                    // 2. إذا كان نصاً، نرسل الهيدر الفارغ فوراً (لأننا تأكدنا أنه ليس رسماً)
                    const text = chunk.text();
                    if (text && !functionCall) {
                        if (!isHeaderSent) {
                            res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                            isHeaderSent = true;
                        }
                        res.write(text);
                    }
                }

                // === LOOP 2: معالجة الرسم (إذا وجد) ===
                if (functionCall) {
                    // A. نستخرج الكود
                    const svgCode = functionCall.args.svg_code;

                    // B. نرسل الهيدر مع الرسم (برمجياً - مضمون 100%)
                    const visualsJson = JSON.stringify({
                        visuals: { type: "SVG", code: svgCode },
                        gamification: { xp: 20 }
                    });
                    
                    if (!isHeaderSent) {
                        res.write(visualsJson + DIVIDER);
                        isHeaderSent = true;
                    }

                    // C. نطلب من الموديل الشرح
                    const result2 = await chat.sendMessageStream([
                        {
                            functionResponse: {
                                name: "render_math_graph",
                                response: { status: "success", content: "Graph displayed. Explain it now in Darija." }
                            }
                        }
                    ]);

                    // D. نبث الشرح
                    for await (const chunk2 of result2.stream) {
                        const text = chunk2.text();
                        if (text) res.write(text);
                    }
                } else if (!isHeaderSent) {
                    // حالة احتياطية (رد فارغ)
                    res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                }

                success = true;
                break; // نجحنا، نخرج من حلقة الموديلات

            } catch (innerError) {
                console.warn(`⚠️ Model ${modelName} skipped: ${innerError.message}`);
                // نمر للموديل التالي
            }
        }

        if (!success) throw new Error("All models failed.");
        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        // رسالة خطأ لطيفة
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ عذراً يا بطل، وقع خطأ بسيط. عاود سولني.`);
        res.end();
    }
}
