declare class FlutterChannel {
	postMessage(message: string): void;
}

declare const messageHandler: FlutterChannel | undefined;
