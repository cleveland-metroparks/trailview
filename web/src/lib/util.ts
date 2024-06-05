import type { ZodError } from 'zod';
import z from 'zod';

export function localDateTimeString(date: Date) {
	return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit'
	})}`;
}

export function zodErrorToFormMessage(error: ZodError): { success: boolean; message: string } {
	let message = '';
	error.errors.forEach((e) => {
		message += `\n${e.path[0]}: ${e.message}, `;
	});
	return { success: false, message };
}

export const zodImageId = z.string().length(32);
