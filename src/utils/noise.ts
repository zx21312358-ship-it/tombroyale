/**
 * Simplex Noise 实现
 * 用于程序化地形生成
 */

export class SimplexNoise {
  private p: Uint8Array;
  private perm: Uint8Array;
  private permMod12: Uint8Array;

  constructor(seed: number = Math.random() * 10000) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    
    // 使用种子初始化排列
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }
    
    // 洗牌算法
    let n = 256;
    while (n > 1) {
      const k = Math.floor(seed * (n--));
      seed = (seed * 16807) % 2147483647;
      [this.p[n], this.p[k]] = [this.p[k], this.p[n]];
    }
    
    // 复制到 perm 数组（扩展一倍用于溢出处理）
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  private static readonly G3 = 1 / 6;
  private static readonly F3 = 1 / 3;

  noise3D(xin: number, yin: number, zin: number): number {
    const { perm, permMod12 } = this;
    
    let n0, n1, n2, n3;
    
    // Skew input space to determine which simplex cell we're in
    const s = (xin + yin + zin) * SimplexNoise.F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    
    const t = (i + j + k) * SimplexNoise.G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    
    // Unskew the cell origin back to (x,y,z) space
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;
    
    // Determine which simplex we're in
    let i1, j1, k1;
    let i2, j2, k2;
    
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0;
        i2 = 1; j2 = 1; k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0;
        i2 = 1; j2 = 0; k2 = 1;
      } else {
        i1 = 0; j1 = 0; k1 = 1;
        i2 = 1; j2 = 0; k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0; j1 = 0; k1 = 1;
        i2 = 0; j2 = 1; k2 = 1;
      } else if (x0 < z0) {
        i1 = 0; j1 = 1; k1 = 0;
        i2 = 0; j2 = 1; k2 = 1;
      } else {
        i1 = 0; j1 = 1; k1 = 0;
        i2 = 1; j2 = 1; k2 = 0;
      }
    }
    
    // Offsets for corners
    const x1 = x0 - i1 + SimplexNoise.G3;
    const y1 = y0 - j1 + SimplexNoise.G3;
    const z1 = z0 - k1 + SimplexNoise.G3;
    const x2 = x0 - i2 + 2 * SimplexNoise.G3;
    const y2 = y0 - j2 + 2 * SimplexNoise.G3;
    const z2 = z0 - k2 + 2 * SimplexNoise.G3;
    const x3 = x0 - 1 + 3 * SimplexNoise.G3;
    const y3 = y0 - 1 + 3 * SimplexNoise.G3;
    const z3 = z0 - 1 + 3 * SimplexNoise.G3;
    
    // Work out the hashed gradient indices
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    
    // Calculate contribution from four corners
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
      t0 *= t0;
      n0 = t0 * t0 * this.dot([SimplexNoise.grad3[gi0], SimplexNoise.grad3[gi0 + 1], SimplexNoise.grad3[gi0 + 2]], [x0, y0, z0]);
    }
    
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      t1 *= t1;
      n1 = t1 * t1 * this.dot([SimplexNoise.grad3[gi1], SimplexNoise.grad3[gi1 + 1], SimplexNoise.grad3[gi1 + 2]], [x1, y1, z1]);
    }
    
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      t2 *= t2;
      n2 = t2 * t2 * this.dot([SimplexNoise.grad3[gi2], SimplexNoise.grad3[gi2 + 1], SimplexNoise.grad3[gi2 + 2]], [x2, y2, z2]);
    }
    
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) {
      n3 = 0;
    } else {
      const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
      t3 *= t3;
      n3 = t3 * t3 * this.dot([SimplexNoise.grad3[gi3], SimplexNoise.grad3[gi3 + 1], SimplexNoise.grad3[gi3 + 2]], [x3, y3, z3]);
    }
    
    // Add contributions from each corner to get the final noise value
    // The result is scaled to return values in the interval [-1,1]
    return 32 * (n0 + n1 + n2 + n3);
  }

  private dot(g: number[], n: number[]): number {
    return g[0] * n[0] + g[1] * n[1] + g[2] * n[2];
  }

  private static readonly grad3 = [
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
  ];
}

/**
 * 分形布朗运动 - 多层噪声叠加
 */
export function fbm(noise: SimplexNoise, x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let lacunarity = 2;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise.noise3D(x * frequency, y * frequency, 0);
    frequency *= lacunarity;
    amplitude *= 0.5;
  }
  
  return value;
}

/**
 * 生成高度图
 */
export function generateHeightMap(
  noise: SimplexNoise,
  size: number,
  scale: number = 0.01,
  heightMultiplier: number = 30
): Float32Array {
  const heights = new Float32Array(size * size);
  
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const nx = x * scale;
      const nz = z * scale;
      const height = fbm(noise, nx, nz, 4);
      heights[z * size + x] = height * heightMultiplier;
    }
  }
  
  return heights;
}