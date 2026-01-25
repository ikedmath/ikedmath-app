/* =======================================================
   IKED ENGINE v2026: STABLE CONTROL 🛑
   Fix: Added Token Limits & Temperature Control to prevent hallucinations
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500"
];

/* =======================================================
   LOGIC: MODEL SELECTION
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    const isComplex = ["رسم", "draw", "svg", "هندسة", "دالة", "function"].some(k => q.includes(k));

    if (isComplex) {
        // نستخدم الموديلات المستقرة فقط للرسم لتجنب الجنون
        return ["gemini-2.0-flash", "gemini-1.5-flash"];
    }
    return ["gemini-2.5-flash-lite", "gemini-1.5-flash"]; 
}

/* =======================================================
   LOGIC: RETRY WITH BRAKES 🛑
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            // 🔥 ضبط الإعدادات (Generation Config) لضبط الانضباط
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.4,       // تخفيض الإبداع لزيادة الدقة
                    maxOutputTokens: 2000,  // حد أقصى للكلام لمنع الهذيان الطويل
                    topP: 0.8,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`[Skip] ${modelName}: ${error.message}`);
            continue; 
        }
    }
    throw new Error("System Busy.");
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

        // 🔥 SYSTEM PROMPT: SIMPLIFIED & DIRECT 🔥
        const systemInstruction = `
        🔴 IDENTITY: IKED, Math Tutor (2 Bac SM). Strict & Precise.

        ⚡ OUTPUT RULES:
        1. **Explanation Language:** Arabic + Darija Science terms.
        2. **Math:** Use LaTeX ($$).
        3. **Visuals:** Generate SVG code ONLY inside the JSON metadata.

        🎨 SVG RULES (Keep it Simple & Correct):
        - **Y-Axis:** Multiply Y by -1.
        - **ViewBox:** "-10 -10 20 20".
        - **Style:** Thin lines (stroke-width="0.1").
        - **IMPORTANT:** Do NOT generate infinite points. Use reasonable step (e.g., 0.2).

        --- STRICT RESPONSE FORMAT ---
        <metadata>
        {
           "visuals": { 
               "type": "SVG", 
               "code": "<svg viewBox='-10 -10 20 20' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='white'/><path d='M-10 0 H10 M0 -10 V10' stroke='black' stroke-width='0.1'/><path d='...' stroke='blue' stroke-width='0.2' fill='none'/></svg>"
           }, 
           "gamification": {"xp": 10, "badge": null}
        }
        </metadata>
        |||STREAM_DIVIDER|||
        [Explanation Starts Here]
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[Question]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // Stream Handling
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawMeta = parts[0];
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        let cleanJson = rawMeta
                            .replace(/<metadata>/g, "")
                            .replace(/<\/metadata>/g, "")
                            .replace(/```json/g, "")
                            .replace(/```/g, "")
                            .trim();

                        JSON.parse(cleanJson);
                        res.write(cleanJson + DIVIDER + content);
                    } catch (e) {
                        // Fallback: Empty visual to prevent crash
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        if (!isHeaderSent && buffer) res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        res.end();

    } catch (error) {
        console.error("Error:", error);
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: Please retry.`);
        res.end();
    }
}
