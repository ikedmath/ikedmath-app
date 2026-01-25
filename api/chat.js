/* =======================================================
   IKED ENGINE v2026: ADAPTIVE EDITION 🧠
   Mode: Concise & Responsive (On-Demand)
   Language: Darija + Arabic Math (No yapping)
   Visuals: Only when requested
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. STRATEGY: STRICT 2026 LIST
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    // نكتشف هل طلب المستخدم الرسم صراحة
    const wantsDrawing = ["رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph"].some(k => q.includes(k));

    if (wantsDrawing) {
        return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    }
    // للأسئلة العادية، نستخدم الموديلات السريعة والخفيفة
    return ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite-preview-02-05", "gemini-flash-lite-latest"]; 
}

/* =======================================================
   2. GENERATION LOGIC
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.6, // حرارة متوسطة للرزانة
                    maxOutputTokens: 4000, 
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 2000)); 
            }
            continue; 
        }
    }
    throw new Error("System Overload.");
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

    const { prompt, userProfile } = req.body;
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "Input required" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { res.write(JSON.stringify({ error: "API Key Error" })); res.end(); return; }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // 🔥 SYSTEM PROMPT: CONCISE & RESPONSIVE 🔥
        const systemInstruction = `
        You are **IKED**, a smart Moroccan Math Tutor.

        ⚡ **CORE BEHAVIOR RULES (Strict):**
        1. **Weight of the Answer:** Match the length of your answer to the user's question.
           - Simple question ("Salam", "Chno hiya dala?") -> Short, direct answer.
           - Complex question ("Dir liya tahlil...") -> Detailed answer.
           - **DO NOT YAP.** Do not write long introductions or conclusions unless asked.
        
        2. **Language:** Use **Moroccan Darija** mixed with clear Arabic Math terms.
           - Example: "Hna 3ndna mochkil f l'limite, khassna n3mlo b x."
        
        3. **Visuals (On-Demand Only):** - **ONLY** output a JSON graph if the user EXPLICITLY asks for it (e.g., "Rsom liya", "Draw this").
           - If no graph is asked, output \`{"visuals": null}\` immediately.

        4. **Formatting:** Use LaTeX ($...$) for math formulas. Keep it clean.

        🚨 **OUTPUT FORMAT:**
        1. JSON Object (Visuals or Null).
        2. "|||STREAM_DIVIDER|||"
        3. The Text Response.

        --- SVG RULES (If asked) ---
        - Invert Y: y = -1 * y
        - ViewBox: "-10 -10 20 20"
        - Simple <path> and <line>.

        --- TEMPLATE ---
        { "visuals": null }
        |||STREAM_DIVIDER|||
        Wa alaykum salam! Kifach n9der n3awnek f l'math lyouma?
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[User]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 JSON EXTRACTION LOGIC 🔥
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawBuffer = parts[0]; 
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        const firstBrace = rawBuffer.indexOf('{');
                        const lastBrace = rawBuffer.lastIndexOf('}');

                        if (firstBrace !== -1 && lastBrace !== -1) {
                            let cleanJson = rawBuffer.substring(firstBrace, lastBrace + 1);
                            JSON.parse(cleanJson);
                            res.write(cleanJson + DIVIDER + content);
                        } else {
                            // If no JSON found (rare), assume null visual
                            res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                        }
                    } catch (e) {
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        if (!isHeaderSent && buffer) {
             res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ IKED: Please retry.`);
        res.end();
    }
}
