// Shared by the shipped background artwork and native tap handling. Coordinates
// are relative to the board, so every boundary stays joined at any screen size.
export type ChoicePoint = [number, number];
export type AlignedChoiceRegion = { points: ChoicePoint[]; center: ChoicePoint; copySize: ChoicePoint };
export const alignedChoiceSurfaces = ['#254d62', '#79503e', '#435741', '#454466', '#235c5b', '#713b4b', '#354e6b', '#6a5831', '#554c44'];

export function makeAlignedChoiceRegions(count: number): AlignedChoiceRegion[] {
  const region = (points: ChoicePoint[], center: ChoicePoint, copySize: ChoicePoint): AlignedChoiceRegion => ({ points, center, copySize });
  if (count === 2) return [
    region([[0, 0], [1, 0], [1, .54], [0, .46]], [.5, .24], [.76, .34]),
    region([[0, .46], [1, .54], [1, 1], [0, 1]], [.5, .76], [.76, .34]),
  ];
  if (count === 3) return [
    region([[0, 0], [.5, 0], [.5, .42], [0, .68]], [.24, .25], [.36, .34]),
    region([[.5, 0], [1, 0], [1, .68], [.5, .42]], [.76, .25], [.36, .34]),
    region([[0, .68], [.5, .42], [1, .68], [1, 1], [0, 1]], [.5, .79], [.68, .28]),
  ];
  if (count === 4) return [
    region([[0, 0], [1, 0], [.5, .5]], [.5, .15], [.42, .24]),
    region([[1, 0], [1, 1], [.5, .5]], [.83, .5], [.26, .34]),
    region([[1, 1], [0, 1], [.5, .5]], [.5, .85], [.42, .24]),
    region([[0, 1], [0, 0], [.5, .5]], [.17, .5], [.26, .34]),
  ];
  if (count === 5) return [
    region([[0, 0], [.5, 0], [.5, .28], [.22, .5], [0, .5]], [.23, .21], [.36, .26]),
    region([[.5, 0], [1, 0], [1, .5], [.78, .5], [.5, .28]], [.77, .21], [.36, .26]),
    region([[.5, .28], [.78, .5], [.5, .72], [.22, .5]], [.5, .5], [.30, .20]),
    region([[0, .5], [.22, .5], [.5, .72], [.5, 1], [0, 1]], [.23, .79], [.36, .26]),
    region([[.78, .5], [1, .5], [1, 1], [.5, 1], [.5, .72]], [.77, .79], [.36, .26]),
  ];
  const rows = ({ 6: [2, 2, 2], 7: [2, 3, 2], 8: [3, 2, 3], 9: [3, 3, 3] } as Record<number, number[]>)[count];
  if (!rows) throw new RangeError('Choose between 2 and 9 regions.');
  // Slight, mirrored folds give the rows a shared rhythm without offset edges.
  const boundary = (row: number, x: number): number => row === 0 ? 0 : row === 3 ? 1 : row === 1 ? .34 - .04 * (1 - 2 * Math.abs(x - .5)) : .66 + .04 * (1 - 2 * Math.abs(x - .5));
  return rows.flatMap((columns, row) => Array.from({ length: columns }, (_, column) => {
    const left = column / columns, right = (column + 1) / columns, x = (left + right) / 2;
    const edge = (line: number): ChoicePoint[] => [left, ...(left < .5 && right > .5 ? [.5] : []), right].map(at => [at, boundary(line, at)]);
    return region([...edge(row), ...edge(row + 1).reverse()], [x, (boundary(row, x) + boundary(row + 1, x)) / 2], [.76 / columns, .24]);
  }));
}

export function findAlignedChoiceRegion(regions: AlignedChoiceRegion[], [x, y]: ChoicePoint): number {
  if (x < 0 || x > 1 || y < 0 || y > 1) return -1;
  return regions.findIndex(({ points }) => {
    let inside = false;
    for (let i = 0, previous = points.length - 1; i < points.length; previous = i++) {
      const [ax, ay] = points[previous], [bx, by] = points[i];
      const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
      if (Math.abs(cross) < 1e-9 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true;
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
  });
}
