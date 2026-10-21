import { TimelineClip, TrackMeta, SyntheticSceneType, FitMode } from '../types/editor';
import { getInterpolatedTransform } from './presets';

// Build CSS filter string from clip's ColorGrading
export function buildCssFilter(clip: TimelineClip): string {
  const cg = clip.colorGrading;
  const exposureMultiplier = 1 + cg.exposure / 100;
  const b = Math.round(cg.brightness * exposureMultiplier);
  const c = cg.contrast;
  const s = cg.saturation;
  const sepia = cg.warmth > 0 ? Math.round(cg.warmth * 0.6) : 0;
  const hue = cg.warmth < 0 ? Math.round(cg.warmth * 0.45) : 0;
  const blur = cg.blur > 0 ? `blur(${cg.blur * 0.5}px)` : '';

  return `brightness(${b}%) contrast(${c}%) saturate(${s}%) sepia(${sepia}%) hue-rotate(${hue}deg) ${blur}`.trim();
}

// Draw procedural 60fps synthetic scenes so the editor works out-of-the-box with zero external broken links
function drawSyntheticScene(
  ctx: CanvasRenderingContext2D,
  scene: SyntheticSceneType,
  localTime: number,
  w: number,
  h: number
) {
  const t = localTime;

  if (scene === 'neon-horizon') {
    // Deep dusk synthwave sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    skyGrad.addColorStop(0, '#070918');
    skyGrad.addColorStop(0.55, '#1E1B4B');
    skyGrad.addColorStop(1, '#BE185D');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Animated retro sun with scanline cutouts
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
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.restore();

    // Horizon floor & perspective moving grid
    const horizonY = h * 0.58;
    const floorGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    floorGrad.addColorStop(0, '#0F172A');
    floorGrad.addColorStop(1, '#020617');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;

    // Perspective radial lines
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * (w * 0.02), horizonY);
      ctx.lineTo(w * 0.5 + i * (w * 0.16), h);
      ctx.stroke();
    }

    // Scrolling horizontal grid bars
    const speedOffset = (t * 1.4) % 1;
    for (let j = 0; j < 10; j++) {
      const progress = (j + speedOffset) / 10;
      const yPos = horizonY + Math.pow(progress, 2.1) * (h - horizonY);
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(w, yPos);
      ctx.stroke();
    }
  } else if (scene === 'golden-waves') {
    // Golden hour ocean & cinematic sunbeams
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#451A03');
    bgGrad.addColorStop(0.45, '#D97706');
    bgGrad.addColorStop(0.75, '#F59E0B');
    bgGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Layered fluid waves
    for (let layer = 0; layer < 5; layer++) {
      ctx.beginPath();
      const baseY = h * (0.42 + layer * 0.11);
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) {
        const wave =
          Math.sin(x * 0.012 + t * (1.8 + layer * 0.3) + layer) * (18 + layer * 4) +
          Math.cos(x * 0.006 - t * 1.1) * 10;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      const alpha = 0.25 + layer * 0.14;
      ctx.fillStyle = layer % 2 === 0 ? `rgba(15, 23, 42, ${alpha})` : `rgba(180, 83, 9, ${alpha})`;
      ctx.fill();
    }

    // Floating golden bokeh dust particles
    for (let p = 0; p < 18; p++) {
      const px = ((p * 97 + t * 35 * (1 + (p % 3) * 0.3)) % (w + 60)) - 30;
      const py = ((p * 61 - t * 22) % h + h) % h;
      const pr = 3 + (p % 4) * 3.5;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.38)';
      ctx.fill();
    }
  } else if (scene === 'aurora-drift') {
    // Deep arctic night sky with flowing aurora borealis ribbons
    const nightGrad = ctx.createLinearGradient(0, 0, w, h);
    nightGrad.addColorStop(0, '#020617');
    nightGrad.addColorStop(0.5, '#0F172A');
    nightGrad.addColorStop(1, '#064E3B');
    ctx.fillStyle = nightGrad;
    ctx.fillRect(0, 0, w, h);

    const colors = ['rgba(16, 185, 129, 0.32)', 'rgba(56, 189, 248, 0.28)', 'rgba(168, 85, 247, 0.24)'];
    colors.forEach((color, idx) => {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      for (let x = 0; x <= w; x += 20) {
        const y =
          h * (0.28 + idx * 0.16) +
          Math.sin(x * 0.008 + t * (1.5 + idx * 0.4)) * 55 +
          Math.cos(x * 0.015 - t * 0.9) * 30;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    });
  } else if (scene === 'prism-bokeh') {
    // Rich translucent PIP card with animated geometric rings
    const cardGrad = ctx.createLinearGradient(0, 0, w, h);
    cardGrad.addColorStop(0, '#311042');
    cardGrad.addColorStop(0.5, '#1E1B4B');
    cardGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = cardGrad;
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    for (let i = 0; i < 6; i++) {
      const angle = t * 1.4 + (i * Math.PI) / 3;
      const ox = cx + Math.cos(angle) * (w * 0.18);
      const oy = cy + Math.sin(angle) * (h * 0.18);
      const r = Math.min(w, h) * (0.14 + (i % 3) * 0.05);
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 63, 94, 0.38)' : 'rgba(56, 189, 248, 0.38)';
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  } else if (scene === 'rec-frame') {
    // Cinema camera viewfinder overlay graphic (transparent center)
    const pad = Math.min(w, h) * 0.06;
    const cornerLen = Math.min(w, h) * 0.08;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.lineWidth = 3;

    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(pad, pad + cornerLen);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + cornerLen, pad);
    // Top-right bracket
    ctx.moveTo(w - pad - cornerLen, pad);
    ctx.lineTo(w - pad, pad);
    ctx.lineTo(w - pad, pad + cornerLen);
    // Bottom-left bracket
    ctx.moveTo(pad, h - pad - cornerLen);
    ctx.lineTo(pad, h - pad);
    ctx.lineTo(pad + cornerLen, h - pad);
    // Bottom-right bracket
    ctx.moveTo(w - pad - cornerLen, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(w - pad, h - pad - cornerLen);
    ctx.stroke();

    // Center crosshair
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy + 14);
    ctx.stroke();

    // Top-left RAW 4K indicator
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.beginPath();
    ctx.arc(pad + 18, pad + 20, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillText('REC · LOG3G10 · 24FPS', pad + 32, pad + 25);
  } else {
    // Default cyber-grid fallback
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);
  }
}

// Render post-processing LUT & Visual Effects over clip layer
function applyVisualEffectsAndVignette(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  localTime: number,
  w: number,
  h: number
) {
  // LUT color tint overlay
  const lut = clip.colorGrading.lutPreset;
  if (lut === 'teal-orange') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(20, 184, 166, 0.14)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.16)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (lut === 'cyberpunk') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(217, 70, 239, 0.18)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (lut === 'vintage-80s') {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.fillRect(0, 0, w, h);
  }

  // Visual Effect Overlays
  if (clip.visualEffect === 'vhs') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let y = 0; y < h; y += 6) {
      ctx.fillRect(0, y, w, 2);
    }
    const barY = ((localTime * 140) % h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(0, barY, w, 18);
  } else if (clip.visualEffect === 'chromatic') {
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 2, w - 12, h - 4);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.strokeRect(2, 6, w - 4, h - 12);
  } else if (clip.visualEffect === 'film-grain') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 45; i++) {
      const gx = ((i * 73 + localTime * 997) % w);
      const gy = ((i * 41 + localTime * 541) % h);
      ctx.fillRect(gx, gy, 2, 2);
    }
  } else if (clip.visualEffect === 'light-leak') {
    const leakGrad = ctx.createRadialGradient(
      w * (0.2 + Math.sin(localTime * 1.5) * 0.15),
      h * 0.3,
      10,
      w * 0.2,
      h * 0.3,
      w * 0.65
    );
    leakGrad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
    leakGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.22)');
    leakGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = leakGrad;
    ctx.fillRect(0, 0, w, h);
  }

  // Vignette darkening
  if (clip.colorGrading.vignette > 0) {
    const vStrength = (clip.colorGrading.vignette / 100) * 0.78;
    const rad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, `rgba(0,0,0,${vStrength})`);
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
  }
}

// Draw kinetic typography clip
function drawTextClip(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  playheadTime: number,
  w: number,
  h: number
) {
  if (!clip.textStyle) return;
  const ts = clip.textStyle;
  const localTime = Math.max(0, playheadTime - clip.startTime);
  const animDuration = 0.45;
  const animProgress = Math.min(1, localTime / animDuration);

  let displayText = ts.content;
  let extraScale = 1;
  let extraYOffset = 0;
  let animAlpha = 1;

  if (ts.animation === 'fade') {
    animAlpha = animProgress;
  } else if (ts.animation === 'pop') {
    extraScale = animProgress < 0.7
      ? 0.4 + (animProgress / 0.7) * 0.72
      : 1.12 - ((animProgress - 0.7) / 0.3) * 0.12;
  } else if (ts.animation === 'slide-up') {
    extraYOffset = (1 - animProgress) * 42;
    animAlpha = animProgress;
  } else if (ts.animation === 'typewriter') {
    const typeSpan = Math.min(1.4, clip.duration * 0.65);
    const charRatio = Math.min(1, localTime / Math.max(0.2, typeSpan));
    const charCount = Math.ceil(ts.content.length * charRatio);
    displayText = ts.content.slice(0, charCount);
  } else if (ts.animation === 'glitch') {
    if (localTime < 0.5 && Math.floor(localTime * 25) % 2 === 0) {
      extraYOffset = (Math.sin(localTime * 90) * 6);
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

  const metrics = ctx.measureText(displayText || ' ');
  const textWidth = metrics.width;
  const textHeight = responsiveFontSize * 1.25;

  if (ts.bgEnabled) {
    const padX = responsiveFontSize * 0.55;
    const padY = responsiveFontSize * 0.25;
    ctx.fillStyle = ts.bgColor;
    const rx = -textWidth / 2 - padX;
    const ry = -textHeight / 2 - padY;
    const rw = textWidth + padX * 2;
    const rh = textHeight + padY * 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 10);
    ctx.fill();
  }

  if (ts.shadowBlur > 0) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = ts.shadowBlur;
    ctx.shadowOffsetY = 4;
  }

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

// Render complete frame across all visible tracks onto HTML5 Canvas
export function renderCompositeFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  playheadTime: number,
  clips: TimelineClip[],
  tracks: TrackMeta[],
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
  fitMode: FitMode,
  selectedClipId: string | null,
  showSafeGuides: boolean
) {
  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Studio dark letterbox backdrop
  ctx.fillStyle = '#07080C';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Track rendering order from bottom to top: video -> overlay -> text
  const layerOrder: ('video' | 'overlay' | 'text')[] = ['video', 'overlay', 'text'];

  for (const trackType of layerOrder) {
    const trackMeta = tracks.find((t) => t.id === trackType);
    if (trackMeta && !trackMeta.visible) continue;

    // Find active clips on this track at playheadTime
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

      // Keyframe interpolated transform
      const transform = getInterpolatedTransform(clip, playheadTime);

      // Calculate fade-in / fade-out envelope
      let fadeAlpha = 1;
      if (clip.fadeIn > 0 && rawClipElapsed < clip.fadeIn) {
        fadeAlpha = rawClipElapsed / clip.fadeIn;
      }
      const remaining = clip.duration - rawClipElapsed;
      if (clip.fadeOut > 0 && remaining < clip.fadeOut) {
        fadeAlpha = Math.min(fadeAlpha, Math.max(0, remaining / clip.fadeOut));
      }

      // Transition In animation calculations
      let transScale = 1;
      let transOffsetX = 0;
      let transAlpha = 1;
      let wipeClipRatio = 1;

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
          transOffsetX = (1 - eased) * canvasWidth * 0.85;
          transAlpha = eased;
        } else if (clip.transitionIn.type === 'wipe-left') {
          wipeClipRatio = eased;
        }
      }

      ctx.save();

      // Apply wipe clipping region if active
      if (wipeClipRatio < 1) {
        ctx.beginPath();
        ctx.rect(0, 0, canvasWidth * wipeClipRatio, canvasHeight);
        ctx.clip();
      }

      // Move origin to center + clip transform offset
      const centerX = canvasWidth / 2 + (transform.x / 100) * canvasWidth + transOffsetX;
      const centerY = canvasHeight / 2 + (transform.y / 100) * canvasHeight;

      ctx.translate(centerX, centerY);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(transform.scale * transScale, transform.scale * transScale);
      ctx.globalAlpha = Math.max(0, Math.min(1, transform.opacity * fadeAlpha * transAlpha));

      if (clip.mediaType === 'text') {
        drawTextClip(ctx, clip, playheadTime, canvasWidth, canvasHeight);
      } else {
        ctx.filter = buildCssFilter(clip);

        // Draw media or synthetic scene centered at (-canvasWidth/2, -canvasHeight/2)
        ctx.save();
        ctx.translate(-canvasWidth / 2, -canvasHeight / 2);

        const mediaEl = mediaElements.get(clip.id);
        if (mediaEl) {
          let srcW = canvasWidth;
          let srcH = canvasHeight;
          if (mediaEl instanceof HTMLVideoElement) {
            srcW = mediaEl.videoWidth || canvasWidth;
            srcH = mediaEl.videoHeight || canvasHeight;
          } else if (mediaEl instanceof HTMLImageElement) {
            srcW = mediaEl.naturalWidth || canvasWidth;
            srcH = mediaEl.naturalHeight || canvasHeight;
          }

          if (fitMode === 'fill') {
            ctx.drawImage(mediaEl, 0, 0, canvasWidth, canvasHeight);
          } else {
            const scaleRatio =
              fitMode === 'cover'
                ? Math.max(canvasWidth / srcW, canvasHeight / srcH)
                : Math.min(canvasWidth / srcW, canvasHeight / srcH);
            const drawW = srcW * scaleRatio;
            const drawH = srcH * scaleRatio;
            const dx = (canvasWidth - drawW) / 2;
            const dy = (canvasHeight - drawH) / 2;
            ctx.drawImage(mediaEl, dx, dy, drawW, drawH);
          }
        } else if (clip.syntheticScene) {
          drawSyntheticScene(
            ctx,
            clip.syntheticScene,
            clip.sourceStartOffset + localTime,
            canvasWidth,
            canvasHeight
          );
        }

        ctx.filter = 'none';
        applyVisualEffectsAndVignette(ctx, clip, localTime, canvasWidth, canvasHeight);
        ctx.restore();
      }

      // Draw subtle selection bounding frame when clip is selected
      if (selectedClipId === clip.id && showSafeGuides) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        const boxW = clip.mediaType === 'text' ? canvasWidth * 0.72 : canvasWidth * 0.98;
        const boxH = clip.mediaType === 'text' ? canvasHeight * 0.18 : canvasHeight * 0.98;
        ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }

  // Optional rule-of-thirds safe zone guides
  if (showSafeGuides) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 3, 0);
    ctx.lineTo(canvasWidth / 3, canvasHeight);
    ctx.moveTo((canvasWidth * 2) / 3, 0);
    ctx.lineTo((canvasWidth * 2) / 3, canvasHeight);
    ctx.moveTo(0, canvasHeight / 3);
    ctx.lineTo(canvasWidth, canvasHeight / 3);
    ctx.moveTo(0, (canvasHeight * 2) / 3);
    ctx.lineTo(canvasWidth, (canvasHeight * 2) / 3);
    ctx.stroke();
  }

  ctx.restore();
}
