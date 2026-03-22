import * as THREE from 'three';
import { SimplexNoise } from '../utils/noise';
import { BlockType, isBlockSolid, coordHash } from '../utils/BlockUtils';

// 重新导出 BlockType 供其他模块使用
export { BlockType };

/**
 * Chunk 类
 * 管理 16x16x128 的体素块
 */
class Chunk {
  public static readonly SIZE = 16;
  public static readonly HEIGHT = 128;
  
  public data: Uint8Array;
  public meshes: THREE.InstancedMesh[] = [];
  public dirty: boolean = true;
  public x: number;
  public z: number;
  
  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
    this.data = new Uint8Array(Chunk.SIZE * Chunk.HEIGHT * Chunk.SIZE);
  }
  
  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= Chunk.SIZE || y < 0 || y >= Chunk.HEIGHT || z < 0 || z >= Chunk.SIZE) {
      return BlockType.AIR;
    }
    return this.data[y * Chunk.SIZE * Chunk.SIZE + z * Chunk.SIZE + x] as BlockType;
  }
  
  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= Chunk.SIZE || y < 0 || y >= Chunk.HEIGHT || z < 0 || z >= Chunk.SIZE) {
      return;
    }
    this.data[y * Chunk.SIZE * Chunk.SIZE + z * Chunk.SIZE + x] = type;
    this.dirty = true;
  }
  
  getIndex(x: number, y: number, z: number): number {
    return y * Chunk.SIZE * Chunk.SIZE + z * Chunk.SIZE + x;
  }
}

/**
 * 世界管理类
 * 处理程序化地形生成、Chunk 管理、方块放置/破坏
 */
export class World {
  public static readonly WORLD_SIZE = 256;
  public static readonly CHUNK_SIZE = 16;
  
  private chunks: Map<string, Chunk>;
  private noise: SimplexNoise;
  private scene: THREE.Scene;
  
  // 方块材质
  private materials: Map<BlockType, THREE.MeshLambertMaterial>;
  private geometries: Map<BlockType, THREE.BoxGeometry>;
  
  // 渲染优化
  private renderDistance: number = 4;
  private playerChunkX: number = -999; // 初始设为特殊值，确保第一次调用 updateChunks 时生成 Chunk
  private playerChunkZ: number = -999;
  
  // 高度图缓存
  private heightMap: Float32Array;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.noise = new SimplexNoise(Math.random() * 10000);
    
    // 初始化材质
    this.materials = new Map();
    this.initMaterials();
    
    // 初始化几何体
    this.geometries = new Map();
    this.initGeometries();
    
    // 生成高度图
    this.heightMap = new Float32Array(World.WORLD_SIZE * World.WORLD_SIZE);
    this.generateHeightMap();
  }
  
  /**
   * 初始化材质
   */
  private initMaterials(): void {
    const colors: Record<number, number> = {
      [BlockType.GRASS]: 0x567d46,
      [BlockType.DIRT]: 0x8b5a2b,
      [BlockType.STONE]: 0x808080,
      [BlockType.WOOD]: 0x8b6914,
      [BlockType.LEAVES]: 0x228b22,
      [BlockType.TOMB_BRICK]: 0x4a4a4a,
      [BlockType.BRONZE]: 0xcd7f32,
      [BlockType.CHEST]: 0xffd700,
      [BlockType.SAND]: 0xf4e4c1,
      [BlockType.RUIN_STONE]: 0x696969,
      [BlockType.ANCIENT_STONE]: 0x5a5a5a,
      [BlockType.MOSSY_STONE]: 0x6b8e23
    };
    
    for (const typeStr of Object.keys(colors)) {
      const type = parseInt(typeStr);
      const color = colors[type];
      const material = new THREE.MeshLambertMaterial({ 
        color: color,
        map: this.createPixelTexture(color)
      });
      this.materials.set(type as BlockType, material);
    }
  }
  
  /**
   * 创建像素纹理
   */
  private createPixelTexture(color: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    
    // 填充基础色
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 16, 16);
    
    // 添加噪点
    for (let i = 0; i < 50; i++) {
      const x = Math.floor(Math.random() * 16);
      const y = Math.floor(Math.random() * 16);
      const shade = Math.random() > 0.5 ? 20 : -20;
      ctx.fillStyle = shade > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(x, y, 1, 1);
    }
    
    // 添加边框效果
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 16, 16);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
  
  /**
   * 初始化几何体
   */
  private initGeometries(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 16; i++) {
      this.geometries.set(i as BlockType, geometry);
    }
  }
  
  /**
   * 生成高度图
   */
  private generateHeightMap(): void {
    const scale = 0.02;
    const heightMultiplier = 20;
    
    for (let z = 0; z < World.WORLD_SIZE; z++) {
      for (let x = 0; x < World.WORLD_SIZE; x++) {
        const nx = x * scale;
        const nz = z * scale;
        
        // 多层噪声叠加
        let height = 0;
        height += this.noise.noise3D(nx, nz, 0) * 1;
        height += this.noise.noise3D(nx * 2, nz * 2, 0) * 0.5;
        height += this.noise.noise3D(nx * 4, nz * 4, 0) * 0.25;
        
        this.heightMap[z * World.WORLD_SIZE + x] = 30 + height * heightMultiplier;
      }
    }
  }
  
  /**
   * 获取某位置的高度
   */
  getHeightAt(x: number, z: number): number {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    
    if (xi < 0 || xi >= World.WORLD_SIZE - 1 || zi < 0 || zi >= World.WORLD_SIZE - 1) {
      return 30;
    }
    
    const fx = x - xi;
    const fz = z - zi;
    
    const h00 = this.heightMap[zi * World.WORLD_SIZE + xi];
    const h10 = this.heightMap[zi * World.WORLD_SIZE + xi + 1];
    const h01 = this.heightMap[(zi + 1) * World.WORLD_SIZE + xi];
    const h11 = this.heightMap[(zi + 1) * World.WORLD_SIZE + xi + 1];
    
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    
    return h0 * (1 - fz) + h1 * fz;
  }
  
  /**
   * 生成 Chunk
   */
  private generateChunk(chunkX: number, chunkZ: number): Chunk {
    const chunk = new Chunk(chunkX, chunkZ);
    
    const baseX = chunkX * Chunk.SIZE;
    const baseZ = chunkZ * Chunk.SIZE;
    
    for (let x = 0; x < Chunk.SIZE; x++) {
      for (let z = 0; z < Chunk.SIZE; z++) {
        const worldX = baseX + x;
        const worldZ = baseZ + z;
        
        if (worldX >= World.WORLD_SIZE || worldZ >= World.WORLD_SIZE) continue;
        
        const surfaceY = Math.floor(this.getHeightAt(worldX, worldZ));
        
        for (let y = 0; y < Chunk.HEIGHT; y++) {
          let blockType = BlockType.AIR;
          
          if (y === surfaceY) {
            // 地表
            if (y < 25) {
              blockType = BlockType.SAND;
            } else if (Math.random() < 0.02) {
              // 废墟
              blockType = BlockType.RUIN_STONE;
            } else {
              blockType = BlockType.GRASS;
            }
          } else if (y < surfaceY) {
            // 地下
            const depth = surfaceY - y;
            if (depth < 4) {
              blockType = BlockType.DIRT;
            } else if (depth < 15) {
              // 随机生成古墓通道
              if (this.isTombPassage(worldX, y, worldZ)) {
                blockType = BlockType.AIR;
              } else {
                blockType = BlockType.STONE;
              }
            } else {
              // 古墓房间
              if (this.isTombRoom(worldX, y, worldZ)) {
                blockType = BlockType.AIR;
              } else {
                blockType = BlockType.TOMB_BRICK;
              }
            }
          }
          
          chunk.setBlock(x, y, z, blockType);
        }
        
        // 生成树木（稀疏）
        if (surfaceY > 25 && Math.random() < 0.01) {
          this.generateTree(chunk, x, surfaceY + 1, z);
        }
      }
    }
    
    return chunk;
  }
  
  /**
   * 检查是否是古墓通道
   */
  private isTombPassage(x: number, y: number, z: number): boolean {
    // 使用噪声生成通道
    const noiseVal = this.noise.noise3D(x * 0.1, y * 0.1, z * 0.1);
    return noiseVal > 0.6;
  }
  
  /**
   * 检查是否是古墓房间
   */
  private isTombRoom(x: number, y: number, z: number): boolean {
    // 房间生成逻辑
    const roomSize = 8;
    const roomX = Math.floor(x / roomSize) * roomSize + roomSize / 2;
    const roomZ = Math.floor(z / roomSize) * roomSize + roomSize / 2;
    
    const dx = Math.abs(x - roomX);
    const dz = Math.abs(z - roomZ);
    
    if (dx < roomSize / 2 - 1 && dz < roomSize / 2 - 1 && y < 20) {
      return this.noise.noise3D(roomX * 0.01, y * 0.1, roomZ * 0.01) > 0.3;
    }
    
    return false;
  }
  
  /**
   * 生成树
   */
  private generateTree(chunk: Chunk, x: number, y: number, z: number): void {
    const trunkHeight = 3 + Math.floor(Math.random() * 3);
    
    // 树干
    for (let i = 0; i < trunkHeight; i++) {
      if (y + i < Chunk.HEIGHT) {
        chunk.setBlock(x, y + i, z, BlockType.WOOD);
      }
    }
    
    // 树叶
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + dy < 4) {
            const nx = x + dx;
            const ny = y + trunkHeight + dy;
            const nz = z + dz;
            if (nx >= 0 && nx < Chunk.SIZE && ny < Chunk.HEIGHT && nz >= 0 && nz < Chunk.SIZE) {
              if (chunk.getBlock(nx, ny, nz) === BlockType.AIR) {
                chunk.setBlock(nx, ny, nz, BlockType.LEAVES);
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * 获取 Chunk
   */
  getChunk(chunkX: number, chunkZ: number): Chunk | null {
    const key = coordHash(chunkX, 0, chunkZ);
    if (!this.chunks.has(key)) {
      const chunk = this.generateChunk(chunkX, chunkZ);
      this.chunks.set(key, chunk);
    }
    return this.chunks.get(key) || null;
  }
  
  /**
   * 获取方块
   */
  getBlock(x: number, y: number, z: number): BlockType {
    const chunkX = Math.floor(x / Chunk.SIZE);
    const chunkZ = Math.floor(z / Chunk.SIZE);
    
    const chunk = this.getChunk(chunkX, chunkZ);
    if (!chunk) return BlockType.AIR;
    
    const localX = ((x % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE;
    const localZ = ((z % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE;
    
    return chunk.getBlock(localX, y, localZ);
  }
  
  /**
   * 设置方块
   */
  setBlock(x: number, y: number, z: number, type: BlockType): void {
    const chunkX = Math.floor(x / Chunk.SIZE);
    const chunkZ = Math.floor(z / Chunk.SIZE);
    
    const chunk = this.getChunk(chunkX, chunkZ);
    if (!chunk) return;
    
    const localX = ((x % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE;
    const localZ = ((z % Chunk.SIZE) + Chunk.SIZE) % Chunk.SIZE;
    
    chunk.setBlock(localX, y, localZ, type);
  }
  
  /**
   * 更新可见 Chunk
   */
  updateChunks(playerX: number, playerZ: number): void {
    const newChunkX = Math.floor(playerX / Chunk.SIZE);
    const newChunkZ = Math.floor(playerZ / Chunk.SIZE);
    
    // 如果 Chunk 没变化，只更新 dirty 的
    if (newChunkX === this.playerChunkX && newChunkZ === this.playerChunkZ) {
      this.updateDirtyChunks();
      return;
    }
    
    this.playerChunkX = newChunkX;
    this.playerChunkZ = newChunkZ;
    
    // 移除远的 Chunk
    for (const [key, chunk] of this.chunks) {
      const dx = Math.abs(chunk.x - newChunkX);
      const dz = Math.abs(chunk.z - newChunkZ);
      if (dx > this.renderDistance + 2 || dz > this.renderDistance + 2) {
        for (const mesh of chunk.meshes) {
          this.scene.remove(mesh);
        }
        chunk.meshes = [];
        this.chunks.delete(key);
      }
    }
    
    // 生成/更新附近的 Chunk
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        const chunkX = newChunkX + dx;
        const chunkZ = newChunkZ + dz;
        const chunk = this.getChunk(chunkX, chunkZ);
        if (chunk) {
          this.updateChunkMesh(chunk);
        }
      }
    }
  }
  
  /**
   * 更新 dirty 的 Chunk
   */
  private updateDirtyChunks(): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) {
        this.updateChunkMesh(chunk);
      }
    }
  }
  
  /**
   * 更新 Chunk 网格
   */
  private updateChunkMesh(chunk: Chunk): void {
    if (!chunk.dirty) return;
    
    // 移除旧网格
    for (const mesh of chunk.meshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    chunk.meshes = [];
    
    // 收集可见方块
    const instances: Array<{ x: number; y: number; z: number; type: BlockType }> = [];
    
    for (let x = 0; x < Chunk.SIZE; x++) {
      for (let y = 0; y < Chunk.HEIGHT; y++) {
        for (let z = 0; z < Chunk.SIZE; z++) {
          const block = chunk.getBlock(x, y, z);
          if (block !== BlockType.AIR) {
            // 检查是否至少有一面可见
            if (this.isBlockVisible(chunk, x, y, z, block)) {
              const worldX = chunk.x * Chunk.SIZE + x;
              const worldZ = chunk.z * Chunk.SIZE + z;
              instances.push({ x: worldX, y, z: worldZ, type: block });
            }
          }
        }
      }
    }
    
    if (instances.length === 0) {
      chunk.dirty = false;
      return;
    }
    
    // 按类型分组
    const byType = new Map<BlockType, Array<{ x: number; y: number; z: number }>>();
    for (const inst of instances) {
      if (!byType.has(inst.type)) {
        byType.set(inst.type, []);
      }
      byType.get(inst.type)!.push({ x: inst.x, y: inst.y, z: inst.z });
    }
    
    // 为每种类型创建 InstancedMesh
    for (const [type, positions] of byType) {
      const material = this.materials.get(type);
      const geometry = this.geometries.get(type);
      
      if (!material || !geometry) {
        console.warn('Missing material or geometry for type:', type);
        continue;
      }
      
      const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        matrix.setPosition(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
        mesh.setMatrixAt(i, matrix);
      }
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // 禁用视锥体剔除以确保渲染
      
      this.scene.add(mesh);
      chunk.meshes.push(mesh);
    }
    
    console.log('Chunk mesh updated at', chunk.x, chunk.z, 'types:', byType.size, 'total instances:', instances.length);
    
    chunk.dirty = false;
  }
  
  /**
   * 检查方块是否可见
   */
  private isBlockVisible(chunk: Chunk, x: number, y: number, z: number, type: BlockType): boolean {
    // 检查六个面
    const neighbors = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ];
    
    for (const [dx, dy, dz] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      
      // 检查 Chunk 边界
      if (nx < 0 || nx >= Chunk.SIZE || ny < 0 || ny >= Chunk.HEIGHT || nz < 0 || nz >= Chunk.SIZE) {
        return true; // 边界可见
      }
      
      const neighbor = chunk.getBlock(nx, ny, nz);
      if (neighbor === BlockType.AIR) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 生成世界（初始调用）
   */
  generate(): void {
    // 初始生成玩家周围的 Chunk
    this.updateChunks(0, 0);
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    for (const chunk of this.chunks.values()) {
      for (const mesh of chunk.meshes) {
        this.scene.remove(mesh);
      }
    }
    this.chunks.clear();
  }
}