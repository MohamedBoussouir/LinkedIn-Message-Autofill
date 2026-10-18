document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // جلب المفتاح الموحد groqApiKey (مع دعم المفتاح القديم إن وجد)
  chrome.storage.local.get(["groqApiKey", "grokApiKey"], (res) => {
    const key = res.groqApiKey || res.grokApiKey;
    if (key) apiKeyInput.value = key;
  });

  saveBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      alert("يرجى إدخال مفتاح صالح يبدأ بـ gsk_");
      return;
    }
    chrome.storage.local.set({ groqApiKey: key }, () => {
      status.textContent = "تم حفظ المفتاح بنجاح ✔";
      setTimeout(() => (status.textContent = ""), 2500);
    });
  });
});