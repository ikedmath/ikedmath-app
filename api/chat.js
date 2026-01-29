/* =======================================================
   IKED ENGINE v2026: DIAMOND EDITION (STRICT VISUALS) 💎
   Features: 
   - NDJSON Event Stream (Zero Latency)
   - Native Tool Calling (Math Graphs) - FIXED
   - Anti-Hallucination Protocol (No Python Code)
   - Vision Support & Personalization
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
            description: "Generates a vector graphic (SVG). Call this function whenever the user asks to visualize, draw, or plot a function/shape.",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "PURE SVG code. Standard XML. No markdown blocks. Use viewBox='-10 -10 20 20' for standard plots. Invert Y-axis if needed."
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
    if (hasImage) {
        return ["gemini-1.5-flash", "gemini-2.0-flash"]; // Vision models
    }

    const q = query.toLowerCase();
    const visualKeywords = ["رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph", "دالة"];
    
    // إذا طلب الرسم، نحتاج موديل ذكي جداً
    if (visualKeywords.some(k => q.includes(k))) {
        return ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.0-flash-lite-preview-02-05"];
    }
    return ["gemini-1.5-flash", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"]; 
}

/* =======================================================
   3. THE HANDLER 🌊
   ======================================================= */
export default async function handler(req, res) {
    // CORS Setup
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    // NDJSON Headers
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
        res.write(JSON.stringify({ type: "error", message: "API Key Error" }) + "\n"); 
        res.end(); return; 
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const models = selectModelStrategy(prompt || "", !!image);
        let success = false;

        const userName = userProfile?.name || "Student";
        const userXP = userProfile?.xp || 0;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings,
                }, { apiVersion: 'v1beta' });

                // 🔥 THE STRICT PROTOCOL (تم التحديث حسب طلبك)
                const systemInstruction = `
                    You are **IKED**, an elite Math Tutor for 2 Bac SM (Morocco).
                    You are talking to **${userName}** (XP: ${userXP}).
                    
                    🛑 **STRICT PROTOCOL:**
                    1. **Format:** You are streaming NDJSON directly to a frontend.
                    2. **Visuals:** When asked to draw/plot, you MUST use the 'render_math_graph' tool.
                    3. **ANTI-HALLUCINATION:** DO NOT write python code (e.g., print(api...)). DO NOT output markdown code blocks for graphs. JUST CALL THE FUNCTION.
                    4. **Math:** Be precise. Use LaTeX ($$) for math formulas.
                    5. **Language:** Moroccan Darija (Arabic Script).
                    6. **Vision:** If an image is provided, analyze it mathematically.
                `;

                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: systemInstruction }] },
                        { role: "model", parts: [{ text: `مفهوم. سألتزم بالتعليمات بصرامة يا ${userName}.` }] }
                    ]
                });

                // Prepare Message (Text + Image)
                let messageParts = [];
                if (prompt) messageParts.push({ text: prompt });
                if (image) {
                    const base64Data = image.split(',')[1] || image;
                    messageParts.push({
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Data
                        }
                    });
                }

                const result = await chat.sendMessageStream(messageParts);
                
                // === STREAM LOOP (The Brain) ===
                for await (const chunk of result.stream) {
                    
                    // A. Check for Tool Calls (The Graph)
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        const call = calls[0];
                        if (call.name === "render_math_graph") {
                            const svgCode = call.args.svg_code;
                            
                            // 1. Send Visual Event to Frontend
                            res.write(JSON.stringify({
                                type: "visual",
                                data: { type: "SVG", code: svgCode },
                                gamification: { xp: 50 } // Bonus XP for graphs
                            }) + "\n");

                            // 2. Tell Gemini "Done, now explain it"
                            const result2 = await chat.sendMessageStream([{
                                functionResponse: {
                                    name: "render_math_graph",
                                    response: { status: "success", content: "Graph rendered on screen." }
                                }
                            }]);

                            // 3. Stream the explanation
                            for await (const chunk2 of result2.stream) {
                                const text2 = chunk2.text();
                                if (text2) res.write(JSON.stringify({ type: "text", content: text2 }) + "\n");
                            }
                        }
                    } 
                    
                    // B. Normal Text
                    else {
                        const text = chunk.text();
                        if (text) res.write(JSON.stringify({ type: "text", content: text }) + "\n");
                    }
                }

                success = true;
                break; // Exit loop on success

            } catch (innerError) {
                console.error(`Model ${modelName} failed:`, innerError.message);
                // If it's a rate limit or overload, wait a bit and try next model
                if (innerError.message.includes("429") || innerError.message.includes("503")) {
                    await new Promise(r => setTimeout(r, 1000));
                }
                continue;
            }
        }

        if (!success) throw new Error("All models failed after retry.");
        
        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("Critical Error:", error);
        res.write(JSON.stringify({ type: "error", message: "عذراً، وقع خطأ في الاتصال." }) + "\n");
        res.end();
    }
}
// IKED Engine: Final Fix v2026.06 (Anti-Hallucination) 🚀
