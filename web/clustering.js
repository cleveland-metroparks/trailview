import { handler } from './build/handler.js';
import cluster from 'cluster';
import http from 'http';

if (cluster.isPrimary) {
	console.log(`Master ${process.pid} is running`);

	const clusterWorkersStr = process.env.TV_CLUSTER_WORKERS ?? '4';
	const clusterWorkers = parseInt(clusterWorkersStr);
	console.log(`Starting with ${clusterWorkers} workers`);

	for (let i = 0; i < clusterWorkers; ++i) {
		cluster.fork();
	}

	cluster.on('message', (_, message) => {
		for (const id in cluster.workers) {
			cluster.workers[id].send(message);
		}
	});

	cluster.on('exit', (worker, code) => {
		console.log(`Worker ${worker.process.pid} died`);
		if (code !== 0) {
			console.log(`Starting new worker`);
			cluster.fork();
		}
	});

	process.on('SIGTERM', () => {
		console.log(`Master received SIGTERM, shutting down`);
		for (const id in cluster.workers) {
			cluster.workers[id].kill('SIGTERM');
		}
		process.exit(0);
	});

	process.on('SIGINT', () => {
		console.log(`Master received SIGINT, shutting down`);
		for (const id in cluster.workers) {
			cluster.workers[id].kill('SIGINT');
		}
		process.exit(0);
	});
} else {
	const portStr = process.env.PORT ?? '3000';
	const port = parseInt(portStr);

	const server = http
		.createServer((req, res) => {
			handler(req, res);
		})
		.listen(port);

	console.log(`Worker ${process.pid} started`);

	process.on('SIGTERM', () => {
		console.log(`Worker received SIGTERM, shutting down`);
		server.close(() => {
			process.exit(0);
		});
	});

	process.on('SIGINT', () => {
		console.log(`Worker received SIGINT, shutting down`);
		server.close(() => {
			process.exit(0);
		});
	});
}
