/* =======================================================
   IKED ENGINE v2026: DIAMOND EDITION (VISION & PERSONALITY) 💎👁️
   Features: 
   - NDJSON Event Stream (Zero Latency)
   - Native Tool Calling (Math Graphs)
   - Vision Support (Image Analysis)
   - Context-Aware Personalization
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. DEFINING THE TOOL 🎯
   ======================================================= */
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Generates a vector graphic (SVG). Call ONLY when user asks to visualize.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "PURE SVG code. viewBox='-10 -10 20 20'. Invert Y-axis. Calculate coordinates precisely."
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
   2. MODEL STRATEGY 🧠
   ======================================================= */
function selectModelStrategy(query, hasImage) {
    // إذا كاين صورة، كنخدمو بموديلات Vision القوية
    if (hasImage) {
        return ["gemini-2.0-flash", "gemini-1.5-flash"];
    }

    const q = query.toLowerCase();
    const visualKeywords = ["رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph", "دالة"];
    
    if (visualKeywords.some(k => q.includes(k))) {
        return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite-preview-02-05"];
    }
    return ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-lite-latest"]; 
}

/* =======================================================
   3. THE HANDLER 🌊
   ======================================================= */
export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // 🔥 دابا كنستقبلو حتى الصورة (image) والبيانات الشخصية (userProfile)
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
        const models = selectModelStrategy(prompt || "", !!image); // نختار الموديل حسب واش كاينة صورة
        let success = false;

        // تجهيز بيانات المستخدم
        const userName = userProfile?.name || "Student";
        const userXP = userProfile?.xp || 0;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings,
                    generationConfig: { temperature: 0.6 }
                }, { apiVersion: 'v1beta' });

                // 🔥 System Prompt مخصص ومحدث
                const systemInstruction = `
                    You are **IKED**, an elite Math Tutor for 2 Bac SM (Morocco).
                    You are talking to **${userName}** (XP: ${userXP}).
                    
                    🛑 **STRICT PROTOCOL:**
                    1. **Format:** Streaming NDJSON directly.
                    2. **Visuals:** Call 'render_math_graph' if asked to draw.
                    3. **Security:** NO <script> tags in SVG.
                    4. **Math:** Be precise. Use LaTeX ($$).
                    5. **Language:** Moroccan Darija (Arabic Script).
                    6. **Vision:** If an image is provided, analyze it mathematically (extract function, identify curve properties).
                `;

                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: systemInstruction }] },
                        { role: "model", parts: [{ text: `مرحباً ${userName}. أنا واجد.` }] }
                    ]
                });

                // 🔥 تحضير الرسالة (نص + صورة إذا وجدت)
                let messageParts = [];
                if (prompt) messageParts.push({ text: prompt });
                
                if (image) {
                    // image خاصها تكون base64 string (بلا header data:image/...)
                    const base64Data = image.split(',')[1] || image;
                    messageParts.push({
                        inlineData: {
                            mimeType: "image/jpeg", // نفترض JPEG أو نقدرو نجيبوه ديناميكيا
                            data: base64Data
                        }
                    });
                }

                const result = await chat.sendMessageStream(messageParts);
                
                // === STREAM LOGIC (Event Loop) ===
                for await (const chunk of result.stream) {
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        const call = calls[0];
                        if (call.name === "render_math_graph") {
                            const svgCode = call.args.svg_code;
                            
                            res.write(JSON.stringify({
                                type: "visual",
                                data: { type: "SVG", code: svgCode },
                                gamification: { xp: 20 }
                            }) + "\n");

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

                success = true;
                break;

            } catch (innerError) {
                if (innerError.message.includes("429")) await new Promise(r => setTimeout(r, 1000));
                continue;
            }
        }

        if (!success) throw new Error("All models failed.");
        
        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        res.write(JSON.stringify({ type: "error", message: "عذراً، وقع خطأ بسيط." }) + "\n");
        res.end();
    }
}
