import type { Readable } from 'node:stream';
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

export function readableToWebStream(stream: Readable): ReadableStream {
	let ended = false;
	return new ReadableStream({
		start(controller) {
			stream.on('data', (chunk) => {
				if (ended === false) {
					controller.enqueue(chunk);
				}
			});
			stream.on('end', () => {
				if (ended === false) {
					ended = true;
					controller.close();
					stream.destroy();
				}
			});
			stream.on('error', (err) => {
				if (ended === false) {
					ended = true;
					controller.error(err);
					stream.destroy();
				}
			});
		},
		cancel() {
			if (ended === false) {
				ended = true;
				stream.destroy();
			}
		}
	});
}
