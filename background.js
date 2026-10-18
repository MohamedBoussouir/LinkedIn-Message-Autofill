// background.js — قوالب ثابتة + النموذج يعيد الصياغة فقط + فحص صارم + رجوع للقالب عند أي خلل

const SIGN_NAME = "Mohammed Boussouir";

const L = {
  fr: {
    greeting: (n) => `Bonjour ${n},`,
    cv: "Vous trouverez mon CV en pièce jointe.",
    closing: "Bien cordialement,",
    company: (c) => (c ? `chez ${c}` : "au sein de votre structure"),
    recruiterBody:
      "Je suis actuellement en formation à YouCode (UM6P). Lors de mon stage chez Ouahda Solutions, j'ai conçu et développé trois applications de gestion de présence biométrique (Electron.js, Laravel) intégrant des terminaux ZKTeco.",
    recruiterAsk: (c) =>
      `Auriez-vous des opportunités (stage pré-embauche ou CDI) ${c}, ou la possibilité d'intégrer votre vivier de talents ?`,
    techBody:
      "Je travaille avec Node.js et React dans le cadre de ma formation à YouCode (UM6P). Lors de mon stage chez Ouahda Solutions, j'ai développé des applications Electron.js et Laravel intégrant des terminaux ZKTeco via les protocoles TCP/IP et ADMS.",
    techAsk: (company) =>
      `Seriez-vous ouvert à un court échange technique sur votre expérience Node.js/React${company ? " chez " + company : ""} ?`
  },
  en: {
    greeting: (n) => `Hello ${n},`,
    cv: "You will find my CV attached.",
    closing: "Best regards,",
    company: (c) => (c ? `at ${c}` : "at your company"),
    recruiterBody:
      "I am currently in training at YouCode (UM6P). During my internship at Ouahda Solutions, I designed and developed three attendance-management applications (Electron.js, Laravel) integrating ZKTeco biometric terminals.",
    recruiterAsk: (c) =>
      `Do you have any opportunities (pre-hire internship or full-time) ${c}, or could I join your talent pool?`,
    techBody:
      "I work with Node.js and React as part of my training at YouCode (UM6P). During my internship at Ouahda Solutions, I developed Electron.js and Laravel applications integrating ZKTeco terminals via the TCP/IP and ADMS protocols.",
    techAsk: (company) =>
      `Would you be open to a short technical chat about your experience with Node.js/React${company ? " at " + company : ""}?`
  }
};

function detectLang(headline) {
  const fr = /\b(chez|développeur|développeuse|chargé|chargée|recrutement|ingénieur|responsable|ressources)\b/i.test(headline);
  const en = /\b(the|and|engineer|developer|manager|recruiter|lead|senior|at|talent|hiring)\b/i.test(headline);
  return !fr && en ? "en" : "fr";
}

function buildTemplate(details, lang, role) {
  const t = L[lang];
  const first = details.firstName || "";
  const parts = [t.greeting(first)];

  if (role === "RECRUITER") {
    parts.push(t.recruiterBody, t.recruiterAsk(t.company(details.company)));
  } else {
    parts.push(t.techBody, t.techAsk(details.company));
  }

  parts.push(t.cv, `${t.closing}\n${SIGN_NAME}`);
  return parts.join("\n\n");
}

function normalize(text) {
  return text
    .trim()
    .replace(/(Bien cordialement,|Best regards,)\s*\n\s*Mohamm?ed Boussouir/i, `$1\n${SIGN_NAME}`)
    .replace(/\n{3,}/g, "\n\n");
}

function isValid(text, role, lang, first) {
  const t = L[lang];
  const words = text.split(/\s+/).length;
  if (words < 40 || words > 110) return false;
  if (!text.startsWith(t.greeting(first))) return false;
  if (!text.endsWith(`${t.closing}\n${SIGN_NAME}`)) return false;
  if (!text.includes(t.cv)) return false;
  if (!/Ouahda/i.test(text)) return false;
  if (/maîtrise|diplômé|convaincu|ce qui me permet|piloter|motivé à contribuer|graduated|mastered/i.test(text)) return false;
  if (/PostgreSQL|MongoDB|Next\.?js|NestJS|Vue|TypeScript|Python|AWS|Kubernetes/i.test(text)) return false;

  if (role === "RECRUITER") {
    if (/TCP|ADMS/i.test(text)) return false;
  } else {
    if (/opportunit|vivier|talent pool|postes? ouverts?/i.test(text)) return false;
    if (!/Node\.js/i.test(text)) return false;
  }
  return true;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_MESSAGE") {
    handleGenerate(request.details, request.isRegen, request.tone)
      .then((msg) => sendResponse({ success: true, message: msg }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleGenerate(details, isRegen = false, tone = "auto") {
  const { groqApiKey } = await chrome.storage.local.get(["groqApiKey"]);
  if (!groqApiKey) throw new Error("يرجى إدخال مفتاح Groq API Key أولاً!");

  const role = details.role || "TECH";
  const lang = detectLang(details.headline || "");
  const template = buildTemplate(details, lang, role);

  const shortHint = tone === "direct" ? "\n- Raccourcis chaque phrase sans ajouter aucun contenu." : "";

  const prompt = `Reformule légèrement le message LinkedIn ci-dessous pour qu'il sonne naturel.

RÈGLES STRICTES :
- Garde EXACTEMENT les mêmes faits, le même ordre et les mêmes paragraphes (séparés par une ligne vide).
- N'ajoute AUCUNE phrase, aucune technologie, aucune responsabilité nouvelle.
- Garde la première ligne (salutation) et les deux dernières lignes (signature) exactement identiques.
- Garde la phrase du CV telle quelle.
- Langue : ${lang === "en" ? "anglais" : "français"}.${shortHint}
- Réponds UNIQUEMENT avec le message final, sans commentaire.

MESSAGE :
${template}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey.trim()}`
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: "Tu es un correcteur de style. Tu ne changes jamais les faits." },
        { role: "user", content: prompt }
      ],
      temperature: isRegen ? 0.8 : 0.3,
      reasoning_effort: "low"
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `خطأ من Groq (${response.status})`);
  }

  const data = await response.json();
  const content = normalize(data.choices?.[0]?.message?.content || "");

  // إن خالف النموذج أي قاعدة نرجع القالب الأصلي الصادق
  if (content && isValid(content, role, lang, details.firstName || "")) return content;
  return template;
}