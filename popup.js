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
          <div>${reminder.text}</div>
          <small>
            ${reminder.timeWindowStart} - ${reminder.timeWindowEnd}
            (Every ${reminder.cadence} minutes)
          </small>
        </div>
        <button class="delete-btn" onclick="deleteReminder(${reminder.id})">✕</button>
      </div>
    `
		)
		.join("");
}

// Function to delete a reminder
async function deleteReminder(id) {
	await ReminderManager.deleteReminder(id);
	await loadReminders();
}
