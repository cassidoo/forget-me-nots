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
	const cadence = parseInt(element.dataset.cadence);

	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	const currentSeconds = now.getSeconds();

	const [startHours, startMinutes] = start.split(":");
	const [endHours, endMinutes] = end.split(":");
	const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);
	const endTime = parseInt(endHours) * 60 + parseInt(endMinutes);

	let nextReminder;
	let seconds = 60 - currentSeconds;

	if (currentMinutes < startTime) {
		// Before start time
		nextReminder = startTime - currentMinutes - 1;
		seconds = 60 - currentSeconds;
	} else if (currentMinutes >= endTime) {
		// After end time, wait for next day
		nextReminder = 24 * 60 - currentMinutes + startTime - 1;
		seconds = 60 - currentSeconds;
	} else {
		// Within time window
		const minutesSinceStart = currentMinutes - startTime;
		const nextInterval = Math.ceil((minutesSinceStart + 1) / cadence) * cadence;
		nextReminder = startTime + nextInterval - currentMinutes - 1;

		if (nextReminder < 0) {
			nextReminder = 0;
			seconds = 60 - currentSeconds;
		}
	}

	// Convert to human-readable format
	const hours = Math.floor(nextReminder / 60);
	const minutes = nextReminder % 60;
	const timeStr =
		nextReminder === 0 && seconds === 0
			? "Due now!"
			: `${hours ? hours + "h " : ""}${minutes}m ${seconds}s`;

	element.textContent = `Next: ${timeStr}`;
}

// Function to delete a reminder
async function deleteReminder(id) {
	await ReminderManager.deleteReminder(id);
	await loadReminders();
}
