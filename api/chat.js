/* =======================================================
   IKED ENGINE vFINAL: THE MATH WORKHORSE 🐎📐
   Selected Model: gemini-1.5-flash
   Reason: 
   - Highest Free Tier Limits (Won't stop working).
   - Fastest Response Time (Real-time streaming).
   - Enhanced via "Chain of Thought" System Prompt for Math.
   ======================================================= */

const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    // 1. Streaming Setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt, userProfile } = req.body;
        if (!prompt) { res.write(JSON.stringify({ error: "No prompt" })); res.end(); return; }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) { res.write(JSON.stringify({ error: "API Key missing" })); res.end(); return; }

        const genAI = new GoogleGenerativeAI(apiKey);

        // 🟢 THE CHOSEN ONE: gemini-1.5-flash
        // هذا هو الوحيد اللي يضمن ليك الخدمة 24/24 فالمجان بلا انقطاع
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        /* =======================================================
           2. THE "BRAIN BOOSTER" PROMPT (رفع الذكاء برمجياً) 🧠
           هنا كنرجعو Flash يخدم بمنطق Sciences Maths
           ======================================================= */
        const systemInstruction = `
        🔴 IDENTITY: IKED, The Best Math Tutor for "2 Bac Sciences Maths" in Morocco.
        
        🎯 OBJECTIVE: Provide rigorous, step-by-step mathematical explanations.
        
        ⚡ RESPONSE PROTOCOL (STRICT):
        1. You MUST respond in TWO distinct parts separated by "|||STREAM_DIVIDER|||".
        2. DO NOT wrap the first part (JSON) in markdown code blocks (like \`\`\`json). Just write raw JSON.
        
        --- PART 1: METADATA (Raw JSON Only) ---
        {
            "visuals": { 
                "type": "SVG", 
                "code": "Generate VALID SVG code for functions/geometry/circuits. Keep it minimal (< 400px height). If not needed, set to null." 
            },
            "gamification": { 
                "xp": 20, 
                "badge": "Name of a math badge if the question is smart (e.g., 'Euler Insight') OR null" 
            },
            "analogy": "A short, clever Darija analogy explaining the concept."
        }
        
        |||STREAM_DIVIDER|||
        
        --- PART 2: THE EXPLANATION (Streaming Text) ---
        - **Tone**: Professional yet encouraging (Mix Darija & French terms).
        - **Math Format**: You MUST use LaTeX for ALL equations. Example: $$ f(x) = \\lim_{n \\to \\infty} (1 + \\frac{1}{n})^n $$.
        - **Logic**: Don't just give the result. Show the "Raisonnement" (Reasoning).
        - **Correction**: If the student greets you (Salam/Hello), reply briefly and ask for a math problem.
        `;

        const studentLevel = userProfile?.stream || "Sciences Maths";
        const fullPrompt = `${systemInstruction}\n\n[Student Profile: ${studentLevel}]\n[User Input]: ${prompt}`;

        /* =======================================================
           3. EXECUTION 🚀
           ======================================================= */
        const result = await model.generateContentStream(fullPrompt);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error("API Error:", error);
        // Fallback message in case of rare glitches
        res.write(`|||STREAM_DIVIDER|||⚠️ IKED: ${error.message}`);
        res.end();
    }
}
