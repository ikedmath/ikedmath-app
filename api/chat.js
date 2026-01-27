/* =======================================================
   IKED ENGINE v2026: ROYAL EDITION v3 👑🛡️
   Features: 
   1. Smart Buffering (Fixes the "Header Trap")
   2. Anti-XSS Prompts (Security)
   3. Enhanced Precision Instructions (Math Accuracy)
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. DEFINING THE TOOL 🎨
   ======================================================= */
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Generates an SVG graph. Call this ONLY when user asks to visualize.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "Clean SVG code. viewBox='-10 -10 20 20'. Y-axis inverted. NO script tags. Use precise coordinates."
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

/* =======================================================
   2. STRATEGY & HANDLER
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const visualKeywords = ["رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph", "دالة"];
    
    if (visualKeywords.some(k => q.includes(k))) {
        return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite-preview-02-05"];
    }
    return ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-lite-latest"]; 
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
    const { prompt } = req.body;
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "Input required" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { res.write(JSON.stringify({ error: "API Key Error" })); res.end(); return; }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const models = selectModelStrategy(prompt);
        let success = false;

        for (const modelName of models) {
            try {
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
                                1. **Protocol:** If you need to draw, call 'render_math_graph' **IMMEDIATELY** at the start of your response. Do not chat before calling the tool.
                                2. **Math Accuracy:** When generating SVG, calculate key points (roots, vertex) precisely. Do not guess.
                                3. **Security:** NEVER include <script> tags or event handlers (onclick) in SVG.
                                4. **Language:** Arabic Script ONLY (الدارجة).
                            ` }]
                        },
                        { role: "model", parts: [{ text: "مفهوم." }] }
                    ]
                });

                const result = await chat.sendMessageStream(prompt);
                
                let functionCall = null;
                let isHeaderSent = false;
                const DIVIDER = "|||STREAM_DIVIDER|||";
                
                // 🛡️ Smart Buffer: نخزن النص قليلاً لنرى هل هناك رسم قادم
                let textBuffer = "";
                const BUFFER_LIMIT = 100; // ننتظر حوالي 100 حرف قبل الحكم

                // === LOOP 1: Streaming & Buffering ===
                for await (const chunk of result.stream) {
                    // 1. Check for Tool Call
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        functionCall = calls[0];
                        break; // وجدنا الرسم! نوقف تجميع النص ونمر للتنفيذ
                    }

                    // 2. Handle Text
                    const text = chunk.text();
                    if (text && !functionCall) {
                        textBuffer += text;

                        // إذا فات النص الحد المسموح ومازال ماكاين رسم، صافي كنعتبروه نص عادي
                        if (!isHeaderSent && textBuffer.length > BUFFER_LIMIT) {
                            res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                            isHeaderSent = true;
                            res.write(textBuffer); // نطلقو داكشي اللي حبسنا
                            textBuffer = "";       // نخويو الكاس
                        } else if (isHeaderSent) {
                            // إذا الهيدر ديجا مشى، غير صيفط ديريكت
                            res.write(text);
                        }
                    }
                }

                // === LOOP 2: Handling the Result ===
                if (functionCall) {
                    // A. نرسل الهيدر مع الرسم
                    const svgCode = functionCall.args.svg_code;
                    const visualsJson = JSON.stringify({
                        visuals: { type: "SVG", code: svgCode },
                        gamification: { xp: 20 }
                    });
                    
                    if (!isHeaderSent) {
                        res.write(visualsJson + DIVIDER);
                        isHeaderSent = true;
                    }

                    // B. نرسل النص اللي كان مخبي (مثلاً: "واخا، ها هو الرسم..")
                    if (textBuffer.length > 0) {
                        res.write(textBuffer);
                    }

                    // C. نطلب الشرح
                    const result2 = await chat.sendMessageStream([{
                        functionResponse: {
                            name: "render_math_graph",
                            response: { status: "success", content: "Graph rendered. Explain it now." }
                        }
                    }]);

                    for await (const chunk2 of result2.stream) {
                        const text = chunk2.text();
                        if (text) res.write(text);
                    }

                } else {
                    // حالة: كمل الستريم كامل وماكاين لا رسم لا والو، أو النص كان قصير بزاف
                    if (!isHeaderSent) {
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                        isHeaderSent = true;
                    }
                    if (textBuffer.length > 0) {
                        res.write(textBuffer);
                    }
                }

                success = true;
                break;

            } catch (innerError) {
                // Retry Logic...
                if (innerError.message.includes("429")) await new Promise(r => setTimeout(r, 1200));
                continue;
            }
        }

        if (!success) throw new Error("All models failed.");
        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ عذراً، وقع خطأ بسيط.`);
        res.end();
    }
}
