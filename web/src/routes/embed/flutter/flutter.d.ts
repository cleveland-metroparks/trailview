declare class FlutterChannel {
	postMessage(message: string): void;
}

export const messageHandler: FlutterChannel | undefined;
