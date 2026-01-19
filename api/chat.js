// خزان السوارت (Backend Secret Vault)
const API_KEYS = [
  "AIzaSyBPz8vXwVUG-XEZhp-Tgl7DgbJNVBzasbU",
  "AIzaSyA0mtRY0r3V_4YgbysODF74ZF96d8BDdKI",
  "AIzaSyCfdmvpmblXCLECHH7FaDYLPDFbEKIvXLU",
  "AIzaSyBjA2NpNvi3evBYvPgDUxBdsUnz1rXiuK8",
  "AIzaSyAsk6lafFuqW5F6C3KWjAR6GczqfFB1WjU",
  "AIzaSyBmmCbuU2GjEl4Vtpp0ptyNL9Mu3GMRjcc",
  "AIzaSyD0Q5wdMko3fRPudDfUZV0Y_OcRlySlN3Y",
  "AIzaSyAN0U3UtB3oZZPUjCFr7qxgd9H2vKvva-A",
  "AIzaSyAz6BaeOnSgE1eaW4Ywfhkt5BggcIk463g",
  "AIzaSyDaRAVDYonItLkhQipP7IEhcrRM_q3RQdU",
  "AIzaSyBzfphr62SGax09-wvKM4DbOACKarqYFtg",
  "AIzaSyCxohCSJDmmpQHnxZcTnAkUr9WjFinBOEo",
  "AIzaSyBjtH15LRaIzM4JnFw70Ha_qm8Lzx0fOME",
  "AIzaSyBwkd8WXx_T4IBv-PTSlaSJDMuxuHWJV_g"
];

const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

// دالة السيرفر (Node.js Standard)
module.exports = async (req, res) => {
  // 1. إعدادات الأمان (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // إلا كان غير فحص (OPTIONS)، جاوب بـ OK
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 2. قراءة الرسالة
    const { contents } = req.body;
    
    // 3. اختيار ساروت عشوائي
    const randomKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

    // 4. محاولة الاتصال بـ Google
    for (const model of MODELS) {
      try {
        const googleResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${randomKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents,
              generationConfig: { maxOutputTokens: 1000 }
            })
          }
        );

        if (googleResponse.ok) {
          const data = await googleResponse.json();
          return res.status(200).json(data);
        }
      } catch (innerError) {
        console.error(`Model ${model} skipped.`);
      }
    }

    return res.status(503).json({ error: "All models are busy." });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
