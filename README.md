# Virtual-humanoid-robotwork

A responsive Persian/English Solar System mini app built as a static WebGPU-first Three.js experience.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` in a modern browser. Browsers with WebGPU support use the WebGPU renderer; other browsers fall back to WebGL.

## Architecture

```text
App bootstrap
├── MaterialSolarUI
├── RendererEngine
├── PlanetEngine
├── Orbit/Kepler Engine
├── Nebula Engine
├── Texture Library
├── Temporal Jitter
└── Physics Time System
```

## Highlights

- Three.js r180 import map with WebGPU-first rendering and WebGL fallback.
- Material 3 Expressive inspired glass UI with Persian typography, focus rings, tabular numerals, and adaptive layouts.
- Keplerian orbit positions using `a(1-e²)/(1+e*cosθ)` with educational J2000-style orbital elements.
- Dynamic `THREE.LOD` planets: low-poly from far away, denser PBR meshes for close camera focus.
- PBR planet materials, ACES tone mapping, HDR/PMREM environment, dynamic exposure, shadow-casting moons, Saturn ring shadows, and atmospheric shell rendering.
- Procedural nebula shell plus GPU-friendly particle field with DPR capping for laptop/tablet/mobile performance.
- Remote high-resolution planet texture hooks with graceful procedural-color fallback when a texture cannot be downloaded.
