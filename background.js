// Check for reminders every minute
chrome.alarms.create("checkReminders", {
	periodInMinutes: 1,
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === "checkReminders") {
		const reminders = await getRemindersDue();
		if (reminders.length > 0) {
			reminders.forEach((reminder) => {
				chrome.notifications.create(`reminder-${reminder.id}`, {
					type: "basic",
					iconUrl: "icons/icon128.png",
					title: "Forget-me-not Reminder",
					message: reminder.text,
				});
			});
		}
	}
});

async function getRemindersDue() {
	return new Promise((resolve) => {
		chrome.storage.local.get(["reminders"], (result) => {
			const now = new Date();
			const currentTime = now.getHours() * 60 + now.getMinutes();

			const dueReminders = (result.reminders || []).filter((reminder) => {
				const [startHours, startMinutes] = reminder.timeWindowStart.split(":");
				const [endHours, endMinutes] = reminder.timeWindowEnd.split(":");
				const startTime = parseInt(startHours) * 60 + parseInt(startMinutes);
				const endTime = parseInt(endHours) * 60 + parseInt(endMinutes);

				return (
					currentTime >= startTime &&
					currentTime <= endTime &&
					currentTime % reminder.cadence === 0
				);
			});

			resolve(dueReminders);
		});
	});
}
