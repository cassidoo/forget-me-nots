// Wait for DOM to be ready
function injectBanner() {
	const banner = document.createElement("div");
	banner.className = "forget-me-not-banner";
	banner.style.cssText = `
    position: fixed;
    top: -100px;
    left: 0;
    right: 0;
    background: #4caf50;
    color: white;
    padding: 12px;
    text-align: center;
    transition: top 0.3s ease-in-out;
    z-index: 2147483647;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  `;

	// Ensure banner is inserted at the top
	if (document.body.firstChild) {
		document.body.insertBefore(banner, document.body.firstChild);
	} else {
		document.body.appendChild(banner);
	}

	return banner;
}

// Track banner element
let bannerElement = null;

// Ensure banner exists when needed
function getBanner() {
	if (!bannerElement) {
		bannerElement =
			document.querySelector(".forget-me-not-banner") || injectBanner();
	}
	return bannerElement;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("Content script received message:", message);
	if (message.type === "SHOW_REMINDER") {
		showBanner(message.reminder.text);
	}
	sendResponse({ success: true });
	return true;
});

function showBanner(text) {
	const banner = getBanner();
	console.log("Showing banner:", text);

	// Reset any existing animation
	banner.classList.remove("show");
	void banner.offsetWidth; // Force reflow

	banner.textContent = text;
	banner.classList.add("show");
	banner.style.top = "0";

	setTimeout(() => {
		banner.style.top = "-100px";
		banner.classList.remove("show");
	}, 5000);
}

// Initial setup
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => getBanner());
} else {
	getBanner();
}
