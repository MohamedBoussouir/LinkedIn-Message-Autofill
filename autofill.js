// autofill.js — صياغة ذكية باستخدام Groq API (مجاني وسريع)

(function () {
  // جلب معلومات الشخص من واجهة المحادثة المفتوحة أو صفحة الاختبار
  function extractTargetDetails(form) {
    const container = form.closest(".msg-overlay-conversation-bubble, .msg-convo-wrapper, main") || document;
    
    // 1. الاسم
    const nameEl = container.querySelector(
      "#profile-name, .msg-overlay-bubble-header__title, .msg-entity-lockup__entity-title, .msg-thread__link-to-profile, .msg-titlebar__title, h2, h3"
    );
    const fullName = nameEl ? nameEl.innerText.trim() : "Contact";
    const firstName = fullName.split(/\s+/)[0] || "";

    // 2. المسمى الوظيفي / الوصف
    const headlineEl = container.querySelector(
      "#profile-headline, .msg-entity-lockup__entity-info, .msg-overlay-bubble-header__badge, .artdeco-entity-lockup__subtitle"
    );
    const headline = headlineEl ? headlineEl.innerText.trim() : "";

    return { fullName, firstName, headline };
  }

  // استدعاء Groq API
  async function generateMessageWithGroq(details, apiKey) {
    const prompt = `Tu es un assistant expert en communication professionnelle et recrutement IT sur LinkedIn.
Rédige un message LinkedIn d'approche ultra-professionnel, concis, chaleureux et personnalisé en français.

Informations sur l'expéditeur :
- Nom : Mohamed Boussouir
- Profil : Développeur Web Full-Stack formé à YouCode (UM6P)
- Technologies clés : JavaScript (React, Node.js), PHP (Laravel), APIs REST, Git, Docker
- Objectif : Recherche d'une opportunité (CDI / Stage pré-embauche). Il cherche à savoir s'il y a des opportunités ouvertes ou si la personne peut pousser sa candidature / le recommander (cooptation).

Informations sur le destinataire :
- Prénom : ${details.firstName}
- Nom complet : ${details.fullName}
- Titre / Rôle : ${details.headline || "Professionnel sur LinkedIn"}

Consignes strictes :
1. Salue directement par son prénom ("Bonjour ${details.firstName},").
2. Adapte le message selon son rôle :
   - Si c'est un recruteur / RH / Talent Acquisition : demande s'il y a des postes ouverts ou s'il est possible d'intégrer le vivier de talents de l'entreprise.
   - Si c'est un développeur / ingénieur / tech lead : demande poliment s'il est ouvert à une recommandation interne (cooptation).
3. Ne mets AUCUN objet (pas de 'Objet: ...').
4. Mentionne le CV en pièce jointe et termine exactement par :
Bien cordialement,
Mohamed Boussouir`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Tu es un rédacteur professionnel de messages LinkedIn." },
          { role: "user", content: prompt }
        ],
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `خطأ في الاتصال (${response.status})`;
      throw new Error(`فشل Groq: ${msg}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  // إدخال النص داخل محرر الكتابة
  function insertIntoEditor(editable, text) {
    editable.focus();
    editable.innerHTML = "";
    
    const paragraphs = text.split("\n\n");
    paragraphs.forEach((pText) => {
      const p = document.createElement("p");
      p.innerText = pText.trim();
      editable.appendChild(p);
    });

    editable.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
    editable.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // إضافة الزر داخل صندوق الكتابة
  function attachAiButton() {
    const forms = document.querySelectorAll(".msg-form, .msg-overlay-conversation-bubble");

    forms.forEach((form) => {
      if (form.querySelector(".btn-groq-writer")) return;

      const editable = form.querySelector(".msg-form__contenteditable, [contenteditable='true']");
      const footer = form.querySelector(".msg-form__footer, .msg-form__left-actions, .msg-form__right-actions");

      if (editable && footer) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-groq-writer";
        btn.innerHTML = "✨ صياغة عبر Groq";
        btn.style.cssText = `
          background: #f55036;
          color: #ffffff;
          border: none;
          border-radius: 16px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin: 4px 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        `;

        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          chrome.storage.local.get(["grokApiKey"], async (res) => {
            const apiKey = res.grokApiKey;
            if (!apiKey) {
              alert("يرجى إدخال مفتاح Groq API Key أولاً عبر النقر على أيقونة الإضافة في الأعلى!");
              return;
            }

            const originalText = btn.innerHTML;
            btn.innerHTML = "⏳ جاري التفكير والصياغة...";
            btn.disabled = true;

            try {
              const details = extractTargetDetails(form);
              const generatedMessage = await generateMessageWithGroq(details, apiKey);
              insertIntoEditor(editable, generatedMessage);
            } catch (err) {
              alert(err.message || "حدث خطأ أثناء الصياغة");
            } finally {
              btn.innerHTML = originalText;
              btn.disabled = false;
            }
          });
        });

        footer.prepend(btn);
      }
    });
  }

  const observer = new MutationObserver(() => attachAiButton());
  observer.observe(document.body, { childList: true, subtree: true });
  attachAiButton();
})();