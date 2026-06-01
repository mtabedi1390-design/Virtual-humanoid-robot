import * as THREE from 'three';

export class NebulaEngine {
  constructor(scene) {
    this.scene = scene;
    this.particles = this.createParticleField();
    this.volume = this.createVolumeShell();
    scene.add(this.particles, this.volume);
  }

  createParticleField() {
    const mobile = matchMedia('(max-width: 760px)').matches;
    const count = mobile ? 2400 : 7600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 18 + Math.random() * 84;
      const arm = Math.sin(i * 12.9898) * 0.38;
      const angle = Math.random() * Math.PI * 2 + arm;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const color = new THREE.Color().setHSL(0.56 + Math.random() * 0.18, 0.65, 0.48 + Math.random() * 0.32);
      colors.set([color.r, color.g, color.b], i * 3);
      sizes[i] = 0.7 + Math.random() * 2.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(geometry, material);
    particles.name = 'gpu-friendly-nebula-particle-field';
    return particles;
  }

  createVolumeShell() {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, colorA: { value: new THREE.Color(0x2446ff) }, colorB: { value: new THREE.Color(0xff9f1c) } },
      vertexShader: `varying vec3 vWorld; void main(){ vec4 world = modelMatrix * vec4(position, 1.0); vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }`,
      fragmentShader: `
        varying vec3 vWorld; uniform float time; uniform vec3 colorA; uniform vec3 colorB;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float noise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float v=0.0; float a=.5; for(int i=0;i<5;i++){ v += a*noise(p); p*=2.03; a*=.5; } return v; }
        void main(){ float d = fbm(normalize(vWorld) * 3.0 + time * 0.025); float edge = pow(1.0 - abs(dot(normalize(vWorld), vec3(0.0,0.0,1.0))), 2.0); vec3 col = mix(colorA, colorB, d); gl_FragColor = vec4(col, smoothstep(.38,.88,d) * edge * .18); }
      `
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(96, 96, 48), material);
    shell.name = 'procedural-volumetric-nebula-raymarch-inspired-shell';
    return shell;
  }

  update(deltaSeconds, elapsedDays) {
    this.particles.rotation.y += deltaSeconds * 0.006;
    this.volume.material.uniforms.time.value = elapsedDays;
  }
}
