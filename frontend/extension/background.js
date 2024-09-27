// listen for content script asking for the org ID
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "getOrgId") {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: getOrgId,
            world: 'MAIN',
        }).then((response) => {
            sendResponse({ orgId: response[0].result });
        });
    }
    return true;
});

function getOrgId() {
    try {
        return window.Mkiconf.org_id;
    }
    catch (error) {
        return null;
    }
}

