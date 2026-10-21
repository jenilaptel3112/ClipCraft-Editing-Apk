import { CustomFxNode, CustomFxNodeType, CustomFxPreset } from '../types/editor';

export interface FxNodeDefinition {
  type: CustomFxNodeType;
  name: string;
  category: 'base' | 'motion' | 'lighting';
  description: string;
  defaultParams: Record<string, number>;
  paramRanges: Record<string, { min: number; max: number; step: number; unit?: string; label: string }>;
}

export const FX_NODE_DEFINITIONS: Record<CustomFxNodeType, FxNodeDefinition> = {
  // Base Filters
  brightness: {
    type: 'brightness',
    name: 'Brightness',
    category: 'base',
    description: 'Adjust overall luminance level',
    defaultParams: { value: 15 },
    paramRanges: {
      value: { min: -100, max: 100, step: 1, unit: '%', label: 'Brightness' },
    },
  },
  contrast: {
    type: 'contrast',
    name: 'Contrast',
    category: 'base',
    description: 'Expand or compress dynamic range',
    defaultParams: { value: 25 },
    paramRanges: {
      value: { min: -100, max: 100, step: 1, unit: '%', label: 'Contrast' },
    },
  },
  saturation: {
    type: 'saturation',
    name: 'Saturation',
    category: 'base',
    description: 'Vibrancy and color intensity',
    defaultParams: { value: 30 },
    paramRanges: {
      value: { min: -100, max: 100, step: 1, unit: '%', label: 'Saturation' },
    },
  },
  hue: {
    type: 'hue',
    name: 'Hue Rotate',
    category: 'base',
    description: 'Spectral chromatic rotation',
    defaultParams: { value: 45 },
    paramRanges: {
      value: { min: 0, max: 360, step: 1, unit: '°', label: 'Angle' },
    },
  },
  invert: {
    type: 'invert',
    name: 'Invert Color',
    category: 'base',
    description: 'Negative color phase spectrum',
    defaultParams: { value: 80 },
    paramRanges: {
      value: { min: 0, max: 100, step: 1, unit: '%', label: 'Invert' },
    },
  },
  sepia: {
    type: 'sepia',
    name: 'Sepia Tone',
    category: 'base',
    description: 'Warm nostalgic monochrome tint',
    defaultParams: { value: 65 },
    paramRanges: {
      value: { min: 0, max: 100, step: 1, unit: '%', label: 'Sepia' },
    },
  },

  // Motion & Distortion
  'camera-shake': {
    type: 'camera-shake',
    name: 'Camera Shake',
    category: 'motion',
    description: 'Dynamic handheld jitter & rumble',
    defaultParams: { frequency: 16, amplitude: 24 },
    paramRanges: {
      frequency: { min: 2, max: 30, step: 1, unit: 'Hz', label: 'Frequency' },
      amplitude: { min: 2, max: 50, step: 1, unit: 'px', label: 'Amplitude' },
    },
  },
  'rgb-split': {
    type: 'rgb-split',
    name: 'RGB Split',
    category: 'motion',
    description: 'Anamorphic chromatic displacement',
    defaultParams: { offsetX: 8, offsetY: 4 },
    paramRanges: {
      offsetX: { min: -30, max: 30, step: 1, unit: 'px', label: 'Offset X' },
      offsetY: { min: -30, max: 30, step: 1, unit: 'px', label: 'Offset Y' },
    },
  },
  'lens-distortion': {
    type: 'lens-distortion',
    name: 'Fish-eye Distortion',
    category: 'motion',
    description: 'Spherical optic curvature & zoom',
    defaultParams: { curvature: 35, zoom: 15 },
    paramRanges: {
      curvature: { min: -100, max: 100, step: 1, unit: '%', label: 'Curvature' },
      zoom: { min: 0, max: 50, step: 1, unit: '%', label: 'Zoom Comp' },
    },
  },

  // Overlays & Lighting
  'film-grain': {
    type: 'film-grain',
    name: 'Film Grain',
    category: 'lighting',
    description: 'Procedural 35mm celluloid noise',
    defaultParams: { intensity: 45, speed: 1.2 },
    paramRanges: {
      intensity: { min: 0, max: 100, step: 1, unit: '%', label: 'Intensity' },
      speed: { min: 0.5, max: 3.0, step: 0.1, unit: 'x', label: 'Noise Speed' },
    },
  },
  'white-strobe': {
    type: 'white-strobe',
    name: 'White Flash Strobe',
    category: 'lighting',
    description: 'High-energy rhythmic beat flash',
    defaultParams: { intensity: 70, frequency: 2.5 },
    paramRanges: {
      intensity: { min: 0, max: 100, step: 1, unit: '%', label: 'Flash Power' },
      frequency: { min: 0.5, max: 8.0, step: 0.5, unit: 'Hz', label: 'Beat Rate' },
    },
  },
  'edge-glow': {
    type: 'edge-glow',
    name: 'Edge Glow & Bloom',
    category: 'lighting',
    description: 'High-radiance bloom & diffuse atmosphere',
    defaultParams: { radius: 30, threshold: 60 },
    paramRanges: {
      radius: { min: 5, max: 50, step: 1, unit: 'px', label: 'Bloom Radius' },
      threshold: { min: 10, max: 100, step: 1, unit: '%', label: 'Radiance' },
    },
  },
  vignette: {
    type: 'vignette',
    name: 'Cinematic Vignette',
    category: 'lighting',
    description: 'Darkened atmospheric perimeter falloff',
    defaultParams: { radius: 55, feather: 70 },
    paramRanges: {
      radius: { min: 10, max: 100, step: 1, unit: '%', label: 'Radius' },
      feather: { min: 10, max: 100, step: 1, unit: '%', label: 'Feather' },
    },
  },
};

// Built-in Curated Compound Presets
export const DEFAULT_COMPOUND_PRESETS: CustomFxPreset[] = [
  {
    id: 'preset-cyberpunk-glow',
    name: 'Vintage Cyberpunk Glow',
    masterIntensity: 85,
    createdAt: 1700000000000,
    nodes: [
      { id: 'n1', type: 'hue', enabled: true, params: { value: 180 } },
      { id: 'n2', type: 'edge-glow', enabled: true, params: { radius: 35, threshold: 75 } },
      { id: 'n3', type: 'rgb-split', enabled: true, params: { offsetX: 10, offsetY: 0 } },
      { id: 'n4', type: 'vignette', enabled: true, params: { radius: 60, feather: 70 } },
    ],
  },
  {
    id: 'preset-retro-anime',
    name: '80s Retro Anime VHS',
    masterIntensity: 80,
    createdAt: 1700000001000,
    nodes: [
      { id: 'n1', type: 'saturation', enabled: true, params: { value: 35 } },
      { id: 'n2', type: 'contrast', enabled: true, params: { value: 20 } },
      { id: 'n3', type: 'film-grain', enabled: true, params: { intensity: 55, speed: 1.5 } },
      { id: 'n4', type: 'rgb-split', enabled: true, params: { offsetX: 6, offsetY: -3 } },
    ],
  },
  {
    id: 'preset-acid-trip',
    name: 'Acid Dream Trip',
    masterIntensity: 75,
    createdAt: 1700000002000,
    nodes: [
      { id: 'n1', type: 'hue', enabled: true, params: { value: 95 } },
      { id: 'n2', type: 'lens-distortion', enabled: true, params: { curvature: 45, zoom: 20 } },
      { id: 'n3', type: 'camera-shake', enabled: true, params: { frequency: 12, amplitude: 15 } },
      { id: 'n4', type: 'edge-glow', enabled: true, params: { radius: 25, threshold: 60 } },
    ],
  },
  {
    id: 'preset-dramatic-noir',
    name: 'Noir Celluloid Shadow',
    masterIntensity: 90,
    createdAt: 1700000003000,
    nodes: [
      { id: 'n1', type: 'saturation', enabled: true, params: { value: -100 } },
      { id: 'n2', type: 'contrast', enabled: true, params: { value: 45 } },
      { id: 'n3', type: 'film-grain', enabled: true, params: { intensity: 65, speed: 1.0 } },
      { id: 'n4', type: 'vignette', enabled: true, params: { radius: 45, feather: 85 } },
    ],
  },
  {
    id: 'preset-beat-impact',
    name: 'Beat Impact Strobe',
    masterIntensity: 85,
    createdAt: 1700000004000,
    nodes: [
      { id: 'n1', type: 'white-strobe', enabled: true, params: { intensity: 80, frequency: 3 } },
      { id: 'n2', type: 'camera-shake', enabled: true, params: { frequency: 22, amplitude: 35 } },
      { id: 'n3', type: 'rgb-split', enabled: true, params: { offsetX: 12, offsetY: 6 } },
      { id: 'n4', type: 'contrast', enabled: true, params: { value: 30 } },
    ],
  },
];

const LOCAL_STORAGE_KEY = 'clipcraft_custom_fx_presets';

export function loadSavedCustomPresets(): CustomFxPreset[] {
  if (typeof window === 'undefined') return DEFAULT_COMPOUND_PRESETS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_COMPOUND_PRESETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_COMPOUND_PRESETS;
  } catch (err) {
    console.error('Failed to load custom FX presets:', err);
    return DEFAULT_COMPOUND_PRESETS;
  }
}

export function saveCustomPresetToStorage(preset: CustomFxPreset): CustomFxPreset[] {
  const current = loadSavedCustomPresets();
  const existingIdx = current.findIndex((p) => p.id === preset.id);
  let next: CustomFxPreset[];
  if (existingIdx >= 0) {
    next = [...current];
    next[existingIdx] = preset;
  } else {
    next = [preset, ...current];
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save preset to storage:', err);
  }
  return next;
}

export function deleteCustomPresetFromStorage(id: string): CustomFxPreset[] {
  const current = loadSavedCustomPresets();
  const next = current.filter((p) => p.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to delete preset from storage:', err);
  }
  return next;
}

export function exportPresetsToJson(presets: CustomFxPreset[]): string {
  return JSON.stringify(presets, null, 2);
}

export function importPresetsFromJson(jsonStr: string): CustomFxPreset[] {
  try {
    const parsed = JSON.parse(jsonStr);
    const validPresets: CustomFxPreset[] = [];
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of list) {
      if (item && item.name && Array.isArray(item.nodes)) {
        validPresets.push({
          id: item.id || `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: String(item.name).slice(0, 40),
          masterIntensity: typeof item.masterIntensity === 'number' ? item.masterIntensity : 80,
          thumbnail: item.thumbnail,
          nodes: item.nodes,
          createdAt: item.createdAt || Date.now(),
        });
      }
    }
    if (validPresets.length === 0) {
      throw new Error('No valid presets found in JSON payload');
    }

    const current = loadSavedCustomPresets();
    const map = new Map<string, CustomFxPreset>();
    for (const p of current) map.set(p.id, p);
    for (const p of validPresets) map.set(p.id, p);
    const combined = Array.from(map.values());
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
    return combined;
  } catch (err) {
    console.error('Failed to import presets from JSON:', err);
    throw err;
  }
}

/**
 * Creates CSS filter string for base filter nodes in a compound effect
 */
export function buildCompoundCssFilter(
  nodes: CustomFxNode[],
  masterIntensity: number
): string {
  const scale = Math.max(0, Math.min(1, masterIntensity / 100));
  const filterParts: string[] = [];

  for (const node of nodes) {
    if (!node.enabled) continue;
    const p = node.params;

    switch (node.type) {
      case 'brightness': {
        const val = 1 + (p.value / 100) * scale;
        filterParts.push(`brightness(${Math.max(0, val).toFixed(2)})`);
        break;
      }
      case 'contrast': {
        const val = 1 + (p.value / 100) * scale;
        filterParts.push(`contrast(${Math.max(0, val).toFixed(2)})`);
        break;
      }
      case 'saturation': {
        const val = 1 + (p.value / 100) * scale;
        filterParts.push(`saturate(${Math.max(0, val).toFixed(2)})`);
        break;
      }
      case 'hue': {
        const val = (p.value || 0) * scale;
        filterParts.push(`hue-rotate(${val.toFixed(1)}deg)`);
        break;
      }
      case 'invert': {
        const val = (p.value / 100) * scale;
        filterParts.push(`invert(${val.toFixed(2)})`);
        break;
      }
      case 'sepia': {
        const val = (p.value / 100) * scale;
        filterParts.push(`sepia(${val.toFixed(2)})`);
        break;
      }
    }
  }

  return filterParts.length > 0 ? filterParts.join(' ') : 'none';
}

/**
 * Executes motion and overlay nodes onto the canvas
 */
export function applyCompoundOverlaysAndMotion(
  ctx: CanvasRenderingContext2D,
  nodes: CustomFxNode[],
  masterIntensity: number,
  localTime: number,
  w: number,
  h: number,
  isDraft: boolean = false
): { extraOffsetX: number; extraOffsetY: number; extraScale: number } {
  let extraOffsetX = 0;
  let extraOffsetY = 0;
  let extraScale = 1.0;
  const scale = Math.max(0, Math.min(1, masterIntensity / 100));

  for (const node of nodes) {
    if (!node.enabled) continue;
    const p = node.params;

    switch (node.type) {
      case 'camera-shake': {
        const freq = (p.frequency || 16);
        const amp = (p.amplitude || 20) * scale * (Math.min(w, h) / 720);
        extraOffsetX += (Math.sin(localTime * freq) + Math.cos(localTime * freq * 1.5)) * amp;
        extraOffsetY += (Math.cos(localTime * freq * 1.2) + Math.sin(localTime * freq * 2.1)) * amp;
        break;
      }

      case 'lens-distortion': {
        // Spherical fish-eye curvature & zoom
        const zoomP = ((p.zoom || 15) / 100) * scale;
        extraScale *= (1.0 + zoomP);
        break;
      }

      case 'rgb-split': {
        const ox = Math.round((p.offsetX || 6) * scale);
        const oy = Math.round((p.offsetY || 4) * scale);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 * scale})`;
        ctx.lineWidth = Math.max(1, Math.abs(ox));
        ctx.strokeRect(ox, oy, w - ox * 2, h - oy * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 * scale})`;
        ctx.strokeRect(-ox, -oy, w + ox * 2, h + oy * 2);
        ctx.restore();
        break;
      }

      case 'white-strobe': {
        const freq = p.frequency || 2.5;
        const interval = 1.0 / freq;
        const phase = (localTime % interval);
        const flashDecay = 0.12;
        if (phase < flashDecay) {
          const power = (1 - phase / flashDecay) * ((p.intensity || 70) / 100) * scale;
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.9, power)})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
        break;
      }

      case 'film-grain': {
        if (!isDraft) {
          const intensity = ((p.intensity || 45) / 100) * scale;
          const speed = p.speed || 1.2;
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.25, 0.09 * intensity)})`;
          for (let i = 0; i < 45; i++) {
            const gx = (i * 103 + localTime * speed * 780) % w;
            const gy = (i * 61 + localTime * speed * 610) % h;
            ctx.fillRect(gx, gy, 2, 2);
          }
          ctx.restore();
        }
        break;
      }

      case 'edge-glow': {
        if (!isDraft) {
          const rad = (p.radius || 30) * scale;
          const thresh = ((p.threshold || 60) / 100) * scale;
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const glowGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
          glowGrad.addColorStop(0, `rgba(255, 255, 255, ${thresh * 0.7})`);
          glowGrad.addColorStop(0.6, `rgba(245, 158, 11, ${thresh * 0.4})`);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
        break;
      }

      case 'vignette': {
        const radFrac = Math.max(0.2, (p.radius || 55) / 100);
        const feather = Math.max(0.2, (p.feather || 70) / 100) * scale;
        ctx.save();
        const rad = ctx.createRadialGradient(
          w / 2,
          h / 2,
          Math.min(w, h) * radFrac * 0.5,
          w / 2,
          h / 2,
          Math.max(w, h) * (radFrac * 0.5 + 0.4)
        );
        rad.addColorStop(0, 'rgba(0,0,0,0)');
        rad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, feather)})`);
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        break;
      }
    }
  }

  return { extraOffsetX, extraOffsetY, extraScale };
}
