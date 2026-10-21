import * as THREE from 'three';
import { TimelineClip, Keyframe } from '../types/editor';

// Matrix and Vector scratch variables to prevent GC allocations in render loops
const _tempParentMatrix = new THREE.Matrix4();
const _tempChildMatrix = new THREE.Matrix4();
const _tempWorldMatrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _rot = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * Validate that assigning parentId to childId does not produce a circular dependency cycle.
 */
export function isValidParent(
  clips: TimelineClip[],
  childId: string,
  potentialParentId: string | null | undefined
): boolean {
  if (!potentialParentId) return true;
  if (childId === potentialParentId) return false;

  const clipMap = new Map<string, TimelineClip>(clips.map((c) => [c.id, c]));
  let currentId: string | null | undefined = potentialParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === childId) {
      return false; // Loop detected!
    }
    if (visited.has(currentId)) {
      return false; // Existing loop detected
    }
    visited.add(currentId);
    const parentClip = clipMap.get(currentId);
    currentId = parentClip?.parentId;
  }

  return true;
}

export interface Spatial3DTransform {
  x: number;
  y: number;
  z: number;
  rotateX: number; // degrees
  rotateY: number; // degrees
  rotateZ: number; // degrees
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  opacity: number;
  fov?: number;
}

/**
 * Get interpolated local transform for a clip at a given timestamp offset.
 */
export function getClipLocalTransform(
  clip: TimelineClip,
  timeOffset: number
): Spatial3DTransform {
  const baseScale = clip.scale || 1;
  const defaultTransform: Spatial3DTransform = {
    x: clip.x || 0,
    y: clip.y || 0,
    z: clip.z || 0,
    rotateX: clip.rotateX || 0,
    rotateY: clip.rotateY || 0,
    rotateZ: clip.rotateZ ?? clip.rotation ?? 0,
    scaleX: (clip.scaleX ?? 1) * baseScale,
    scaleY: (clip.scaleY ?? 1) * baseScale,
    scaleZ: (clip.scaleZ ?? 1) * baseScale,
    opacity: clip.opacity ?? 1,
    fov: clip.cameraFov ?? 50,
  };

  if (!clip.keyframes || clip.keyframes.length === 0) {
    return defaultTransform;
  }

  const sortedKeyframes = [...clip.keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  if (timeOffset <= sortedKeyframes[0].timeOffset) {
    const k = sortedKeyframes[0];
    const kScale = k.scale || 1;
    return {
      x: k.x,
      y: k.y,
      z: k.z ?? defaultTransform.z,
      rotateX: k.rotateX ?? defaultTransform.rotateX,
      rotateY: k.rotateY ?? defaultTransform.rotateY,
      rotateZ: k.rotateZ ?? k.rotation ?? defaultTransform.rotateZ,
      scaleX: (k.scaleX ?? 1) * kScale,
      scaleY: (k.scaleY ?? 1) * kScale,
      scaleZ: (k.scaleZ ?? 1) * kScale,
      opacity: k.opacity ?? defaultTransform.opacity,
      fov: k.fov ?? defaultTransform.fov,
    };
  }

  const lastKey = sortedKeyframes[sortedKeyframes.length - 1];
  if (timeOffset >= lastKey.timeOffset) {
    const kScale = lastKey.scale || 1;
    return {
      x: lastKey.x,
      y: lastKey.y,
      z: lastKey.z ?? defaultTransform.z,
      rotateX: lastKey.rotateX ?? defaultTransform.rotateX,
      rotateY: lastKey.rotateY ?? defaultTransform.rotateY,
      rotateZ: lastKey.rotateZ ?? lastKey.rotation ?? defaultTransform.rotateZ,
      scaleX: (lastKey.scaleX ?? 1) * kScale,
      scaleY: (lastKey.scaleY ?? 1) * kScale,
      scaleZ: (lastKey.scaleZ ?? 1) * kScale,
      opacity: lastKey.opacity ?? defaultTransform.opacity,
      fov: lastKey.fov ?? defaultTransform.fov,
    };
  }

  // Find surrounding keyframes
  for (let i = 0; i < sortedKeyframes.length - 1; i++) {
    const k1 = sortedKeyframes[i];
    const k2 = sortedKeyframes[i + 1];

    if (timeOffset >= k1.timeOffset && timeOffset <= k2.timeOffset) {
      const span = k2.timeOffset - k1.timeOffset;
      const progress = span > 0 ? (timeOffset - k1.timeOffset) / span : 0;

      // Easing curve
      let easeT = progress;
      if (k1.easing === 'ease-in') {
        easeT = progress * progress;
      } else if (k1.easing === 'ease-out') {
        easeT = 1 - Math.pow(1 - progress, 2);
      } else if (k1.easing === 'ease-in-out') {
        easeT = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      }

      const lerp = (a: number, b: number) => a + (b - a) * easeT;

      const k1Scale = k1.scale || 1;
      const k2Scale = k2.scale || 1;

      return {
        x: lerp(k1.x, k2.x),
        y: lerp(k1.y, k2.y),
        z: lerp(k1.z ?? defaultTransform.z, k2.z ?? defaultTransform.z),
        rotateX: lerp(k1.rotateX ?? defaultTransform.rotateX, k2.rotateX ?? defaultTransform.rotateX),
        rotateY: lerp(k1.rotateY ?? defaultTransform.rotateY, k2.rotateY ?? defaultTransform.rotateY),
        rotateZ: lerp(
          k1.rotateZ ?? k1.rotation ?? defaultTransform.rotateZ,
          k2.rotateZ ?? k2.rotation ?? defaultTransform.rotateZ
        ),
        scaleX: lerp((k1.scaleX ?? 1) * k1Scale, (k2.scaleX ?? 1) * k2Scale),
        scaleY: lerp((k1.scaleY ?? 1) * k1Scale, (k2.scaleY ?? 1) * k2Scale),
        scaleZ: lerp((k1.scaleZ ?? 1) * k1Scale, (k2.scaleZ ?? 1) * k2Scale),
        opacity: lerp(k1.opacity, k2.opacity),
        fov: lerp(k1.fov ?? defaultTransform.fov!, k2.fov ?? defaultTransform.fov!),
      };
    }
  }

  return defaultTransform;
}

/**
 * Builds a 4x4 matrix from spatial properties.
 */
export function buildMatrix4FromTransform(t: Spatial3DTransform, outMatrix: THREE.Matrix4): THREE.Matrix4 {
  _pos.set(t.x, t.y, t.z);
  _rot.set(
    THREE.MathUtils.degToRad(t.rotateX),
    THREE.MathUtils.degToRad(t.rotateY),
    THREE.MathUtils.degToRad(t.rotateZ),
    'XYZ'
  );
  _quat.setFromEuler(_rot);
  _scale.set(t.scaleX, t.scaleY, t.scaleZ);

  outMatrix.compose(_pos, _quat, _scale);
  return outMatrix;
}

/**
 * Computes world transform matrix by chaining up the parenting hierarchy.
 * childWorldMatrix = parentWorldMatrix * childLocalMatrix
 */
export function computeWorldTransform(
  clip: TimelineClip,
  allClips: TimelineClip[],
  globalTime: number
): { matrix: THREE.Matrix4; opacity: number } {
  const clipMap = new Map<string, TimelineClip>(allClips.map((c) => [c.id, c]));

  // Traverse up the chain to get ancestry: [root, ..., parent, clip]
  const ancestry: TimelineClip[] = [];
  let curr: TimelineClip | undefined = clip;
  const visited = new Set<string>();

  while (curr && !visited.has(curr.id)) {
    ancestry.unshift(curr);
    visited.add(curr.id);
    curr = curr.parentId ? clipMap.get(curr.parentId) : undefined;
  }

  _tempWorldMatrix.identity();
  let cumulativeOpacity = 1;

  for (const ancestor of ancestry) {
    const timeOffset = Math.max(0, globalTime - ancestor.startTime);
    const localTransform = getClipLocalTransform(ancestor, timeOffset);

    buildMatrix4FromTransform(localTransform, _tempChildMatrix);
    _tempWorldMatrix.multiply(_tempChildMatrix);
    cumulativeOpacity *= localTransform.opacity;
  }

  return {
    matrix: _tempWorldMatrix.clone(),
    opacity: cumulativeOpacity,
  };
}
