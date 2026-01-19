// ✅ الساروت الجديد (اللي جربنا وخدم)
const API_KEY = "AIzaSyCSg5Mh3OaC7zjvJy9tNNhRheR4TvWQcPY";

// ✅ الموديل "الجوكر" (الوحيد اللي قبل يخدم ليك)
const MODEL_NAME = "gemini-flash-latest";

module.exports = async (req, res) => {
  // 1. إعدادات CORS (باش الموقع يقدر يتصل بالسيرفر)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // إلا كان المتصفح غير كيطل (Pre-flight check)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { contents } = req.body;
    
    // 2. الاتصال بـ Google باستعمال "الجوكر"
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          // كنزيدو هاد الإعدادات باش نتفاداو المشاكل
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

    // 3. الرد
    if (response.ok) {
      return res.status(200).json(data);
    } else {
      console.error("Google Error:", data);
      return res.status(500).json({ error: data.error?.message || "Unknown Error" });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
};
