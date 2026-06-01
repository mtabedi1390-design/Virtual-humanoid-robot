import * as THREE from 'three';

const DEG = Math.PI / 180;
const AU_TO_SCENE = 1.18;
const OUTER_COMPRESSION = 0.58;

export function sceneUnitsFromAu(au) {
  if (!au) return 0;
  const compressed = au <= 6 ? au : 6 + Math.log2(au - 4) * 5.8 * OUTER_COMPRESSION;
  return compressed * AU_TO_SCENE + 4.5;
}

function solveEccentricAnomaly(meanAnomaly, eccentricity) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 8; i++) {
    eccentricAnomaly -= (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) / (1 - eccentricity * Math.cos(eccentricAnomaly));
  }
  return eccentricAnomaly;
}

export function keplerPosition(elements, elapsedDays = 0, scale = sceneUnitsFromAu(elements.semiMajorAxisAu)) {
  const eccentricity = elements.eccentricity;
  const meanMotion = (Math.PI * 2) / elements.periodDays;
  const meanAnomaly = ((elements.meanAnomalyAtEpoch * DEG) + elapsedDays * meanMotion) % (Math.PI * 2);
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );

  // Kepler polar equation: r = a(1-e²)/(1+e cos θ)
  const normalizedRadius = (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly));
  const local = new THREE.Vector3(
    scale * normalizedRadius * Math.cos(trueAnomaly),
    0,
    scale * normalizedRadius * Math.sin(trueAnomaly)
  );

  const node = elements.longitudeOfAscendingNode * DEG;
  const inclination = elements.inclination * DEG;
  const periapsis = elements.argumentOfPeriapsis * DEG;
  return local.applyEuler(new THREE.Euler(inclination, -node, periapsis, 'YXZ'));
}

export function makeOrbitCurve(elements, segments = 360) {
  const points = [];
  const scale = sceneUnitsFromAu(elements.semiMajorAxisAu);
  for (let i = 0; i <= segments; i++) {
    const anomaly = (i / segments) * Math.PI * 2;
    const radius = scale * (1 - elements.eccentricity ** 2) / (1 + elements.eccentricity * Math.cos(anomaly));
    const local = new THREE.Vector3(radius * Math.cos(anomaly), 0, radius * Math.sin(anomaly));
    points.push(local.applyEuler(new THREE.Euler(elements.inclination * DEG, -elements.longitudeOfAscendingNode * DEG, elements.argumentOfPeriapsis * DEG, 'YXZ')));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}
