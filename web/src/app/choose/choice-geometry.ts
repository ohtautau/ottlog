export type Point = [number, number];
export type ChoiceRegion = { points: Point[]; center: Point; clip: string; path: string };

const seeds: Point[][] = [
  [[.25, .52], [.76, .43]],
  [[.23, .33], [.77, .32], [.50, .79]],
  [[.24, .27], [.75, .34], [.28, .76], [.77, .77]],
  [[.17, .30], [.5, .26], [.83, .31], [.29, .76], [.72, .74]],
  [[.17, .28], [.51, .25], [.83, .32], [.19, .76], [.53, .72], [.85, .77]],
  [[.16, .24], [.51, .23], [.84, .27], [.28, .51], [.74, .52], [.23, .81], [.74, .81]],
  [[.16, .23], [.51, .24], [.84, .25], [.27, .51], [.73, .53], [.16, .81], [.49, .79], [.84, .81]],
  [[.16, .23], [.49, .24], [.84, .24], [.18, .51], [.53, .50], [.84, .53], [.16, .81], [.50, .79], [.83, .81]],
];

// Half-plane clipping creates a complete tessellation without holes or overlaps.
export function makeChoiceRegions(count: number): ChoiceRegion[] {
  const anchors = seeds[count - 2];
  if (!anchors) throw new RangeError('Choose between 2 and 9 regions.');
  return anchors.map((anchor, index) => {
    let polygon: Point[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    anchors.forEach((other, otherIndex) => {
      if (index === otherIndex) return;
      const nx = other[0] - anchor[0], ny = other[1] - anchor[1];
      const limit = (other[0] ** 2 + other[1] ** 2 - anchor[0] ** 2 - anchor[1] ** 2) / 2;
      const distance = ([x, y]: Point) => x * nx + y * ny - limit;
      const clipped: Point[] = [];
      polygon.forEach((current, i) => {
        const previous = polygon[(i + polygon.length - 1) % polygon.length];
        const a = distance(previous), b = distance(current);
        if ((a <= 0) !== (b <= 0)) {
          const ratio = a / (a - b);
          clipped.push([previous[0] + (current[0] - previous[0]) * ratio, previous[1] + (current[1] - previous[1]) * ratio]);
        }
        if (b <= 0) clipped.push(current);
      });
      polygon = clipped;
    });
    return {
      points: polygon,
      center: anchor,
      clip: `polygon(${polygon.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(',')})`,
      path: polygon.map(([x, y]) => `${x * 1000},${y * 1000}`).join(' '),
    };
  });
}
