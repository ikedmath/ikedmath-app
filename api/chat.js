const API_KEY = process.env.GOOGLE_API_KEY;
// كنجيبو السوارت إلا كانوا بزاف (احتياط)
const ALL_KEYS = API_KEY ? API_KEY.split(',') : [];

const MODEL_NAME = "gemini-flash-latest";

module.exports = async (req, res) => {
  // ... (نفس إعدادات CORS) ...
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // اختيار ساروت عشوائي
  const randomKey = ALL_KEYS.length > 0 ? ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)].trim() : null;

  if (!randomKey) {
    return res.status(500).json({ error: "No API Key found!" });
  }

  try {
    const { contents } = req.body;

    // 🕵️‍♂️ [جديد] هاد السطر هو "الجاسوس"
    // أي ميساج غايوصل، غايتكتب عندك فـ Vercel Logs
    const userMessage = contents?.[0]?.parts?.[0]?.text || "No text";
    console.log("📝 سؤال جديد وصل: ", userMessage);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${randomKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json(data);
    } else {
      console.error("Google Error:", data); // كنسجلو حتى الأخطاء باش نشوفوها
      return res.status(500).json({ error: data.error?.message || "Google Error" });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
