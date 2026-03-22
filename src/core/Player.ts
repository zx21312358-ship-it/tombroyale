import * as THREE from 'three';
import { CameraManager } from './Camera';
import { World } from './World';
import { isBlockSolid, worldToVoxel } from '../utils/BlockUtils';

/**
 * 玩家移动和物理类
 * 处理 WASD 移动、跳跃、碰撞检测
 */
export class Player {
  private camera: CameraManager;
  private world: World;
  
  // 移动状态（设为公共以便调试）
  public moveForward: boolean = false;
  public moveBackward: boolean = false;
  public moveLeft: boolean = false;
  public moveRight: boolean = false;
  private isSprinting: boolean = false;
  private canJump: boolean = false;
  
  // 物理参数
  private velocity: THREE.Vector3;
  private direction: THREE.Vector3;
  private speed: number = 9; // 降低 10%：从 10 改为 9
  private sprintMultiplier: number = 1.8;
  private jumpForce: number = 12;
  private gravity: number = 30;
  
  // 玩家尺寸
  private playerHeight: number = 1.8;
  private playerWidth: number = 0.6;
  
  // 状态
  private health: number = 100;
  private maxHealth: number = 100;
  private isDead: boolean = false;
  
  constructor(camera: CameraManager, world: World) {
    this.camera = camera;
    this.world = world;
    
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
    this.setupControls();
  }
  
  /**
   * 设置键盘控制
   */
  private setupControls(): void {
    // 处理按键按下的函数 - 使用 event.code 而非 event.key
    // event.code 基于物理按键位置，不受输入法和系统语言影响
    const handleKeyDown = (event: KeyboardEvent) => {
      // 只对可能引起页面滚动的键调用 preventDefault
      const preventScrollKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
      if (preventScrollKeys.includes(event.code)) {
        event.preventDefault();
        event.stopPropagation();
      }

      // 使用 event.code 判断（基于物理按键位置）
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
        case 'Space':
          if (this.canJump) {
            this.velocity.y = this.jumpForce;
            this.canJump = false;
          }
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = true;
          break;
      }
    };

    // 处理按键松开的函数
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
        case 'Space':
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.isSprinting = false;
          break;
      }
    };

    // 绑定到 document，使用捕获阶段确保优先处理
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);

    console.log('[Player] Controls setup complete');
  }
  
  /**
   * 更新玩家状态
   */
  update(delta: number): void {
    if (this.isDead) return;

    const cameraObject = this.camera.object;
    const oldPos = cameraObject.position.clone();

    // 计算当前速度（基于输入）
    const currentSpeed = this.speed * (this.isSprinting ? this.sprintMultiplier : 1);

    // 应用移动 - 使用 PointerLockControls 的 moveForward 和 moveRight 方法
    // 这些方法会正确处理相机方向
    const moveDistance = currentSpeed * delta;

    if (this.moveForward) {
      this.camera.controls.moveForward(moveDistance);
    }
    if (this.moveBackward) {
      this.camera.controls.moveForward(-moveDistance);
    }
    if (this.moveRight) {
      this.camera.controls.moveRight(moveDistance);
    }
    if (this.moveLeft) {
      this.camera.controls.moveRight(-moveDistance);
    }

    // 获取移动后的位置
    const newPos = cameraObject.position.clone();

    // 重力
    this.velocity.y -= this.gravity * delta;

    // 处理 Y 轴移动
    const newYPos = newPos.clone();
    newYPos.y += this.velocity.y * delta;

    // 地面检测（使用世界高度）
    const groundY = this.world.getHeightAt(newYPos.x, newYPos.z);
    const playerBottom = newYPos.y - this.playerHeight;

    // 添加小缓冲防止陷入地面
    const groundBuffer = 0.01;

    if (playerBottom < groundY + groundBuffer) {
      // 玩家在地面或以下
      newYPos.y = groundY + this.playerHeight + groundBuffer;
      this.velocity.y = 0;
      this.canJump = true;
    } else {
      this.canJump = false;
    }

    // 检查是否掉出世界
    if (newYPos.y < -20) {
      this.takeDamage(100);
      newYPos.set(0, 50, 0);
      this.velocity.set(0, 0, 0);
    }

    cameraObject.position.copy(newYPos);
  }
  
  /**
   * 检查 XZ 平面碰撞（只检查侧面，用于水平移动）
   */
  private checkXZCollision(position: THREE.Vector3): boolean {
    const minX = Math.floor(position.x - this.playerWidth / 2);
    const maxX = Math.floor(position.x + this.playerWidth / 2);
    const minZ = Math.floor(position.z - this.playerWidth / 2);
    const maxZ = Math.floor(position.z + this.playerWidth / 2);

    // 玩家底部位置（脚的位置）
    const playerBottom = position.y - this.playerHeight;

    // 只检查从脚底 +0.5 到头顶 -0.2 的方块
    // 这样排除脚下站立面和头顶上方的方块
    const checkMinY = Math.floor(playerBottom + 0.5);
    const checkMaxY = Math.floor(position.y - 0.2);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let y = checkMinY; y <= checkMaxY; y++) {
          const block = this.world.getBlock(x, y, z);
          if (block !== 0 && isBlockSolid(block)) {
            return true;
          }
        }
      }
    }

    return false;
  }
  
  /**
   * 检查碰撞（用于 Y 轴检测）
   */
  private checkCollision(position: THREE.Vector3): boolean {
    const [voxelX, voxelY, voxelZ] = worldToVoxel(position.x, position.y, position.z);
    
    // 检查玩家包围盒内的方块
    const minX = Math.floor(position.x - this.playerWidth / 2);
    const maxX = Math.floor(position.x + this.playerWidth / 2);
    const minY = Math.floor(position.y - this.playerHeight);
    const maxY = Math.floor(position.y);
    const minZ = Math.floor(position.z - this.playerWidth / 2);
    const maxZ = Math.floor(position.z + this.playerWidth / 2);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = this.world.getBlock(x, y, z);
          if (block !== 0 && isBlockSolid(block)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * 设置玩家位置
   */
  setPosition(x: number, y: number, z: number): void {
    this.camera.object.position.set(x, y, z);
  }
  
  /**
   * 获取玩家位置
   */
  getPosition(): THREE.Vector3 {
    return this.camera.object.position.clone();
  }
  
  /**
   * 受到伤害
   */
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
    }
  }
  
  /**
   * 治疗
   */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
  
  /**
   * 获取生命值
   */
  getHealth(): number {
    return this.health;
  }
  
  /**
   * 获取最大生命值
   */
  getMaxHealth(): number {
    return this.maxHealth;
  }
  
  /**
   * 检查是否死亡
   */
  checkDead(): boolean {
    return this.isDead;
  }
  
  /**
   * 重置玩家状态
   */
  reset(): void {
    this.health = this.maxHealth;
    this.isDead = false;
    this.velocity.set(0, 0, 0);
  }
}