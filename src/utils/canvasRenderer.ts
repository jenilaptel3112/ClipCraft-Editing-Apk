import { TimelineClip, TrackMeta, SyntheticSceneType, FitMode } from '../types/editor';
import { getInterpolatedTransform } from './presets';
import { renderVectorDrawing } from './vectorDrawingRenderer';

// Build CSS filter string from clip's ColorGrading
export function buildCssFilter(clip: TimelineClip, isDraft: boolean = false): string {
  const cg = clip.colorGrading;
  const exposureMultiplier = 1 + cg.exposure / 100;
  const b = Math.round(cg.brightness * exposureMultiplier);
  const c = cg.contrast;
  const s = cg.saturation;
  const sepia = cg.warmth > 0 ? Math.round(cg.warmth * 0.6) : 0;
  const hue = cg.warmth < 0 ? Math.round(cg.warmth * 0.45) : 0;
  const blur = !isDraft && cg.blur > 0 ? `blur(${cg.blur * 0.5}px)` : '';

  return `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sepia}%) hue-rotate(${hue}deg) ${blur}`.trim();
}

// Draw procedural synthetic background scenes
function drawSyntheticScene(
  ctx: CanvasRenderingContext2D,
  scene: SyntheticSceneType,
  localTime: number,
  w: number,
  h: number
) {
  const t = localTime;

  if (scene === 'neon-horizon') {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    skyGrad.addColorStop(0, '#070918');
    skyGrad.addColorStop(0.55, '#1E1B4B');
    skyGrad.addColorStop(1, '#BE185D');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const sunRadius = Math.min(w, h) * 0.22;
    const sunX = w * 0.5;
    const sunY = h * 0.42 + Math.sin(t * 1.2) * 8;
    const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
    sunGrad.addColorStop(0, '#FDE047');
    sunGrad.addColorStop(0.5, '#F97316');
    sunGrad.addColorStop(1, '#EC4899');

    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = sunGrad;
    ctx.shadowColor = '#F43F5E';
    ctx.shadowBlur = 30;
    ctx.fill();
    ctx.restore();

    const horizonY = h * 0.58;
    const floorGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    floorGrad.addColorStop(0, '#0F172A');
    floorGrad.addColorStop(1, '#020617');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;

    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * (w * 0.02), horizonY);
      ctx.lineTo(w * 0.5 + i * (w * 0.16), h);
      ctx.stroke();
    }

    const speedOffset = (t * 1.4) % 1;
    for (let j = 0; j < 8; j++) {
      const progress = (j + speedOffset) / 8;
      const yPos = horizonY + Math.pow(progress, 2.1) * (h - horizonY);
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(w, yPos);
      ctx.stroke();
    }
  } else if (scene === 'golden-waves') {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#451A03');
    bgGrad.addColorStop(0.45, '#D97706');
    bgGrad.addColorStop(0.75, '#F59E0B');
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    for (let layer = 0; layer < 4; layer++) {
      ctx.beginPath();
      const baseY = h * (0.42 + layer * 0.12);
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) {
        const wave =
          Math.sin(x * 0.012 + t * (1.8 + layer * 0.3) + layer) * (18 + layer * 4) +
          Math.cos(x * 0.006 - t * 1.1) * 10;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      const alpha = 0.25 + layer * 0.15;
      ctx.fillStyle = layer % 2 === 0 ? `rgba(15, 23, 42, ${alpha})` : `rgba(180, 83, 9, ${alpha})`;
      ctx.fill();
    }
  } else if (scene === 'aurora-drift') {
    const nightGrad = ctx.createLinearGradient(0, 0, w, h);
    nightGrad.addColorStop(0, '#020617');
    nightGrad.addColorStop(0.5, '#0F172A');
    nightGrad.addColorStop(1, '#064E3B');
    ctx.fillStyle = nightGrad;
    ctx.fillRect(0, 0, w, h);

    const colors = ['rgba(16, 185, 129, 0.35)', 'rgba(56, 189, 248, 0.3)'];
    colors.forEach((color, idx) => {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      for (let x = 0; x <= w; x += 24) {
        const y =
          h * (0.28 + idx * 0.18) +
          Math.sin(x * 0.008 + t * (1.5 + idx * 0.4)) * 50 +
          Math.cos(x * 0.015 - t * 0.9) * 25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    });
  } else if (scene === 'prism-bokeh') {
    const cardGrad = ctx.createLinearGradient(0, 0, w, h);
    cardGrad.addColorStop(0, '#311042');
    cardGrad.addColorStop(0.5, '#1E1B4B');
    cardGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = cardGrad;
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    for (let i = 0; i < 4; i++) {
      const angle = t * 1.4 + (i * Math.PI) / 2;
      const ox = cx + Math.cos(angle) * (w * 0.18);
      const oy = cy + Math.sin(angle) * (h * 0.18);
      const r = Math.min(w, h) * (0.14 + (i % 2) * 0.06);
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 63, 94, 0.38)' : 'rgba(56, 189, 248, 0.38)';
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);
  }
}

// CapCut-Style Stacked Video Effects Processor
export function applyCapCutVideoEffects(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  localTime: number,
  w: number,
  h: number,
  isDraft: boolean = false
): { extraOffsetX: number; extraOffsetY: number; extraScale: number } {
  let extraOffsetX = 0;
  let extraOffsetY = 0;
  let extraScale = 1;

  if (!clip.activeEffects || clip.activeEffects.length === 0) {
    return { extraOffsetX, extraOffsetY, extraScale };
  }

  // Iterate up to 2 active stacked effects
  for (const eff of clip.activeEffects.slice(0, 2)) {
    const intensityNorm = eff.intensity / 50; // 1.0 at default 50
    const speedFactor = eff.speed || 1.0;

    switch (eff.type) {
      case 'camera-shake': {
        // High-frequency randomized Math.sin/cos translation for impact beats
        const freq = 18 * speedFactor;
        const amplitude = Math.min(w, h) * 0.024 * intensityNorm;
        extraOffsetX += (Math.sin(localTime * freq) + Math.cos(localTime * freq * 1.7)) * amplitude;
        extraOffsetY += (Math.cos(localTime * freq * 1.3) + Math.sin(localTime * freq * 2.1)) * amplitude;
        break;
      }

      case 'slow-zoom': {
        // Smooth cinematic push-in exponential ramp (1.0x to 1.18x)
        const rampProgress = Math.min(1, localTime / Math.max(1, clip.duration));
        const maxZoom = 0.18 * intensityNorm;
        extraScale *= 1.0 + maxZoom * Math.pow(rampProgress, 1.4);
        break;
      }

      case 'edge-glow': {
        if (!isDraft) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const glowAlpha = Math.min(0.7, 0.35 * (eff.glow / 50));
          const glowGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
          glowGrad.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha * 0.8})`);
          glowGrad.addColorStop(0.6, `rgba(245, 158, 11, ${glowAlpha * 0.4})`);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
        break;
      }

      case 'rgb-split': {
        // Anamorphic Chromatic Aberration channel offsets
        const offsetPx = Math.round(6 * intensityNorm * (Math.sin(localTime * 4 * speedFactor) * 0.5 + 0.5));
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * intensityNorm})`;
        ctx.lineWidth = Math.max(1, offsetPx);
        ctx.strokeRect(offsetPx, -offsetPx, w - offsetPx * 2, h + offsetPx * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 * intensityNorm})`;
        ctx.strokeRect(-offsetPx, offsetPx, w + offsetPx * 2, h - offsetPx * 2);
        ctx.restore();
        break;
      }

      case 'white-strobe': {
        // Flash / White strobe with 150ms decay curve on clip entrance or beat triggers
        const strobeInterval = 1.0 / speedFactor;
        const phase = (localTime % strobeInterval);
        const flashDecaySpan = 0.15;
        if (phase < flashDecaySpan) {
          const flashAlpha = (1 - phase / flashDecaySpan) * 0.85 * intensityNorm;
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
        break;
      }

      case 'film-grain': {
        if (!isDraft) {
          ctx.save();
          const grainAlpha = Math.min(0.25, 0.08 * intensityNorm);
          ctx.fillStyle = `rgba(255, 255, 255, ${grainAlpha})`;
          for (let i = 0; i < 40; i++) {
            const gx = (i * 97 + localTime * 850) % w;
            const gy = (i * 53 + localTime * 670) % h;
            ctx.fillRect(gx, gy, 2, 2);
          }
          ctx.restore();
        }
        break;
      }

      case 'lens-blur': {
        // Focus pull: resolves from blur into crisp focus
        const pullProgress = Math.min(1, localTime / 1.2);
        const currentBlur = (1 - pullProgress) * (eff.blur || 14) * intensityNorm;
        if (currentBlur > 0.5 && !isDraft) {
          ctx.filter = `blur(${currentBlur.toFixed(1)}px)`;
        }
        break;
      }

      case 'bw-pop': {
        // Black and white pop with center vignette
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        const rad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
        rad.addColorStop(0, 'rgba(0,0,0,0)');
        rad.addColorStop(1, `rgba(0,0,0,${0.7 * intensityNorm})`);
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        break;
      }
    }
  }

  return { extraOffsetX, extraOffsetY, extraScale };
}

// Kinetic Text Engine with In/Out/Loop animations & Viral Presets (Karaoke, Bouncy)
function drawCapCutTextClip(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  playheadTime: number,
  w: number,
  h: number
) {
  if (!clip.textStyle) return;
  const ts = clip.textStyle;
  const localTime = Math.max(0, playheadTime - clip.startTime);
  const remainingTime = Math.max(0, clip.duration - localTime);

  let extraScale = 1;
  let extraYOffset = 0;
  let animAlpha = 1;

  // 1. IN ANIMATIONS (First 0.45s)
  const inDuration = 0.45;
  if (localTime < inDuration) {
    const p = localTime / inDuration;
    switch (ts.inAnimation) {
      case 'pop-bounce': {
        // Bouncy spring curve
        extraScale = p < 0.6 ? (p / 0.6) * 1.2 : 1.2 - ((p - 0.6) / 0.4) * 0.2;
        break;
      }
      case 'slide-up': {
        extraYOffset = (1 - p) * 45;
        animAlpha = p;
        break;
      }
      case 'fade': {
        animAlpha = p;
        break;
      }
      case 'typewriter': {
        // Handled below character-by-character
        break;
      }
    }
  }

  // 2. OUT ANIMATIONS (Last 0.4s)
  const outDuration = 0.4;
  if (remainingTime < outDuration && ts.outAnimation !== 'none') {
    const p = remainingTime / outDuration; // 1 -> 0
    switch (ts.outAnimation) {
      case 'slide-down': {
        extraYOffset = (1 - p) * 45;
        animAlpha = p;
        break;
      }
      case 'zoom-out': {
        extraScale = Math.max(0.1, p);
        animAlpha = p;
        break;
      }
      case 'glitch-dissolve': {
        animAlpha = Math.random() > 0.3 ? p : 0;
        extraYOffset = (Math.random() - 0.5) * 8;
        break;
      }
    }
  }

  // 3. LOOP ANIMATIONS (During active body)
  if (localTime >= inDuration && remainingTime >= outDuration) {
    switch (ts.loopAnimation) {
      case 'heartbeat': {
        const beat = Math.sin(localTime * 6);
        extraScale = 1.0 + (beat > 0.4 ? 0.08 * beat : 0);
        break;
      }
      case 'float': {
        extraYOffset = Math.sin(localTime * 3.5) * 6;
        break;
      }
      case 'neon-flicker': {
        if (Math.sin(localTime * 14) > 0.85) {
          animAlpha = 0.6;
        }
        break;
      }
    }
  }

  ctx.save();
  ctx.scale(extraScale, extraScale);
  ctx.translate(0, extraYOffset);
  ctx.globalAlpha *= animAlpha;

  const responsiveFontSize = Math.round(ts.fontSize * (Math.min(w, h) / 540));
  ctx.font = `${ts.fontWeight} ${responsiveFontSize}px "${ts.fontFamily}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 4. VIRAL SUBTITLE / CAPTION PRESETS
  if (ts.presetStyle === 'karaoke-active') {
    // Word-by-word karaoke highlight style
    const words = ts.content.split(' ');
    const totalWords = Math.max(1, words.length);
    const activeWordIndex = Math.min(
      totalWords - 1,
      Math.floor((localTime / clip.duration) * totalWords)
    );

    // Measure total line
    const fullTextMetrics = ctx.measureText(ts.content);
    let currentX = -fullTextMetrics.width / 2;

    words.forEach((word, idx) => {
      const wordMetrics = ctx.measureText(word + ' ');
      const isWordActive = idx === activeWordIndex;

      ctx.save();
      if (isWordActive) {
        ctx.scale(1.12, 1.12);
        ctx.fillStyle = '#F59E0B'; // Highlight active word in golden amber
      } else {
        ctx.fillStyle = ts.color;
      }

      if (ts.strokeWidth > 0) {
        ctx.strokeStyle = ts.strokeColor;
        ctx.lineWidth = ts.strokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(word, currentX + wordMetrics.width / 2, 0);
      }

      ctx.fillText(word, currentX + wordMetrics.width / 2, 0);
      ctx.restore();

      currentX += wordMetrics.width;
    });

    ctx.restore();
    return;
  }

  // Handle standard or typewriter text
  let displayText = ts.content;
  if (ts.inAnimation === 'typewriter') {
    const typeSpan = Math.min(1.5, clip.duration * 0.7);
    const charRatio = Math.min(1, localTime / Math.max(0.2, typeSpan));
    const charCount = Math.ceil(ts.content.length * charRatio);
    displayText = ts.content.slice(0, charCount);
  }

  const metrics = ctx.measureText(displayText || ' ');
  const textWidth = metrics.width;
  const textHeight = responsiveFontSize * 1.25;

  // Background Pill Box with adjustable radius and padding
  if (ts.bgEnabled) {
    const pad = ts.bgPadding || 10;
    const radius = ts.bgRadius || 8;
    ctx.fillStyle = ts.bgColor;
    const rx = -textWidth / 2 - pad;
    const ry = -textHeight / 2 - pad / 2;
    const rw = textWidth + pad * 2;
    const rh = textHeight + pad;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, radius);
    ctx.fill();
  }

  // Drop Shadow
  if (ts.shadowBlur > 0) {
    ctx.shadowColor = ts.shadowColor || 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = ts.shadowBlur;
    ctx.shadowOffsetY = ts.shadowDistance || 3;
  }

  // Border / Stroke
  if (ts.strokeWidth > 0) {
    ctx.strokeStyle = ts.strokeColor;
    ctx.lineWidth = ts.strokeWidth * 2;
    ctx.lineJoin = 'round';
    ctx.strokeText(displayText, 0, 0);
  }

  ctx.fillStyle = ts.color;
  ctx.fillText(displayText, 0, 0);
  ctx.restore();
}

// Reusable offscreen canvas
let sharedOffscreenCanvas: HTMLCanvasElement | null = null;
let sharedOffscreenCtx: CanvasRenderingContext2D | null = null;

function getSharedOffscreenContext(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  if (typeof window === 'undefined') return null;
  if (!sharedOffscreenCanvas) {
    sharedOffscreenCanvas = document.createElement('canvas');
    sharedOffscreenCtx = sharedOffscreenCanvas.getContext('2d', { alpha: false });
  }
  if (sharedOffscreenCanvas.width !== width || sharedOffscreenCanvas.height !== height) {
    sharedOffscreenCanvas.width = width;
    sharedOffscreenCanvas.height = height;
  }
  if (!sharedOffscreenCtx) return null;
  return { canvas: sharedOffscreenCanvas, ctx: sharedOffscreenCtx };
}

// Render composite frame across all visible tracks
export function renderCompositeFrame(
  targetCtx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  playheadTime: number,
  clips: TimelineClip[],
  tracks: TrackMeta[],
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  fitMode: FitMode,
  selectedClipId: string | null,
  showSafeGuides: boolean = false,
  isDraftScrubbing: boolean = false
) {
  const renderScale = isDraftScrubbing ? 0.5 : 1;
  const rw = Math.round(canvasWidth * renderScale);
  const rh = Math.round(canvasHeight * renderScale);

  const offscreen = getSharedOffscreenContext(rw, rh);
  const ctx = offscreen?.ctx || targetCtx;

  ctx.save();
  ctx.clearRect(0, 0, rw, rh);
  ctx.fillStyle = '#07080C';
  ctx.fillRect(0, 0, rw, rh);

  const layerOrder: ('video' | 'overlay' | 'text')[] = ['video', 'overlay', 'text'];

  for (const trackType of layerOrder) {
    const trackMeta = tracks.find((t) => t.id === trackType);
    if (trackMeta && !trackMeta.visible) continue;

    const activeClips = clips
      .filter(
        (c) =>
          c.trackId === trackType &&
          playheadTime >= c.startTime &&
          playheadTime < c.startTime + c.duration
      )
      .sort((a, b) => a.startTime - b.startTime);

    for (const clip of activeClips) {
      const localTime = (playheadTime - clip.startTime) * clip.speed;
      const rawClipElapsed = playheadTime - clip.startTime;
      const transform = getInterpolatedTransform(clip, playheadTime);

      // Apply CapCut video effects offset & scale (Shake, Slow Zoom)
      const capcutEffectMotion = applyCapCutVideoEffects(ctx, clip, localTime, rw, rh, isDraftScrubbing);

      let fadeAlpha = 1;
      if (clip.fadeIn > 0 && rawClipElapsed < clip.fadeIn) {
        fadeAlpha = rawClipElapsed / clip.fadeIn;
      }
      const remaining = clip.duration - rawClipElapsed;
      if (clip.fadeOut > 0 && remaining < clip.fadeOut) {
        fadeAlpha = Math.min(fadeAlpha, Math.max(0, remaining / clip.fadeOut));
      }

      let transScale = 1;
      let transOffsetX = 0;
      let transAlpha = 1;

      if (
        clip.transitionIn.type !== 'none' &&
        clip.transitionIn.duration > 0 &&
        rawClipElapsed < clip.transitionIn.duration
      ) {
        const tp = Math.max(0, Math.min(1, rawClipElapsed / clip.transitionIn.duration));
        const eased = tp * (2 - tp);
        if (clip.transitionIn.type === 'crossfade') {
          transAlpha = eased;
        } else if (clip.transitionIn.type === 'zoom-in') {
          transScale = 0.65 + 0.35 * eased;
          transAlpha = eased;
        } else if (clip.transitionIn.type === 'whip-pan') {
          transOffsetX = (1 - eased) * rw * 0.85;
          transAlpha = eased;
        }
      }

      ctx.save();

      const centerX =
        rw / 2 +
        (transform.x / 100) * rw +
        transOffsetX +
        capcutEffectMotion.extraOffsetX;
      const centerY =
        rh / 2 +
        (transform.y / 100) * rh +
        capcutEffectMotion.extraOffsetY;

      ctx.translate(centerX, centerY);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(
        transform.scale * transScale * capcutEffectMotion.extraScale,
        transform.scale * transScale * capcutEffectMotion.extraScale
      );
      ctx.globalAlpha = Math.max(0, Math.min(1, transform.opacity * fadeAlpha * transAlpha));

      if (clip.mediaType === 'text') {
        drawCapCutTextClip(ctx, clip, playheadTime, rw, rh);
      } else if (clip.mediaType === 'drawing' && clip.drawingData) {
        ctx.save();
        ctx.translate(-rw / 2, -rh / 2);
        renderVectorDrawing(ctx, clip.drawingData, rw, rh);
        ctx.restore();
      } else if (clip.mediaType === 'null') {
        // Null object anchor outline in edit mode
        if (selectedClipId === clip.id) {
          ctx.save();
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.strokeRect(-40, -40, 80, 80);
          ctx.beginPath();
          ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
          ctx.moveTo(0, -10); ctx.lineTo(0, 10);
          ctx.stroke();
          ctx.restore();
        }
      } else if (clip.mediaType === 'camera') {
        // Camera layer is non-physical in 2D preview
      } else {
        ctx.filter = buildCssFilter(clip, isDraftScrubbing);

        ctx.save();
        ctx.translate(-rw / 2, -rh / 2);

        const mediaEl = mediaElements.get(clip.id);
        if (mediaEl) {
          let srcW = rw;
          let srcH = rh;
          if (mediaEl instanceof HTMLVideoElement) {
            srcW = mediaEl.videoWidth || rw;
            srcH = mediaEl.videoHeight || rh;
          } else if (mediaEl instanceof HTMLImageElement) {
            srcW = mediaEl.naturalWidth || rw;
            srcH = mediaEl.naturalHeight || rh;
          }

          if (fitMode === 'fill') {
            ctx.drawImage(mediaEl, 0, 0, rw, rh);
          } else {
            const scaleRatio =
              fitMode === 'cover'
                ? Math.max(rw / srcW, rh / srcH)
                : Math.min(rw / srcW, rh / srcH);
            const drawW = srcW * scaleRatio;
            const drawH = srcH * scaleRatio;
            const dx = (rw - drawW) / 2;
            const dy = (rh - drawH) / 2;
            ctx.drawImage(mediaEl, dx, dy, drawW, drawH);
          }
        } else if (clip.syntheticScene) {
          drawSyntheticScene(
            ctx,
            clip.syntheticScene,
            clip.sourceStartOffset + localTime,
            rw,
            rh
          );
        }

        ctx.filter = 'none';
        ctx.restore();
      }

      ctx.restore();
    }
  }

  ctx.restore();

  if (offscreen && offscreen.ctx !== targetCtx) {
    targetCtx.save();
    targetCtx.imageSmoothingEnabled = !isDraftScrubbing;
    targetCtx.drawImage(offscreen.canvas, 0, 0, rw, rh, 0, 0, canvasWidth, canvasHeight);
    targetCtx.restore();
  }
}
