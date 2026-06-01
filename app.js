import * as THREE from 'three';
import { objects, dockOrder, filters, textureBase } from './src/solar-data.js';
import { RendererEngine } from './src/engines/renderer-engine.js';
import { PlanetEngine } from './src/engines/planet-engine.js';
import { NebulaEngine } from './src/engines/nebula-engine.js';
import { PhysicsTimeSystem } from './src/engines/time-system.js';
import { MaterialSolarUI } from './src/ui/material-ui.js';

const elements = {
  atlasSheet: document.querySelector('#atlasSheet'),
  cards: document.querySelector('#cards'),
  detail: document.querySelector('#detail'),
  filtersEl: document.querySelector('#filters'),
  quickCard: document.querySelector('#quickCard'),
  searchInput: document.querySelector('#searchInput'),
  dock: document.querySelector('.planet-dock')
};

const canvas = document.querySelector('#spaceCanvas');
const renderBadge = document.querySelector('#renderBadge');

const rendererEngine = await new RendererEngine(canvas, renderBadge, textureBase).init();
const planetEngine = new PlanetEngine({ scene: rendererEngine.scene, textureLibrary: rendererEngine.textureLibrary });
planetEngine.build(objects);
const nebulaEngine = new NebulaEngine(rendererEngine.scene);
const timeSystem = new PhysicsTimeSystem({ daysPerSecond: 18 });

let selectedId = 'saturn';
const focusPosition = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();

const ui = new MaterialSolarUI({
  objects,
  dockOrder,
  filters,
  elements,
  onSelect: id => { selectedId = id; }
});
ui.init();
ui.select(selectedId);

function updateCameraFocus(deltaSeconds) {
  planetEngine.getWorldPosition(selectedId, focusPosition);
  rendererEngine.controls.target.lerp(focusPosition, 1 - Math.pow(0.001, deltaSeconds));
  const item = objects.find(entry => entry.id === selectedId) || objects[0];
  const distance = Math.max(item.radius * 7.2, selectedId === 'sun' ? 18 : 5.8);
  desiredCamera.copy(focusPosition).add(new THREE.Vector3(distance, distance * 0.42, distance * 1.34));
  rendererEngine.camera.position.lerp(desiredCamera, 1 - Math.pow(0.02, deltaSeconds));
}

function frame(now) {
  requestAnimationFrame(frame);
  const deltaSeconds = timeSystem.update(now);
  planetEngine.update(timeSystem.elapsedDays, deltaSeconds);
  nebulaEngine.update(deltaSeconds, timeSystem.elapsedDays);
  updateCameraFocus(deltaSeconds);
  rendererEngine.updateExposure(selectedId);
  rendererEngine.render();
}

requestAnimationFrame(frame);
