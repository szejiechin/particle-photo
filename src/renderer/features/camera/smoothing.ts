export interface Point2D { x: number; y: number }

export function smoothPoint(previous: Point2D | null, current: Point2D, alpha = 0.28): Point2D {
  if (!previous) return current;
  const amount = Math.max(0, Math.min(1, alpha));
  return {
    x: previous.x + (current.x - previous.x) * amount,
    y: previous.y + (current.y - previous.y) * amount,
  };
}
