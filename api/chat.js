/* =======================================================
   IKED ENGINE v2026: HYBRID LOGIC (BRAIN ONLY) 🧠
   Architecture: Backend Extracts Math -> Frontend Renders
   Models: 2026 Fast Series (Failover Strategy)
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

// 1. لائحة الموديلات السريعة (نفس القائمة المفضلة لديك)
const CANDIDATE_MODELS = [
    "gemini-2.5-flash-lite",           
    "gemini-flash-lite-latest",        
    "gemini-2.0-flash-lite-preview-02-05" 
];

// 2. الأداة الجديدة: استخراج المعادلة فقط (بدون رسم)
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

        // 🛑 Loop of Survival: نجربو الموديلات واحد بواحد
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
                            // 🚀 هنا التغيير الكبير: نرسل أمراً للمحرك (Frontend)
                            res.write(JSON.stringify({
                                type: "command",  // نوع جديد خاص بالأوامر
                                cmd: "PLOT",
                                data: call.args,
                                gamification: { xp: 20 }
                            }) + "\n");

                            // نخبر الموديل أننا أرسلنا الأمر بنجاح
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
                break; 

            } catch (innerError) {
                lastError = innerError;
                // Failover logic
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
