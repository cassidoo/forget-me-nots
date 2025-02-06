// Initialize alarms
chrome.runtime.onInstalled.addListener(() => {
	chrome.alarms.create("checkReminders", {
		periodInMinutes: 1,
		delayInMinutes: 0,
	});
	console.log("Main alarm created");
});

// Check reminders when alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === "checkReminders") {
		const reminders = await getRemindersDue();
		for (const reminder of reminders) {
			try {
				const notificationId = `reminder-${reminder.id}-${Date.now()}`;
				await chrome.notifications.create(notificationId, {
					type: "basic",
					iconUrl: "/icons/icon128.png",
					title: "Forget-me-not Reminder",
					message: reminder.text,
					priority: 2,
					requireInteraction: false,
				});

				// Create an alarm to clear this specific notification
				chrome.alarms.create(`clear-${notificationId}`, {
					delayInMinutes: 0.2, // Clear after 12 seconds
				});
			} catch (error) {
				console.error("Notification error:", error);
			}
		}
	} else if (alarm.name.startsWith("clear-")) {
		const notificationId = alarm.name.replace("clear-", "");
		chrome.notifications.clear(notificationId);
	}
});

async function getRemindersDue() {
	return new Promise((resolve) => {
		chrome.storage.local.get(["reminders", "lastNotified"], (result) => {
			const now = new Date();
			const currentTime = now.getHours() * 60 + now.getMinutes();
			const lastNotified = result.lastNotified || {};

			const dueReminders = (result.reminders || []).filter((reminder) => {
				const [startHours, startMinutes] = reminder.timeWindowStart.split(":");
				const [endHours, endMinutes] = reminder.timeWindowEnd.split(":");
				const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);
				const endTime = parseInt(endHours) * 60 + parseInt(endMinutes);
				const lastTime = lastNotified[reminder.id] || 0;

				const isInWindow = currentTime >= startTime && currentTime <= endTime;
				const isDue = currentTime - lastTime >= reminder.cadence;
				const isOnInterval = (currentTime - startTime) % reminder.cadence === 0;

				return isInWindow && isDue && isOnInterval;
			});

			if (dueReminders.length > 0) {
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

// Clear notifications on click
chrome.notifications.onClicked.addListener((notificationId) => {
	chrome.notifications.clear(notificationId);
});
