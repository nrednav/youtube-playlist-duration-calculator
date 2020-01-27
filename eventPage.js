chrome.runtime.onMessage.addListener((req, res, sendResponse) => {
  if (req.todo === "showPageAction") {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function (tabs) {
      chrome.pageAction.show(tabs[0].id);
    });
  }
});