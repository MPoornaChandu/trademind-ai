import { DASHBOARD_URL, type RuntimeRequest, type RuntimeResponse } from "./constants.js";

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel?.setPanelBehavior) {
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && chrome.sidePanel?.open) {
    await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse: (response: RuntimeResponse) => void) => {
  if (request.type === "TRADEMIND_OPEN_DASHBOARD") {
    void chrome.tabs.create({ url: DASHBOARD_URL });
    sendResponse({ ok: true });
    return false;
  }

  if (request.type !== "TRADEMIND_DETECT_SYMBOL") {
    return false;
  }

  void detectFromActiveTab().then(sendResponse);
  return true;
});

async function detectFromActiveTab(): Promise<RuntimeResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: "No active tab available." };
  }

  try {
    const response = await chrome.tabs.sendMessage<RuntimeRequest, RuntimeResponse>(tab.id, { type: "TRADEMIND_DETECT_SYMBOL" });
    return response;
  } catch {
    const detection = {
      symbol: null,
      source: "manual input required",
      ...(tab.title ? { pageTitle: tab.title } : {}),
      ...(tab.url ? { pageUrl: tab.url } : {})
    };

    return {
      ok: true,
      detection
    };
  }
}
