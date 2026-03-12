import { getQueryParam } from "./commonUtils";

export function initDevBridge(): boolean {
  const templateParam = getQueryParam("template");
  const apiUrlParam = getQueryParam("apiUrl");

  // PRE-FLIGHT REDIRECT LOGIC
  if (templateParam && (!templateParam.startsWith("http") && !templateParam.includes("="))) {
    let isDecodingValid = false;
    try {
      const decoded = atob(templateParam);
      if (decoded.includes('/') || decoded.includes('.json')) {
        isDecodingValid = true;
      }
    } catch (e) {}

    if (!isDecodingValid) {
      const tplName = templateParam;
      console.log("Local Dev: Rewriting URL parameters to base64 for renderer compatibility...");
      
      fetch(`./templates/${tplName}/manifest.json`)
        .then(r => {
          if (!r.ok) throw new Error("Could not load local manifest for " + tplName);
          return r.json();
        })
        .then(manifest => {
          const fullPath = window.location.origin + window.location.pathname.replace('index.html', '') + `templates/${tplName}/${manifest.version}/manifest.json`;
          const newParams = new URLSearchParams(window.location.search);
          newParams.set('template', btoa(fullPath));
          window.location.replace(window.location.pathname + '?' + newParams.toString());
        })
        .catch(e => {
          console.error("Pre-flight error:", e);
        });
      
      return true; // Indicate that we are redirecting, skip rendering
    }
  }

  // MODAL INJECTION LOGIC
  injectModal(templateParam, apiUrlParam);

  if (!templateParam) {
    const outputDiv = document.getElementById("documentOutput");
    if (outputDiv) {
      outputDiv.innerHTML = "Waiting for a template to be selected...<br><span style='font-size: 12px; color: #888;'>(devMode active)</span>";
    }
    return true; // Skip rendering, wait for template input
  }

  return false;
}

function injectModal(templateParam: string | null, apiUrlParam: string | null) {
  // Inject CSS
  const style = document.createElement("style");
  style.innerHTML = `
    #ceresExampleModal {
      position: fixed; bottom: 20px; right: 20px; background: white; padding: 15px;
      border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); z-index: 9999;
      font-family: Arial, sans-serif; border: 1px solid #e2e8f0; min-width: 300px; display: block;
    }
    @media print { #ceresExampleModal { display: none !important; } }
    #ceresExampleModal h3 { margin: 0 0 10px 0; font-size: 14px; color: #334155; }
    .modal-action { display: flex; gap: 8px; align-items: center; }
    .modal-action input { flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; color: #475569; background: #f8fafc; }
    .modal-action button { padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; transition: background 0.2s; }
    .modal-action button:hover { background: #2563eb; }
    #copyFeedback { font-size: 11px; color: #10b981; margin-top: 6px; display: none; }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const modal = document.createElement("div");
  modal.id = "ceresExampleModal";
  modal.innerHTML = `
    <h3>Load Template</h3>
    <div class="modal-action" style="margin-bottom: 12px;">
      <input type="text" id="templateNameInput" placeholder="e.g. example-template" />
      <button id="loadTemplateBtn">Load</button>
    </div>
    <h3>Template Path</h3>
    <div class="modal-action">
      <input type="text" id="manifestPathInput" readonly value="No template loaded" />
      <button id="copyPathBtn">Copy</button>
    </div>
    <h3 style="margin-top:10px;">API URL Settings</h3>
    <div class="modal-action">
      <input type="text" id="apiUrlInput" placeholder="Paste external API URL..." />
      <button id="loadApiBtn">Load API</button>
    </div>
    <div id="copyFeedback">✓ Copied to clipboard!</div>
  `;
  document.body.appendChild(modal);

  // Set values
  if (templateParam) {
    (document.getElementById("manifestPathInput") as HTMLInputElement).value = templateParam;
    try {
      const decoded = atob(templateParam);
      const match = decoded.match(/\/templates\/([^\/]+)\//);
      if (match && match[1]) {
        (document.getElementById("templateNameInput") as HTMLInputElement).value = match[1];
      }
    } catch(e) {}
  }
  
  if (apiUrlParam) {
    const apiInput = document.getElementById("apiUrlInput") as HTMLInputElement;
    try {
      apiInput.value = atob(apiUrlParam);
    } catch(e) {
      apiInput.value = apiUrlParam;
    }
  }

  // Attach events
  document.getElementById("loadTemplateBtn")?.addEventListener("click", () => {
    const tplName = (document.getElementById("templateNameInput") as HTMLInputElement).value.trim();
    if (tplName) {
      const urlParams = new URLSearchParams(window.location.search);
      if (tplName.startsWith("http")) {
        urlParams.set("template", btoa(tplName));
      } else {
        urlParams.set("template", tplName);
      }
      window.location.search = urlParams.toString();
    }
  });

  document.getElementById("loadApiBtn")?.addEventListener("click", () => {
    const aUrl = (document.getElementById("apiUrlInput") as HTMLInputElement).value.trim();
    if (aUrl) {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("apiUrl", btoa(aUrl));
      window.location.search = urlParams.toString();
    }
  });

  document.getElementById("copyPathBtn")?.addEventListener("click", () => {
    const copyText = document.getElementById("manifestPathInput") as HTMLInputElement;
    if (!copyText.value || copyText.value.includes("No template")) return;
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value).then(() => {
      const feedback = document.getElementById("copyFeedback");
      if (feedback) {
        feedback.style.display = "block";
        setTimeout(() => feedback.style.display = "none", 2000);
      }
    });
  });
}
