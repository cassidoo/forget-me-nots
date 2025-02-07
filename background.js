// Initialize alarms
chrome.runtime.onInstalled.addListener(() => {
	chrome.alarms.create("checkReminders", {
		periodInMinutes: 1,
		delayInMinutes: 0,
	});
});

// Check reminders when alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === "checkReminders") {
		const reminders = await getRemindersDue();
		for (const reminder of reminders) {
			// Send to all tabs
			const tabs = await chrome.tabs.query({});
			tabs.forEach((tab) => {
				chrome.tabs
					.sendMessage(tab.id, {
						type: "SHOW_REMINDER",
						reminder: reminder,
					})
					.catch(() => {
						// Ignore errors for inactive tabs
					});
			});
		}
	}
});

async function getRemindersDue() {
	return new Promise((resolve) => {
		chrome.storage.local.get(["reminders", "lastNotified"], (result) => {
			const now = new Date();
			const currentTime = now.getHours() * 60 + now.getMinutes();
			const lastNotified = result.lastNotified || {};

			console.log("Checking reminders at:", now.toLocaleTimeString());

			const dueReminders = (result.reminders || []).filter((reminder) => {
				const [startHours, startMinutes] = reminder.timeWindowStart.split(":");
				const [endHours, endMinutes] = reminder.timeWindowEnd.split(":");
				const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);
				const endTime = parseInt(endHours) * 60 + parseInt(endMinutes);
				const lastTime =
					lastNotified[reminder.id] || startTime - reminder.cadence;

				// Check if within time window
				const isInWindow = currentTime >= startTime && currentTime <= endTime;

				// Calculate minutes since start of day for last notification
				const minutesSinceLastNotification =
					currentTime >= lastTime
						? currentTime - lastTime
						: 24 * 60 - lastTime + currentTime;

				// Check if enough time has passed since last notification
				const isDue = minutesSinceLastNotification >= reminder.cadence;

				console.log("Checking reminder:", {
					text: reminder.text,
					currentTime,
					lastTime,
					minutesSinceLastNotification,
					cadence: reminder.cadence,
					isInWindow,
					isDue,
				});

				return isInWindow && isDue;
			});

			if (dueReminders.length > 0) {
				// Update last notification times
				const updates = {};
				dueReminders.forEach((r) => (updates[r.id] = currentTime));
				chrome.storage.local.set({
					lastNotified: { ...lastNotified, ...updates },
				});
			}

			resolve(dueReminders);
		});
	});
}
