export function localDateTimeString(date: Date) {
	return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit'
	})}`;
}
