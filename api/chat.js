/* =======================================================
   IKED ENGINE v2026: FORCE EXECUTION (NO PRINT CODE) 💎
   Models: 2026 Fast Series (Cascade)
   Fixes: Y-Axis Inversion + Anti-Code Printing
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

// 1. لائحة الموديلات 2026 (السرعة والقوة)
const CANDIDATE_MODELS = [
    "gemini-2.5-flash-lite",           
    "gemini-flash-lite-latest",        
    "gemini-2.0-flash-lite-preview-02-05" 
];

// 2. تعريف الأداة (مع تنبيه شديد اللهجة)
const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "EXECUTE this function to draw. DO NOT print the code. SVG Y-axis is down, so you MUST NEGATE Y coordinates (y = -y) for Math.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "Raw SVG code only. Use <g transform='scale(1, -1)'>. No markdown, no text."
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

                // 🛑 SYSTEM INSTRUCTION: THE ANTI-CODE SHIELD
                const systemInstruction = `
                    You are **IKED**, a Math Tutor for 2 Bac SM. User: ${userName}.
                    
                    🚨 **CRITICAL EXECUTION RULES:**
                    1. **ACTION OVER TEXT:** If asked to draw, **DO NOT** write code like \`print(render...)\` or JSON \`{"tool_code"...\}\`.
                    2. **FORCE CALL:** You must **NATIVELY CALL** the function \`render_math_graph\`.
                    3. **MATH AXIS:** SVG Y points down. YOU MUST CALCULATE coordinates as **(x, -y)** so the graph looks correct.
                    4. **LANG:** Moroccan Darija.
                    5. **NO HALLUCINATIONS:** Do not act like a Python interpreter. Act like a Tool User.
                `;

                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: systemInstruction }] },
                        { role: "model", parts: [{ text: "Bien reçu. I will execute the function directly, NOT print it." }] }
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
                            // هنا فين كان المشكل، دابا غايصيفط SVG ديريكت
                            res.write(JSON.stringify({
                                type: "visual",
                                data: { type: "SVG", code: svgCode },
                                gamification: { xp: 50 }
                            }) + "\n");

                            const result2 = await chat.sendMessageStream([{
                                functionResponse: {
                                    name: "render_math_graph",
                                    response: { status: "success", content: "Graph rendered successfully." }
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
                // ندوزو للموديل التالي إلا كان المشكل فالرصيد أو السيرفر
                if (innerError.message.includes("429") || innerError.message.includes("503") || innerError.message.includes("404")) {
                    continue; 
                } else {
                    throw innerError;
                }
            }
        }

        if (!success) {
            throw new Error(`All models failed. Last error: ${lastError?.message}`);
        }

        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        res.write(JSON.stringify({ type: "error", message: `System Error: ${error.message}` }) + "\n");
        res.end();
    }
}
