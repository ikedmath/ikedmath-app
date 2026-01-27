/* =======================================================
   IKED ENGINE v2026: DIAMOND EDITION 💎
   Architecture: NDJSON Event Stream (No Header Trap)
   Features: Real-time Streaming, Tool Injection, Zero Latency
   Security: Strict SVG Rules
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. DEFINING THE TOOL (High Precision Mode) 🎯
   ======================================================= */
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Generates a vector graphic (SVG) for math concepts. Call ONLY when visualization is requested.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "PURE SVG code only. No markdown. No <script> tags. Use viewBox='-10 -10 20 20'. Invert Y-axis. Calculate coordinates precisely (e.g. roots, vertex)."
                    }
                },
                required: ["svg_code"]
            }
        }
    ]
};

/* =======================================================
   2. SAFETY SETTINGS 🛡️
   ======================================================= */
const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

/* =======================================================
   3. MODEL STRATEGY 🧠
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const visualKeywords = ["رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph", "دالة"];
    
    if (visualKeywords.some(k => q.includes(k))) {
        return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite-preview-02-05"];
    }
    return ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-lite-latest"]; 
}

/* =======================================================
   4. THE HANDLER (NDJSON Streamer) 🌊
   ======================================================= */
export default async function handler(req, res) {
    // إعدادات CORS
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    // 🔥 تغيير نوع المحتوى ليدعم NDJSON (تتابع أحداث JSON)
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt } = req.body;
    if (!prompt) {
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
                                You are **IKED**, an elite Math Tutor (2 Bac SM).
                                
                                🛑 **STRICT PROTOCOL:**
                                1. **Response Format:** You are streaming directly to a frontend.
                                2. **Visuals:** If you need to draw, call the 'render_math_graph' tool. You can call it at the beginning, middle, or end of your explanation.
                                3. **Security:** NEVER generate SVG containing <script>, onclick, or onload events.
                                4. **Math:** Be precise. Calculate intersection points accurately before drawing.
                                5. **Language:** Moroccan Darija (Arabic Script).
                            ` }]
                        },
                        { role: "model", parts: [{ text: "مفهوم. سألتزم بالبروتوكول الجديد." }] }
                    ]
                });

                const result = await chat.sendMessageStream(prompt);
                
                // === THE NEW STREAM LOGIC (Event Loop) ===
                for await (const chunk of result.stream) {
                    
                    // 1. هل هناك استدعاء للأداة؟ (Drawing Event)
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        const call = calls[0];
                        if (call.name === "render_math_graph") {
                            const svgCode = call.args.svg_code;
                            
                            // نرسل حدث الرسم فوراً ومستقلاً
                            const visualEvent = {
                                type: "visual",
                                data: { type: "SVG", code: svgCode },
                                xp: 20
                            };
                            res.write(JSON.stringify(visualEvent) + "\n");

                            // نطلب الشرح من الموديل
                            const result2 = await chat.sendMessageStream([{
                                functionResponse: {
                                    name: "render_math_graph",
                                    response: { status: "success", content: "Graph rendered." }
                                }
                            }]);

                            // نبث شرح الرسم
                            for await (const chunk2 of result2.stream) {
                                const text2 = chunk2.text();
                                if (text2) {
                                    res.write(JSON.stringify({ type: "text", content: text2 }) + "\n");
                                }
                            }
                        }
                    } 
                    
                    // 2. هل هو نص عادي؟ (Text Event)
                    else {
                        const text = chunk.text();
                        if (text) {
                            // نرسل النص فوراً (Zero Latency)
                            res.write(JSON.stringify({ type: "text", content: text }) + "\n");
                        }
                    }
                }

                success = true;
                break; // نجحنا

            } catch (innerError) {
                if (innerError.message.includes("429")) await new Promise(r => setTimeout(r, 1000));
                continue;
            }
        }

        if (!success) throw new Error("All models failed.");
        
        // إشارة نهاية البث (اختياري ولكن جيد للنظافة)
        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        res.write(JSON.stringify({ type: "error", message: "عذراً، وقع خطأ بسيط." }) + "\n");
        res.end();
    }
}
