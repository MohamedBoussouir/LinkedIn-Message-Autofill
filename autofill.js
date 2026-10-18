// autofill.js — النسخة الدقيقة المطابقة لهيكل DOM في LinkedIn

(function () {
  function detectRole(headline) {
    const isRecruiter = /recrut|recruit|talent|\bRH\b|\bHR\b|ressources humaines|sourcing|acquisition|headhunter/i.test(headline);
    return isRecruiter ? "RECRUITER" : "TECH";
  }

  function getSmartSubject(role, company) {
    if (role === "RECRUITER") {
      return company 
        ? `Candidature Développeur Full-Stack – ${company}` 
        : "Candidature Développeur Full-Stack (YouCode)";
    } else {
      return company 
        ? `Échange technique – Développeur Full-Stack (${company})` 
        : "Échange technique – Développeur Full-Stack";
    }
  }

  function fillSubjectFieldIfPresent(form, subjectText) {
    try {
      const subjectInput = form.querySelector("input[name='subject'], .msg-form__subject input, input[placeholder*='Objet']");
      if (subjectInput && !subjectInput.value.trim()) {
        subjectInput.focus();
        subjectInput.value = subjectText;
        subjectInput.dispatchEvent(new Event("input", { bubbles: true }));
        subjectInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (e) {
      console.warn("تعذر ملء حقل الموضوع:", e);
    }
  }

  function extractTargetDetails(form) {
    const container = form.closest(".msg-convo-wrapper, .scaffold-layout__detail, main") || document;

    // 1. استخراج الاسم بدقة بناءً على هيكل الصفحة الفعلي
    let fullName = "";
    const nameEl = container.querySelector(
      ".msg-compose__profile-link, .artdeco-entity-lockup__title a, .artdeco-entity-lockup__title, .msg-entity-lockup__entity-title"
    );
    if (nameEl) {
      fullName = nameEl.innerText.trim();
    }

    if (!fullName) fullName = "Contact";

    // تنسيق الاسم: HASNAA -> Hasnaa
    const rawFirst = fullName.split(/\s+/)[0] || "";
    const firstName = rawFirst ? (rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase()) : "Contact";

    // 2. استخراج المسمى الوظيفي
    const headlineEl = container.querySelector(
      ".msg-compose__occupation, .artdeco-entity-lockup__subtitle, .msg-entity-lockup__entity-info"
    );
    const headline = headlineEl ? headlineEl.innerText.trim() : "";

    // 3. استخراج اسم الشركة
    let company = "";
    const companyMatch = headline.match(/(?:chez|at|@)\s+([^|•,\n]+)/i);
    if (companyMatch) company = companyMatch[1].trim();

    return { fullName, firstName, headline, company };
  }

  function insertIntoEditor(editable, rawText) {
    const paragraphs = rawText.trim().split(/\n\s*\n/);
    editable.focus();

    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);

    let ok = true;
    paragraphs.forEach((p, i) => {
      if (i > 0) {
        ok = document.execCommand("insertParagraph") && ok;
        ok = document.execCommand("insertParagraph") && ok;
      }
      ok = document.execCommand("insertText", false, p.trim()) && ok;
    });

    if (!ok || !editable.innerText.trim()) {
      editable.innerHTML = "";
      paragraphs.forEach((p) => {
        const el = document.createElement("p");
        el.textContent = p.trim();
        editable.appendChild(el);
      });
    }

    editable.dispatchEvent(new Event("focus", { bubbles: true }));
    editable.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: rawText }));
    editable.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    editable.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));
    editable.dispatchEvent(new Event("change", { bubbles: true }));

    // تفعيل زر الإرسال المخصص في النموذج (الطائرة)
    const form = editable.closest("form");
    if (form) {
      const sendBtn = form.querySelector(".msg-form__send-btn, button[type='submit']");
      if (sendBtn && sendBtn.disabled) {
        sendBtn.disabled = false;
        sendBtn.removeAttribute("disabled");
      }
    }
  }

  function attachAiButton() {
    // استهداف النموذج الفعلي في صفحتك
    const forms = document.querySelectorAll(".msg-form, form[id*='base-form']");

    forms.forEach((form) => {
      if (form.querySelector(".groq-toolbar")) return;

      const editable = form.querySelector(".msg-form__contenteditable, [contenteditable='true']");
      // مكان الحقن الدقيق والمثالي في واجهتك
      const leftActions = form.querySelector(".msg-form__left-actions");
      const footer = form.querySelector(".msg-form__footer");
      const mountPoint = leftActions || footer;

      if (editable && mountPoint) {
        const toolbar = document.createElement("div");
        toolbar.className = "groq-toolbar";
        toolbar.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 4px;
          z-index: 9999;
        `;

        const btnGenerate = document.createElement("button");
        btnGenerate.type = "button";
        btnGenerate.className = "btn-groq-writer";
        btnGenerate.innerHTML = "✨ صياغة عبر Groq";
        btnGenerate.style.cssText = `
          background: #f55036;
          color: #ffffff;
          border: none;
          border-radius: 16px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        `;

        const selectTone = document.createElement("select");
        selectTone.className = "groq-tone-select";
        selectTone.style.cssText = `
          border: 1px solid #ccc;
          border-radius: 12px;
          padding: 4px 6px;
          font-size: 11px;
          outline: none;
          background: #fff;
          cursor: pointer;
          max-width: 140px;
          white-space: nowrap;
        `;
        selectTone.innerHTML = `
          <option value="auto">🤖 تلقائي (حسب الدور)</option>
          <option value="direct">🎯 مباشر وسريع</option>
          <option value="formal">👔 رسمي (RH / Recruteur)</option>
          <option value="curious">💻 تقني وزميل (Cooptation)</option>
        `;

        const btnRegen = document.createElement("button");
        btnRegen.type = "button";
        btnRegen.title = "توليد صياغة بديلة";
        btnRegen.innerHTML = "🔄";
        btnRegen.style.cssText = `
          background: #eaeaea;
          color: #333;
          border: 1px solid #ccc;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          font-size: 13px;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
        `;

        let regenCounter = 0;

        async function triggerAiGeneration(isRegen = false) {
          if (!chrome.runtime?.sendMessage) {
            alert("تم تحديث الإضافة. يرجى إعادة تحميل هذه الصفحة (F5).");
            return;
          }

          const originalText = btnGenerate.innerHTML;
          btnGenerate.innerHTML = isRegen ? "⏳ تنويع..." : "⏳ صياغة...";
          btnGenerate.disabled = true;
          btnRegen.disabled = true;

          const details = extractTargetDetails(form);

          let determinedRole = "TECH";
          if (selectTone.value === "formal") {
            determinedRole = "RECRUITER";
          } else if (selectTone.value === "curious") {
            determinedRole = "TECH";
          } else {
            determinedRole = detectRole(details.headline);
          }
          details.role = determinedRole;

          if (isRegen) regenCounter++;

          chrome.runtime.sendMessage(
            {
              action: "GENERATE_MESSAGE",
              details,
              isRegen,
              seedOffset: regenCounter
            },
            (response) => {
              btnGenerate.innerHTML = originalText;
              btnGenerate.disabled = false;
              btnRegen.disabled = false;

              if (chrome.runtime?.lastError) {
                alert(`خطأ: ${chrome.runtime.lastError.message}`);
                return;
              }

              if (response && response.success) {
                const smartSubject = getSmartSubject(details.role, details.company);
                fillSubjectFieldIfPresent(form, smartSubject);

                insertIntoEditor(editable, response.message);
                btnRegen.style.display = "inline-flex";
              } else {
                alert(response?.error || "حدث خطأ أثناء الصياغة");
              }
            }
          );
        }

        btnGenerate.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerAiGeneration(false);
        });

        btnRegen.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerAiGeneration(true);
        });

        toolbar.append(btnGenerate, selectTone, btnRegen);
        mountPoint.appendChild(toolbar);
      }
    });
  }

  const observer = new MutationObserver(() => attachAiButton());
  observer.observe(document.body, { childList: true, subtree: true });
  attachAiButton();
})();