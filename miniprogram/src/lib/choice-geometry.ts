// The website's half-plane tessellation, with portrait anchors for thumb-sized native regions.
export type Point = [number, number];
export type ChoiceRegion = { points: Point[]; center: Point; clip: string; path: string };

const seeds: Point[][] = [
  [[.48, .36], [.52, .73]],
  [[.27, .37], [.75, .39], [.51, .72]],
  [[.26, .37], [.75, .38], [.27, .73], [.75, .72]],
  [[.26, .32], [.75, .33], [.49, .54], [.26, .76], [.75, .75]],
  [[.26, .32], [.75, .33], [.27, .54], [.75, .55], [.26, .77], [.75, .76]],
  [[.25, .32], [.73, .32], [.19, .55], [.50, .54], [.82, .55], [.26, .77], [.75, .77]],
  [[.18, .32], [.49, .33], [.81, .32], [.26, .54], [.74, .55], [.18, .77], [.50, .77], [.82, .77]],
  [[.18, .32], [.49, .33], [.81, .32], [.18, .55], [.50, .54], [.82, .55], [.18, .77], [.50, .76], [.82, .77]],
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
