// Store and retrieve reminders from chrome.storage.local
class ReminderManager {
	static async getAllReminders() {
		return new Promise((resolve) => {
			chrome.storage.local.get(["reminders"], (result) => {
				resolve(result.reminders || []);
			});
		});
	}

	static async addReminder(reminder) {
		const reminders = await this.getAllReminders();
		reminder.id = Date.now(); // Simple way to generate unique IDs
		reminders.push(reminder);
		await chrome.storage.local.set({ reminders });
		return reminder;
	}

	static async deleteReminder(id) {
		const reminders = await this.getAllReminders();
		const updatedReminders = reminders.filter((reminder) => reminder.id !== id);
		await chrome.storage.local.set({ reminders: updatedReminders });
	}
}

// UI Management
document.addEventListener("DOMContentLoaded", () => {
	const addReminderBtn = document.getElementById("add-reminder-btn");
	const addReminderForm = document.getElementById("add-reminder-form");
	const remindersList = document.getElementById("reminders-list");
	const reminderForm = document.getElementById("reminder-form");
	const cancelBtn = document.getElementById("cancel-btn");

	// Load existing reminders
	loadReminders();

	// Event Listeners
	addReminderBtn.addEventListener("click", () => {
		addReminderForm.classList.remove("hidden");
		addReminderBtn.classList.add("hidden");
	});

	cancelBtn.addEventListener("click", () => {
		addReminderForm.classList.add("hidden");
		addReminderBtn.classList.remove("hidden");
		reminderForm.reset();
	});

	reminderForm.addEventListener("submit", async (e) => {
		e.preventDefault();

		const reminder = {
			text: document.getElementById("reminder-text").value,
			timeWindowStart: document.getElementById("time-window-start").value,
			timeWindowEnd: document.getElementById("time-window-end").value,
			cadence: parseInt(document.getElementById("cadence").value),
			created: new Date().toISOString(),
		};

		await ReminderManager.addReminder(reminder);
		await loadReminders();

		addReminderForm.classList.add("hidden");
		addReminderBtn.classList.remove("hidden");
		reminderForm.reset();
	});

	// Add event delegation for delete buttons
	remindersList.addEventListener("click", async (e) => {
		if (e.target.classList.contains("delete-btn")) {
			const id = parseInt(e.target.dataset.id);
			await deleteReminder(id);
		}
	});
});

// Replace window.addEventListener with chrome.runtime.onMessage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("Received message:", message);
	if (message.type === "SHOW_REMINDER") {
		console.log("Showing banner for:", message.reminder.text);
		showBanner(message.reminder.text);
	}
	sendResponse({}); // Acknowledge receipt
	return true; // Keep the message channel open for async responses
});

function showBanner(text) {
	const banner = document.getElementById("notification-banner");
	if (!banner) {
		console.error("Banner element not found");
		return;
	}

	console.log("Displaying banner with text:", text);
	banner.textContent = text;
	banner.classList.add("show");

	// Remove the banner after 5 seconds
	setTimeout(() => {
		banner.classList.remove("show");
	}, 5000);
}

// Function to load and display reminders
async function loadReminders() {
	const remindersList = document.getElementById("reminders-list");
	const reminders = await ReminderManager.getAllReminders();

	if (reminders.length === 0) {
		remindersList.innerHTML = `
      <div class="empty-state">
        No reminders yet. Add one to get started!
      </div>
    `;
		return;
	}

	remindersList.innerHTML = reminders
		.map(
			(reminder) => `
      <div class="reminder-item" data-id="${reminder.id}">
        <div class="reminder-details">
          <div class="reminder-header">
            <span>${reminder.text}</span>
            <span class="countdown" data-start="${reminder.timeWindowStart}" 
                  data-end="${reminder.timeWindowEnd}" 
                  data-cadence="${reminder.cadence}">
              Calculating...
            </span>
          </div>
          <small>
            ${reminder.timeWindowStart} - ${reminder.timeWindowEnd}
            (Every ${reminder.cadence} minutes)
          </small>
        </div>
        <button class="delete-btn" data-id="${reminder.id}">delete</button>
      </div>
    `
		)
		.join("");

	// Start countdown updates
	updateCountdowns();
}

function updateCountdowns() {
	const countdowns = document.querySelectorAll(".countdown");
	countdowns.forEach(updateSingleCountdown);
	setTimeout(updateCountdowns, 1000); // Update every second
}

function updateSingleCountdown(element) {
	const start = element.dataset.start;
	const end = element.dataset.end;
	const cadence = parseFloat(element.dataset.cadence);

	const now = new Date();
	const currentTime =
		(now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();

	const [startHours, startMinutes] = start.split(":");
	const startTimeSeconds =
		(parseInt(startHours) * 60 + parseInt(startMinutes)) * 60;

	const [endHours, endMinutes] = end.split(":");
	const endTimeSeconds = (parseInt(endHours) * 60 + parseInt(endMinutes)) * 60;

	const cadenceSeconds = cadence * 60;
	let timeToNext;

	if (currentTime < startTimeSeconds) {
		// Before start time
		timeToNext = startTimeSeconds - currentTime;
	} else if (currentTime >= endTimeSeconds) {
		// After end time - show time until next day's start
		timeToNext = 24 * 3600 - currentTime + startTimeSeconds;
	} else {
		// Within time window
		const secondsSinceStart = currentTime - startTimeSeconds;
		const nextInterval =
			Math.ceil(secondsSinceStart / cadenceSeconds) * cadenceSeconds;
		timeToNext = startTimeSeconds + nextInterval - currentTime;
	}

	const hours = Math.floor(timeToNext / 3600);
	const minutes = Math.floor((timeToNext % 3600) / 60);
	const seconds = Math.floor(timeToNext % 60);

	element.textContent = `Next: ${
		hours ? hours + "h " : ""
	}${minutes}m ${seconds}s`;
}

// Function to delete a reminder
async function deleteReminder(id) {
	await ReminderManager.deleteReminder(id);
	await loadReminders();
}
