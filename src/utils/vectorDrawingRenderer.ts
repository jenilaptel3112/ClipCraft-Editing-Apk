import { DrawingData, DrawingStroke, DrawingPoint } from '../types/editor';

/**
 * Calculates cumulative length of points in a stroke.
 */
function getStrokeLength(points: DrawingPoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/**
 * Draws smoothed Catmull-Rom or Bezier spline along points.
 */
function drawSmoothedStroke(
  ctx: CanvasRenderingContext2D,
  points: DrawingPoint[],
  widthRatio: number
) {
  if (points.length === 0) return;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, Math.max(1, (points[0].pressure ?? 1) * widthRatio * 0.5), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midX = (p1.x + p2.x) * 0.5;
    const midY = (p1.y + p2.y) * 0.5;
    ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

/**
 * Renders vector drawing data with animated Trim Paths and Brush styling.
 */
export function renderVectorDrawing(
  ctx: CanvasRenderingContext2D,
  data: DrawingData,
  canvasWidth: number,
  canvasHeight: number
) {
  if (!data || !data.strokes || data.strokes.length === 0) return;

  const startPct = Math.max(0, Math.min(100, data.startTrim ?? 0)) / 100;
  const endPct = Math.max(0, Math.min(100, data.endTrim ?? 100)) / 100;

  if (startPct >= endPct) return; // Entirely trimmed out

  // Calculate total cumulative length of all strokes
  const strokeLengths = data.strokes.map((s) => getStrokeLength(s.points));
  const totalLength = strokeLengths.reduce((acc, l) => acc + l, 0);

  if (totalLength === 0) {
    // Single dots
    for (const stroke of data.strokes) {
      ctx.save();
      ctx.fillStyle = stroke.color;
      ctx.lineCap = stroke.cap || 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width;
      drawSmoothedStroke(ctx, stroke.points, stroke.width);
      ctx.restore();
    }
    return;
  }

  const startDist = totalLength * startPct;
  const endDist = totalLength * endPct;

  let currentDist = 0;

  for (let sIdx = 0; sIdx < data.strokes.length; sIdx++) {
    const stroke = data.strokes[sIdx];
    const strokeLen = strokeLengths[sIdx];
    const strokeStart = currentDist;
    const strokeEnd = currentDist + strokeLen;
    currentDist = strokeEnd;

    // Check if this stroke overlaps the [startDist, endDist] window
    if (strokeEnd < startDist || strokeStart > endDist) {
      continue;
    }

    // Filter points inside the trim window
    const points = stroke.points;
    if (points.length < 2) continue;

    let subPoints: DrawingPoint[] = [];
    let curSubDist = strokeStart;

    for (let i = 0; i < points.length; i++) {
      if (i > 0) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        curSubDist += Math.sqrt(dx * dx + dy * dy);
      }

      if (curSubDist >= startDist && curSubDist <= endDist) {
        subPoints.push(points[i]);
      } else if (curSubDist > endDist && subPoints.length === 0) {
        subPoints.push(points[i]);
        break;
      }
    }

    if (subPoints.length === 0) {
      subPoints = points;
    }

    ctx.save();
    ctx.lineCap = stroke.cap || 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;

    if (stroke.brushType === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = stroke.width * 1.5;
      drawSmoothedStroke(ctx, subPoints, stroke.width);
    } else if (stroke.brushType === 'marker') {
      ctx.globalAlpha = (stroke.opacity ?? 0.5) * 0.6;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      drawSmoothedStroke(ctx, subPoints, stroke.width);
    } else if (stroke.brushType === 'neon') {
      // Pass 1: Outer glow
      ctx.save();
      ctx.globalAlpha = (stroke.opacity ?? 1) * 0.8;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.width * 2;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * 1.4;
      drawSmoothedStroke(ctx, subPoints, stroke.width);
      ctx.restore();

      // Pass 2: White/bright core
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(2, stroke.width * 0.35);
      drawSmoothedStroke(ctx, subPoints, stroke.width);
      ctx.restore();
    } else {
      // Pen / Pencil default
      ctx.globalAlpha = stroke.opacity ?? 1;
      ctx.strokeStyle = stroke.color;
      drawSmoothedStroke(ctx, subPoints, stroke.width);
    }

    ctx.restore();
  }
}
