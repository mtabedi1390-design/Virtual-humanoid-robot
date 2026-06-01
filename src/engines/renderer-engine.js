import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { TextureLibrary } from './planet-engine.js';
import { TemporalJitter } from './time-system.js';

export class RendererEngine {
  constructor(canvas, renderBadge, textureBase) {
    this.canvas = canvas;
    this.renderBadge = renderBadge;
    this.textureBase = textureBase;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x081126, 0.0065);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 320);
    this.camera.position.set(-18, 13, 31);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.13;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 118;
    this.temporalJitter = new TemporalJitter();
  }

  async init() {
    this.renderer = await this.createRenderer();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    if ('useLegacyLights' in this.renderer) this.renderer.useLegacyLights = false;
    if ('physicallyCorrectLights' in this.renderer) this.renderer.physicallyCorrectLights = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.textureLibrary = new TextureLibrary(this.textureBase, this.renderer);
    this.configureLighting();
    this.configureEnvironment();
    this.resize();
    addEventListener('resize', () => this.resize(), { passive: true });
    return this;
  }

  async createRenderer() {
    try {
      const gpu = await import('three/webgpu');
      if ('gpu' in navigator && gpu.WebGPURenderer) {
        const renderer = new gpu.WebGPURenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        await renderer.init();
        this.renderBadge.textContent = 'Three.js r180 · WebGPU · Temporal jitter · PBR';
        return renderer;
      }
    } catch (error) {
      console.warn('WebGPU unavailable; using WebGL fallback.', error);
    }
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderBadge.textContent = 'Three.js r180 · WebGL fallback · PBR safe mode';
    return renderer;
  }

  configureLighting() {
    this.sunLight = new THREE.PointLight(0xfff0bc, 4500, 160, 1.9);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.00015;
    this.scene.add(this.sunLight, new THREE.HemisphereLight(0x9ab7ff, 0x080511, 0.16));
  }

  configureEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    new RGBELoader().load(
      'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr',
      texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
      },
      undefined,
      () => console.warn('HDR environment unavailable; PMREM room environment remains active.')
    );
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    const dprCap = matchMedia('(max-width: 760px)').matches ? 1.35 : 2;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  updateExposure(targetId) {
    const distance = this.camera.position.length();
    const sunBoost = targetId === 'sun' ? 0.78 : 1;
    const desired = THREE.MathUtils.clamp((distance / 38) * sunBoost, 0.72, 1.62);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(this.renderer.toneMappingExposure, desired, 0.028);
  }

  render() {
    this.temporalJitter.apply(this.camera, this.width, this.height);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.camera.clearViewOffset();
  }
}
