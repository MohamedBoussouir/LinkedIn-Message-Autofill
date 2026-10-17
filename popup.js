document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  chrome.storage.local.get(["grokApiKey"], (res) => {
    if (res.grokApiKey) apiKeyInput.value = res.grokApiKey;
  });

  saveBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.local.set({ grokApiKey: key }, () => {
      status.textContent = "تم حفظ المفتاح بنجاح ✔";
      setTimeout(() => (status.textContent = ""), 2500);
    });
  });
});