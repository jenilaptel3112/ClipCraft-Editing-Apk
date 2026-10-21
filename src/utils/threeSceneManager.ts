import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TimelineClip, TrackMeta, FitMode } from '../types/editor';
import { computeWorldTransform } from './hierarchyMath';
import { renderVectorDrawing } from './vectorDrawingRenderer';

// Scratch math helpers to avoid garbage collection
const _pos = new THREE.Vector3();
const _rot = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

export interface ThreeManagerInitOptions {
  width: number;
  height: number;
}

export class ThreeSceneManager {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private defaultCamera: THREE.PerspectiveCamera;
  private activeCamera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean = false;
  private pmremGenerator: THREE.PMREMGenerator | null = null;

  // Cached layer meshes & textures
  private layerObjects: Map<string, THREE.Object3D> = new Map();
  private layerTextures: Map<string, THREE.Texture> = new Map();
  private layerCanvases: Map<string, HTMLCanvasElement> = new Map();

  // Null object helper wireframe
  private nullHelpers: Map<string, THREE.LineSegments> = new Map();

  // 2D fallback offscreen canvas
  private offscreen2DCanvas: HTMLCanvasElement;
  private offscreen2DCtx: CanvasRenderingContext2D | null;

  private lastRenderTime: number = -1;

  constructor() {
    this.scene = new THREE.Scene();
    this.defaultCamera = new THREE.PerspectiveCamera(50, 9 / 16, 0.1, 5000);
    this.defaultCamera.position.set(0, 0, 1000);
    this.defaultCamera.lookAt(0, 0, 0);
    this.activeCamera = this.defaultCamera;

    this.offscreen2DCanvas = document.createElement('canvas');
    this.offscreen2DCtx = this.offscreen2DCanvas.getContext('2d');
  }

  public init(canvas: HTMLCanvasElement) {
    if (this.renderer) return;

    // Detect software WebGL from GPU renderer string
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    // Studio Environment Reflection
    try {
      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    } catch {
      // fallback
    }

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(300, 500, 600);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x88bbff, 0.6);
    rimLight.position.set(-300, -200, -400);
    this.scene.add(rimLight);
  }

  public setSize(width: number, height: number) {
    if (!this.renderer) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.defaultCamera.aspect = aspect;
    this.defaultCamera.updateProjectionMatrix();

    this.offscreen2DCanvas.width = width;
    this.offscreen2DCanvas.height = height;
  }

  /**
   * Checks whether any layer requires the 3D pipeline.
   */
  public hasActive3DLayers(clips: TimelineClip[]): boolean {
    return clips.some((c) => c.is3D || c.mediaType === 'camera' || c.mediaType === 'null');
  }

  /**
   * Renders composite 3D scene onto the WebGL canvas.
   */
  public render3D(
    clips: TimelineClip[],
    tracks: TrackMeta[],
    globalTime: number,
    mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
    options: {
      isExport?: boolean;
      selectedClipId?: string | null;
      width: number;
      height: number;
    }
  ) {
    if (!this.renderer) return;

    const { width, height, isExport = false, selectedClipId = null } = options;
    const aspect = width / height;

    // 1. Resolve Active Camera
    const activeCameraClip = clips.find(
      (c) => c.mediaType === 'camera' && globalTime >= c.startTime && globalTime <= c.startTime + c.duration
    );

    if (activeCameraClip) {
      const fov = activeCameraClip.cameraFov || 50;
      this.activeCamera.fov = fov;
      this.activeCamera.aspect = aspect;

      // Position
      const camX = activeCameraClip.x * 5;
      const camY = -activeCameraClip.y * 5;
      const camZ = (activeCameraClip.z ?? 0) + 1000;
      this.activeCamera.position.set(camX, camY, camZ);

      // Target
      const target = activeCameraClip.cameraTarget || [0, 0, 0];
      this.activeCamera.lookAt(target[0] * 5, -target[1] * 5, target[2]);

      // Roll
      if (activeCameraClip.cameraRoll) {
        this.activeCamera.rotation.z += THREE.MathUtils.degToRad(activeCameraClip.cameraRoll);
      }
      this.activeCamera.updateProjectionMatrix();
    } else {
      this.activeCamera = this.defaultCamera;
      this.activeCamera.aspect = aspect;
      this.activeCamera.position.set(0, 0, 1000);
      this.activeCamera.lookAt(0, 0, 0);
      this.activeCamera.updateProjectionMatrix();
    }

    // 2. Sync meshes for active clips
    const activeClipIds = new Set<string>();

    for (const clip of clips) {
      const isVisible = globalTime >= clip.startTime && globalTime <= clip.startTime + clip.duration;
      if (!isVisible) continue;

      const track = tracks.find((t) => t.id === clip.trackId);
      if (track && (!track.visible || track.muted)) continue;

      activeClipIds.add(clip.id);

      // Null layer visualization
      if (clip.mediaType === 'null') {
        this.updateNullObject(clip, clips, globalTime, isExport, selectedClipId === clip.id);
        continue;
      }

      if (clip.mediaType === 'camera') {
        continue; // Camera doesn't render as a physical plane
      }

      // Visual clip plane (video, image, text, drawing, synthetic)
      this.updateLayerPlane(clip, clips, globalTime, mediaElements, width, height);
    }

    // Remove unmounted or inactive meshes
    for (const [id, obj] of this.layerObjects.entries()) {
      if (!activeClipIds.has(id)) {
        this.scene.remove(obj);
        this.layerObjects.delete(id);
      }
    }
    for (const [id, line] of this.nullHelpers.entries()) {
      if (!activeClipIds.has(id)) {
        this.scene.remove(line);
        this.nullHelpers.delete(id);
      }
    }

    this.renderer.render(this.scene, this.activeCamera);
    this.lastRenderTime = globalTime;
  }

  /**
   * Updates or creates a 3D Plane Mesh for visual clips.
   */
  private updateLayerPlane(
    clip: TimelineClip,
    allClips: TimelineClip[],
    globalTime: number,
    mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>,
    viewportWidth: number,
    viewportHeight: number
  ) {
    let mesh = this.layerObjects.get(clip.id) as THREE.Mesh | undefined;

    // Plane geometry sized to standard clip dimensions (approx 540x960 base)
    const baseW = 540;
    const baseH = 960;

    if (!mesh) {
      const geometry = new THREE.PlaneGeometry(baseW, baseH);
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      mesh = new THREE.Mesh(geometry, material);
      mesh.matrixAutoUpdate = false; // Manual matrix caching for 60fps
      this.scene.add(mesh);
      this.layerObjects.set(clip.id, mesh);
    }

    // Compute World Transform via 4x4 matrix multiplication hierarchy
    const { matrix: worldMat, opacity } = computeWorldTransform(clip, allClips, globalTime);

    // Apply matrix to mesh
    mesh.matrix.copy(worldMat);
    mesh.matrixWorldNeedsUpdate = true;

    // Update material texture
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;

    // Render source content into texture
    let texture = this.layerTextures.get(clip.id);

    if (clip.mediaType === 'drawing' && clip.drawingData) {
      // Dynamic vector drawing texture
      let canvas = this.layerCanvases.get(clip.id);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = baseW;
        canvas.height = baseH;
        this.layerCanvases.set(clip.id, canvas);
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, baseW, baseH);
        renderVectorDrawing(ctx, clip.drawingData, baseW, baseH);
      }

      if (!texture) {
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.layerTextures.set(clip.id, texture);
        material.map = texture;
      }
      texture.needsUpdate = true;
    } else {
      const media = mediaElements.get(clip.id);
      if (media) {
        if (!texture) {
          if (media instanceof HTMLVideoElement) {
            texture = new THREE.VideoTexture(media);
          } else {
            texture = new THREE.Texture(media);
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          this.layerTextures.set(clip.id, texture);
          material.map = texture;
        }
        texture.needsUpdate = true;
      } else {
        // Fallback procedural color
        if (!material.map) {
          material.color.set(clip.accentColor || '#3B82F6');
        }
      }
    }
  }

  /**
   * Updates Null Object Wireframe representation.
   */
  private updateNullObject(
    clip: TimelineClip,
    allClips: TimelineClip[],
    globalTime: number,
    isExport: boolean,
    isSelected: boolean
  ) {
    let wireframe = this.nullHelpers.get(clip.id);

    if (isExport) {
      // Null layers are non-rendering organizational objects during final export
      if (wireframe) {
        wireframe.visible = false;
      }
      return;
    }

    if (!wireframe) {
      const boxGeom = new THREE.BoxGeometry(160, 160, 160);
      const edges = new THREE.EdgesGeometry(boxGeom);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: isSelected ? 0xf59e0b : 0x06b6d4, // Amber if selected, cyan default
        linewidth: 2,
      });

      wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.matrixAutoUpdate = false;
      this.scene.add(wireframe);
      this.nullHelpers.set(clip.id, wireframe);
    }

    wireframe.visible = true;

    // Apply hierarchical transform
    const { matrix } = computeWorldTransform(clip, allClips, globalTime);
    wireframe.matrix.copy(matrix);
    wireframe.matrixWorldNeedsUpdate = true;
  }

  public dispose() {
    for (const obj of this.layerObjects.values()) {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }
    for (const line of this.nullHelpers.values()) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    for (const tex of this.layerTextures.values()) {
      tex.dispose();
    }
    this.layerObjects.clear();
    this.layerTextures.clear();
    this.layerCanvases.clear();
    this.nullHelpers.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
  }
}

export const threeSceneManager = new ThreeSceneManager();
