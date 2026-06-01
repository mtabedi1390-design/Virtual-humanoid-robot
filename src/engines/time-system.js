export class PhysicsTimeSystem {
  constructor({ daysPerSecond = 12 } = {}) {
    this.elapsedDays = 8600;
    this.daysPerSecond = daysPerSecond;
    this.lastTimestamp = performance.now();
    this.paused = false;
  }

  update(now) {
    const deltaSeconds = Math.min((now - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = now;
    if (!this.paused) this.elapsedDays += deltaSeconds * this.daysPerSecond;
    return deltaSeconds;
  }
}

export class TemporalJitter {
  constructor() {
    this.index = 0;
    this.sequence = [
      [0.5, 0.333], [0.25, 0.667], [0.75, 0.111], [0.125, 0.444],
      [0.625, 0.778], [0.375, 0.222], [0.875, 0.556], [0.0625, 0.889]
    ];
  }

  apply(camera, width, height) {
    const [x, y] = this.sequence[this.index++ % this.sequence.length];
    camera.setViewOffset(width, height, (x - 0.5) * 0.72, (y - 0.5) * 0.72, width, height);
  }
}
