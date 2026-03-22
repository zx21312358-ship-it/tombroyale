/**
 * 方块类型定义和工具函数
 */

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  TOMB_BRICK = 6,
  BRONZE = 7,
  CHEST = 8,
  WATER = 9,
  SAND = 10,
  RUIN_STONE = 11,
  ANCIENT_STONE = 12,
  MOSSY_STONE = 13
}

export interface BlockData {
  type: BlockType;
  solid: boolean;
  transparent: boolean;
  name: string;
  color: number;
}

/**
 * 方块属性定义
 */
export const BLOCKS: Record<BlockType, BlockData> = {
  [BlockType.AIR]: {
    type: BlockType.AIR,
    solid: false,
    transparent: true,
    name: '空气',
    color: 0x000000
  },
  [BlockType.GRASS]: {
    type: BlockType.GRASS,
    solid: true,
    transparent: false,
    name: '草地',
    color: 0x567d46
  },
  [BlockType.DIRT]: {
    type: BlockType.DIRT,
    solid: true,
    transparent: false,
    name: '泥土',
    color: 0x8b5a2b
  },
  [BlockType.STONE]: {
    type: BlockType.STONE,
    solid: true,
    transparent: false,
    name: '石头',
    color: 0x808080
  },
  [BlockType.WOOD]: {
    type: BlockType.WOOD,
    solid: true,
    transparent: false,
    name: '木头',
    color: 0x8b6914
  },
  [BlockType.LEAVES]: {
    type: BlockType.LEAVES,
    solid: true,
    transparent: true,
    name: '树叶',
    color: 0x228b22
  },
  [BlockType.TOMB_BRICK]: {
    type: BlockType.TOMB_BRICK,
    solid: true,
    transparent: false,
    name: '墓砖',
    color: 0x4a4a4a
  },
  [BlockType.BRONZE]: {
    type: BlockType.BRONZE,
    solid: true,
    transparent: false,
    name: '青铜器',
    color: 0xcd7f32
  },
  [BlockType.CHEST]: {
    type: BlockType.CHEST,
    solid: true,
    transparent: false,
    name: '宝箱',
    color: 0xffd700
  },
  [BlockType.WATER]: {
    type: BlockType.WATER,
    solid: false,
    transparent: true,
    name: '水',
    color: 0x4169e1
  },
  [BlockType.SAND]: {
    type: BlockType.SAND,
    solid: true,
    transparent: false,
    name: '沙子',
    color: 0xf4e4c1
  },
  [BlockType.RUIN_STONE]: {
    type: BlockType.RUIN_STONE,
    solid: true,
    transparent: false,
    name: '废墟石',
    color: 0x696969
  },
  [BlockType.ANCIENT_STONE]: {
    type: BlockType.ANCIENT_STONE,
    solid: true,
    transparent: false,
    name: '古石',
    color: 0x5a5a5a
  },
  [BlockType.MOSSY_STONE]: {
    type: BlockType.MOSSY_STONE,
    solid: true,
    transparent: false,
    name: '青苔石',
    color: 0x6b8e23
  }
};

/**
 * 获取方块的纹理颜色
 */
export function getBlockColor(type: BlockType): number {
  return BLOCKS[type]?.color || 0xff00ff;
}

/**
 * 检查方块是否固体
 */
export function isBlockSolid(type: BlockType): boolean {
  return BLOCKS[type]?.solid ?? false;
}

/**
 * 检查方块是否透明
 */
export function isBlockTransparent(type: BlockType): boolean {
  return BLOCKS[type]?.transparent ?? true;
}

/**
 * 世界坐标转体素坐标
 */
export function worldToVoxel(x: number, y: number, z: number): [number, number, number] {
  return [
    Math.floor(x),
    Math.floor(y),
    Math.floor(z)
  ];
}

/**
 * 体素坐标转世界坐标
 */
export function voxelToWorld(x: number, y: number, z: number): [number, number, number] {
  return [
    x + 0.5,
    y + 0.5,
    z + 0.5
  ];
}

/**
 * 3D 坐标哈希（用于 Map 键）
 */
export function coordHash(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * 解析坐标哈希
 */
export function parseCoordHash(hash: string): [number, number, number] {
  const parts = hash.split(',').map(Number);
  return [parts[0], parts[1], parts[2]];
}

/**
 * 获取方块相邻坐标
 */
export function getAdjacentCoords(x: number, y: number, z: number): Array<[number, number, number]> {
  return [
    [x + 1, y, z],
    [x - 1, y, z],
    [x, y + 1, z],
    [x, y - 1, z],
    [x, y, z + 1],
    [x, y, z - 1]
  ];
}

/**
 * 计算方块亮度（用于简单光照）
 */
export function calculateBlockLight(x: number, y: number, z: number, heightMap: Float32Array, worldSize: number): number {
  const surfaceHeight = getHeightAt(x, z, heightMap, worldSize);
  const depth = surfaceHeight - y;
  
  // 地表以上全亮
  if (depth < 0) return 1.0;
  
  // 地下衰减
  if (depth < 5) return 0.8;
  if (depth < 10) return 0.5;
  if (depth < 20) return 0.3;
  return 0.1;
}

/**
 * 获取某位置的高度
 */
export function getHeightAt(x: number, z: number, heightMap: Float32Array, worldSize: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  
  if (xi < 0 || xi >= worldSize - 1 || zi < 0 || zi >= worldSize - 1) {
    return 0;
  }
  
  const fx = x - xi;
  const fz = z - zi;
  
  // 双线性插值
  const h00 = heightMap[zi * worldSize + xi];
  const h10 = heightMap[zi * worldSize + xi + 1];
  const h01 = heightMap[(zi + 1) * worldSize + xi];
  const h11 = heightMap[(zi + 1) * worldSize + xi + 1];
  
  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;
  
  return h0 * (1 - fz) + h1 * fz;
}

/**
 * 简单距离计算
 */
export function distance3D(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 限制值在范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}