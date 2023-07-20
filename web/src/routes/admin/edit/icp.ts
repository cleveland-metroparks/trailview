export type Vec2 = {
	x: number;
	y: number;
};

export type Line2 = {
	p1: Vec2;
	p2: Vec2;
};

function dotProduct(a: Vec2, b: Vec2): number {
	return a.x * b.x + a.y * b.y;
}

function subtract(a: Vec2, b: Vec2): Vec2 {
	return { x: a.x - b.x, y: a.y - b.y };
}

export function degreeToVector(degrees: number): Vec2 {
	const radians = (degrees * Math.PI) / 180;
	return { x: Math.cos(radians), y: Math.sin(radians) };
}

export function closestIntersection(
	linePoint: Vec2,
	lineVec: Vec2,
	segments: Line2[]
): Vec2 | null {
	let closestIntersectionPoint: Vec2 | null = null;
	let closestDistanceSquared = Infinity;

	const perp = { x: -lineVec.y, y: lineVec.x }; // Rotate vector by 90 degrees to get the perpendicular direction

	for (const line of segments) {
        const segmentVector = subtract(line.p2, line.p1);

        const denom = dotProduct(perp, segmentVector);
        if (denom === 0) {
            continue;
        }

        const lineToPointVector = subtract(linePoint, line.p1);
        const t = dotProduct(perp, lineToPointVector) / denom;
        if (t < 0 || t > 1) {
            continue;
        }
        const ix = line.p1.x + t * segmentVector.x;
        const iy = line.p1.y + t * segmentVector.y;
        const dist = Math.pow(linePoint.x - ix, 2) + Math.pow(linePoint.y - iy, 2);
        if (dist < closestDistanceSquared) {
            closestIntersectionPoint = {x: ix, y: iy};
            closestDistanceSquared = dist;
        }
	}

	return closestIntersectionPoint;
}
