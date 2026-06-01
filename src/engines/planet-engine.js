import * as THREE from 'three';
import { makeOrbitCurve, keplerPosition, sceneUnitsFromAu } from './orbit-engine.js';

function fallbackColor(item) {
  return new THREE.Color(item.color?.match(/#[0-9a-f]{6}/i)?.[0] || '#dbe7ff');
}

export class TextureLibrary {
  constructor(textureBase, renderer) {
    this.textureBase = textureBase;
    this.loader = new THREE.TextureLoader();
    this.loader.crossOrigin = 'anonymous';
    this.cache = new Map();
    this.maxAnisotropy = renderer.capabilities?.getMaxAnisotropy?.() || 8;
  }

  load(name, { color = true } = {}) {
    if (!name) return null;
    if (this.cache.has(name)) return this.cache.get(name);
    const texture = this.loader.load(
      `${this.textureBase}${name}`,
      map => {
        if (color) map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = Math.min(this.maxAnisotropy, 12);
      },
      undefined,
      () => console.warn(`Texture unavailable: ${name}; using procedural material fallback.`)
    );
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(name, texture);
    return texture;
  }
}

export class PlanetEngine {
  constructor({ scene, textureLibrary }) {
    this.scene = scene;
    this.textureLibrary = textureLibrary;
    this.registry = new Map();
    this.orbitMaterial = new THREE.LineBasicMaterial({ color: 0x9fb5ff, transparent: true, opacity: 0.2 });
  }

  build(objects) {
    objects.filter(item => item.radius).forEach(item => this.addBody(item));
    this.attachMoon('moon', 'earth');
    return this.registry;
  }

  addBody(item) {
    const root = new THREE.Group();
    root.name = `${item.id}-root`;
    const visual = new THREE.LOD();
    visual.name = `${item.id}-lod`;

    const levels = item.lod?.length ? item.lod : [{ distance: 0, segments: 64, texture: item.texture }];
    levels.forEach(level => visual.addLevel(this.makeMesh(item, level.segments, level.texture), level.distance));
    root.add(visual);

    if (item.id === 'saturn') this.addSaturnRings(visual, item);
    if (item.id === 'earth') this.addEarthAtmosphere(visual, item);
    if (item.elements && !item.elements.parent) this.addOrbitLine(item);

    this.scene.add(root);
    this.registry.set(item.id, { item, root, visual });
    return root;
  }

  makeMesh(item, segments, textureName) {
    const geometry = new THREE.SphereGeometry(item.radius, segments, Math.max(16, Math.floor(segments / 2)));
    const map = this.textureLibrary.load(textureName);
    const normalMap = item.textureSet ? this.textureLibrary.load(item.textureSet.normal, { color: false }) : null;
    const roughnessMap = item.textureSet ? this.textureLibrary.load(item.textureSet.roughness, { color: false }) : null;
    const displacementMap = segments >= 128 && item.textureSet ? this.textureLibrary.load(item.textureSet.displacement, { color: false }) : null;

    const material = item.id === 'sun'
      ? new THREE.MeshBasicMaterial({ color: 0xffb23d })
      : new THREE.MeshPhysicalMaterial({
        map,
        normalMap,
        roughnessMap,
        displacementMap,
        displacementScale: displacementMap ? item.radius * 0.018 : 0,
        color: map ? 0xffffff : fallbackColor(item),
        roughness: 0.72,
        metalness: 0,
        clearcoat: item.id === 'earth' ? 0.35 : 0.08,
        clearcoatRoughness: 0.55,
        ior: 1.45,
        iridescence: item.id === 'venus' || item.id === 'uranus' ? 0.12 : 0,
        sheen: item.id === 'saturn' || item.id === 'jupiter' ? 0.22 : 0
      });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${item.id}-${segments}`;
    mesh.castShadow = item.id !== 'sun';
    mesh.receiveShadow = item.id !== 'sun';
    return mesh;
  }

  addSaturnRings(visual, item) {
    const alphaMap = this.textureLibrary.load('2k_saturn_ring_alpha.png', { color: false });
    const roughnessMap = this.textureLibrary.load('2k_saturn_ring_alpha.png', { color: false });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(item.radius * 1.25, item.radius * 2.35, 224),
      new THREE.MeshPhysicalMaterial({
        color: 0xffd9a2,
        alphaMap,
        roughnessMap,
        roughness: 0.86,
        metalness: 0,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.92
      })
    );
    ring.name = 'saturn-pbr-ring-alpha-roughness';
    ring.rotation.x = Math.PI / 2.45;
    ring.castShadow = true;
    ring.receiveShadow = true;
    visual.add(ring);
  }

  addEarthAtmosphere(visual, item) {
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(item.radius * 1.035, 96, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x88c7ff,
        transparent: true,
        opacity: 0.22,
        transmission: 0.35,
        roughness: 0.1,
        depthWrite: false,
        side: THREE.BackSide
      })
    );
    atmosphere.name = 'earth-atmospheric-scattering-shell';
    visual.add(atmosphere);
  }

  addOrbitLine(item) {
    const line = new THREE.Line(makeOrbitCurve(item.elements), this.orbitMaterial.clone());
    line.name = `${item.id}-kepler-orbit`;
    this.scene.add(line);
  }

  attachMoon(moonId, planetId) {
    const moon = this.registry.get(moonId);
    const planet = this.registry.get(planetId);
    if (!moon || !planet) return;
    this.scene.remove(moon.root);
    planet.root.add(moon.root);
    moon.root.scale.setScalar(3.7);
  }

  update(elapsedDays, deltaSeconds) {
    this.registry.forEach(({ item, root, visual }) => {
      visual.rotation.y += deltaSeconds * item.spin;
      if (!item.elements) return;
      const position = item.elements.parent
        ? keplerPosition(item.elements, elapsedDays, sceneUnitsFromAu(item.elements.semiMajorAxisAu) * 140)
        : keplerPosition(item.elements, elapsedDays);
      root.position.copy(position);
    });
  }

  getVisual(id) {
    return this.registry.get(id)?.visual || null;
  }

  getWorldPosition(id, target = new THREE.Vector3()) {
    const visual = this.getVisual(id);
    if (!visual) return target.set(0, 0, 0);
    return visual.getWorldPosition(target);
  }
}
