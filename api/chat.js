/* =======================================================
   IKED ENGINE v2026: MATH-READY (CORRECT AXIS & FAILOVER) 💎
   Architecture: Cascade Strategy (Fastest -> Stable)
   Fix: Y-Axis Inverted (Positive Y points UP ⬆️)
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

// 1. لائحة الموديلات (نفس القائمة السريعة التي اخترتها)
const CANDIDATE_MODELS = [
    "gemini-2.5-flash-lite",           
    "gemini-flash-lite-latest",        
    "gemini-2.0-flash-lite-preview-02-05" 
];

// 2. تعديل الأداة: إجبار الموديل على قلب المحور Y
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Generates a math graph SVG. viewBox='-10 -10 20 20'. CRITICAL: SVG Y-axis points DOWN. You MUST NEGATE all Y coordinates (y = -y) so positive Y points UP (Math Standard).",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "SVG code only. Use <g transform='scale(1, -1)'> for paths. Ensure f(x)=x^2 opens UPWARDS."
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

        // 🛑 Loop of Survival
        for (const modelName of CANDIDATE_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings,
                }, { apiVersion: 'v1beta' });

                const systemInstruction = `
                    You are **IKED**, an elite Math Tutor for 2 Bac SM (Morocco).
                    Current User: ${userName}.
                    
                    🚨 PROTOCOL (MATH MODE):
                    1. **Coordinate System:** SVG uses Y-down. Math uses Y-up.
                    2. **THE FIX:** When drawing functions, you MUST calculate y coordinates as **(-y)** or use **transform="scale(1, -1)"**.
                    3. **Visuals:** Call 'render_math_graph' for plots.
                    4. **No Hallucinations:** No python code.
                    5. **Lang:** Moroccan Darija (Arabic script).
                `;

                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: systemInstruction }] },
                        { role: "model", parts: [{ text: "مفهوم. سأقوم بقلب المحور Y ليكون الرسم صحيحاً رياضياً." }] }
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
                        if (call.name === "render_math_graph") {
                            const svgCode = call.args.svg_code;
                            res.write(JSON.stringify({
                                type: "visual",
                                data: { type: "SVG", code: svgCode },
                                gamification: { xp: 50 }
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
                lastError = innerError;
                console.warn(`Model ${modelName} failed: ${innerError.message}`);
                
                if (innerError.message.includes("429") || innerError.message.includes("503") || innerError.message.includes("404")) {
                    continue; 
                } else {
                    throw innerError;
                }
            }
        }

        if (!success) {
            throw new Error(`All 2026 models failed. Last error: ${lastError?.message}`);
        }

        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("CRITICAL ENGINE FAILURE:", error);
        res.write(JSON.stringify({ type: "error", message: `System Error: ${error.message}` }) + "\n");
        res.end();
    }
}
