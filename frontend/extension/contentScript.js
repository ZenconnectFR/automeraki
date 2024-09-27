// create the popup window
let popupWindow = document.createElement("dialog");
popupWindow.className = "PanelFloat";
popupWindow.id = "popup-window";

// Give the popup element it's HTML content and add it to the document body
// The css class "PanelFloat" is used to style the popup window
// Since the popup window is a dialog element, it is hidden by default and can be shown by calling the showModal() method (see close button event)
let vueContainer = document.createElement('div');
vueContainer.id = "app";

// ask background script for the org ID
console.log('[IKO] asking for org id');
chrome.runtime.sendMessage({ message: "getOrgId" }, (response) => {
    console.log("[IKO] response", response);
    if (response.orgId) {
        vueContainer.setAttribute("data-org-id", response.orgId);
    }
});

popupWindow.appendChild(vueContainer);

// add close button to the popup window
let closeButton = document.createElement("button");
closeButton.id = "popup-window-close";
closeButton.innerHTML = "Close";
closeButton.className = "mds-button mds-button-kind-primary mds-button-size-md";

// close button event
closeButton.onclick = () => {
    popupWindow.close(); // js method to close the dialog element
    document.body.style.overflow = "auto"; // re-enable scrolling
};

// Get the new network setup container (where the options for creating a new network are displayed)
let setupContainer = document.querySelectorAll("[data-testid=set_up_container]")[0];

// Might be null if the page has the old ui
if (!setupContainer) {
    // Get the container on the old ui
    setupContainer = document.querySelectorAll("[data-testid=\"Network configuration-config-item\"]")[0];
}

// Add the close button to the popup window
popupWindow.appendChild(closeButton);

// Add the popup window to the document body
document.body.appendChild(popupWindow);

// ----------------------- VUE APP -----------------------
injectVueApp = () => {
    // Inject the vue css file
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("dist/assets/app.css");
    document.body.appendChild(link);

    // Inject the vue app script
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("dist/assets/app.js");
    document.body.appendChild(script);
}

// ----------------------- INITIALIZATION -----------------------

// Add the new button to the setup container
function addButton() {
    // Get the div that contains the setup options
    // If the website changes, this might need to be updated, it might not be the first child of the setup container
    // and the setup container class name might change, you will need to inspect the network creation page to find the correct class name
    let childDiv = setupContainer.children[0];

    // Create the button
    let button = document.createElement("button");

    // Set the button properties
    button.innerHTML = "Create from template";
    button.className = "mds-button mds-button-kind-primary mds-button-size-md"; // same class as the other buttons on the page for consistency
    button.style.width = "fit-content";
    button.style.padding = "10 16px";

    // Set the click event
    button.onclick = () => {
        // Show the popup window
        popupWindow.showModal(); // js method to show the dialog element
        document.body.style.overflow = "hidden"; // disable scrolling when the popup is open

        injectVueApp(); // call the function to inject the Vue app
    };

    // Add the button to the setup container
    childDiv.appendChild(button);
};

// Call the function to add the button
addButton();

// Retrive the org ID from window.dataLayer and pass it to the Vue app via the
