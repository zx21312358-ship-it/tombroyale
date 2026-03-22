import * as THREE from 'three';
import { Player } from '../core/Player';
import { World } from '../core/World';
import { EnemyManager } from '../entities/Enemy';
import { LootSystem } from './LootSystem';

/**
 * 吃鸡模式管理类
 * 处理空投、缩圈、安全区、游戏结束逻辑
 */
export class BattleRoyaleManager {
  private scene: THREE.Scene;
  private player: Player;
  private world: World;
  private enemyManager: EnemyManager;
  private lootSystem: LootSystem;

  // 游戏状态
  private gameState: 'waiting' | 'playing' | 'ended' = 'waiting';
  private gameStartTime: number = 0;
  
  // 安全区
  private safeZoneCenter: THREE.Vector2;
  private safeZoneRadius: number = 500;
  private minSafeZoneRadius: number = 20;
  private shrinkSpeed: number = 5;
  private shrinkInterval: number = 60; // 秒
  private lastShrinkTime: number = 0;
  private shrinkPhase: number = 0;
  
  // 空投
  private airdrops: Airdrop[] = [];
  private airdropInterval: number = 30; // 秒
  private lastAirdropTime: number = 0;
  
  // 击杀数
  private killCount: number = 0;
  
  // 剩余玩家（AI）
  private alivePlayers: number = 50;
  
  // 边界效果
  private boundaryMesh: THREE.Mesh | null = null;

  constructor(
    scene: THREE.Scene,
    player: Player,
    world: World,
    enemyManager: EnemyManager,
    lootSystem: LootSystem
  ) {
    this.scene = scene;
    this.player = player;
    this.world = world;
    this.enemyManager = enemyManager;
    this.lootSystem = lootSystem;
    
    this.safeZoneCenter = new THREE.Vector2(0, 0);
    
    this.createBoundary();
  }

  /**
   * 创建边界视觉效果
   */
  private createBoundary(): void {
    // 创建半透明的边界墙
    const geometry = new THREE.CylinderGeometry(
      this.safeZoneRadius,
      this.safeZoneRadius,
      100,
      64,
      1,
      true
    );
    
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    
    this.boundaryMesh = new THREE.Mesh(geometry, material);
    this.boundaryMesh.position.set(0, 50, 0);
    this.scene.add(this.boundaryMesh);
  }

  /**
   * 更新边界
   */
  private updateBoundary(): void {
    if (this.boundaryMesh) {
      this.boundaryMesh.position.x = this.safeZoneCenter.x;
      this.boundaryMesh.position.z = this.safeZoneCenter.y;
      
      const scale = this.safeZoneRadius / 500;
      this.boundaryMesh.scale.x = scale;
      this.boundaryMesh.scale.z = scale;
    }
  }

  /**
   * 开始游戏
   */
  startGame(): void {
    this.gameState = 'playing';
    this.gameStartTime = performance.now() / 1000;
    this.lastShrinkTime = this.gameStartTime;
    this.lastAirdropTime = this.gameStartTime;
    
    // 初始安全区在中心
    this.safeZoneCenter.set(0, 0);
    this.safeZoneRadius = 500;
    
    // 生成初始敌人
    this.enemyManager.spawnEnemies(15);
    
    // 生成初始宝箱
    this.spawnInitialLootBoxes();
    
    // 隐藏边界
    if (this.boundaryMesh) {
      this.boundaryMesh.visible = true;
    }
  }

  /**
   * 生成初始宝箱
   */
  private spawnInitialLootBoxes(): void {
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 200 - 100;
      const z = Math.random() * 200 - 100;
      const y = this.world.getHeightAt(x, z);
      this.lootSystem.spawnLootBox(x, y, z);
    }
  }

  /**
   * 生成空投
   */
  private spawnAirdrop(): void {
    // 在安全区内随机位置生成
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.safeZoneRadius * 0.8;
    
    const x = this.safeZoneCenter.x + Math.cos(angle) * distance;
    const z = this.safeZoneCenter.y + Math.sin(angle) * distance;
    const y = 100; // 从高空落下
    
    const airdrop = new Airdrop(x, y, z, this.scene);
    this.airdrops.push(airdrop);
  }

  /**
   * 缩圈
   */
  private shrinkZone(): void {
    this.shrinkPhase++;
    
    // 新的安全区中心（向当前中心偏移）
    const angle = Math.random() * Math.PI * 2;
    const offset = this.safeZoneRadius * 0.3;
    
    this.safeZoneCenter.x += Math.cos(angle) * offset;
    this.safeZoneCenter.y += Math.sin(angle) * offset;
    
    // 缩小半径
    this.safeZoneRadius = Math.max(
      this.minSafeZoneRadius,
      this.safeZoneRadius * 0.6
    );
    
    this.lastShrinkTime = performance.now() / 1000;
    
    // 更新边界视觉效果
    this.updateBoundary();
  }

  /**
   * 检查玩家是否在安全区内
   */
  private isPlayerInSafeZone(): boolean {
    const playerPos = this.player.getPosition();
    const distance = Math.sqrt(
      Math.pow(playerPos.x - this.safeZoneCenter.x, 2) +
      Math.pow(playerPos.z - this.safeZoneCenter.y, 2)
    );
    
    return distance <= this.safeZoneRadius;
  }

  /**
   * 对圈外玩家造成伤害
   */
  private damagePlayerOutsideZone(delta: number): void {
    if (!this.isPlayerInSafeZone()) {
      // 圈外持续掉血
      this.player.takeDamage(5 * delta);
    }
  }

  /**
   * 更新游戏
   */
  update(delta: number): void {
    if (this.gameState !== 'playing') return;
    
    const currentTime = performance.now() / 1000;
    const elapsedTime = currentTime - this.gameStartTime;
    
    // 缩圈逻辑
    if (currentTime - this.lastShrinkTime >= this.shrinkInterval) {
      this.shrinkZone();
    }
    
    // 空投逻辑
    if (currentTime - this.lastAirdropTime >= this.airdropInterval) {
      this.spawnAirdrop();
      this.lastAirdropTime = currentTime;
    }
    
    // 检查玩家是否在安全区
    this.damagePlayerOutsideZone(delta);
    
    // 更新空投
    for (let i = this.airdrops.length - 1; i >= 0; i--) {
      const airdrop = this.airdrops[i];
      airdrop.update(delta);
      
      if (airdrop.landed) {
        // 检查玩家是否靠近
        const playerPos = this.player.getPosition();
        const distance = Math.sqrt(
          Math.pow(playerPos.x - airdrop.position.x, 2) +
          Math.pow(playerPos.z - airdrop.position.z, 2)
        );
        
        if (distance < 3) {
          // 拾取空投
          this.lootSystem.spawnLootBox(
            airdrop.position.x,
            airdrop.position.y,
            airdrop.position.z,
            'jade'
          );
          airdrop.dispose(this.scene);
          this.airdrops.splice(i, 1);
        }
      }
    }
    
    // 更新敌人
    this.enemyManager.update(delta);
    
    // 计算击杀数（敌人死亡）
    // 简化：每次敌人死亡增加击杀数
    
    // 更新剩余玩家（AI）
    this.updateAlivePlayers();
    
    // 检查游戏结束
    this.checkGameEnd();
  }

  /**
   * 更新剩余玩家
   */
  private updateAlivePlayers(): void {
    // 简化：根据敌人数量估算
    this.alivePlayers = Math.max(1, this.enemyManager.getAliveCount() + 1);
  }

  /**
   * 检查游戏结束
   */
  private checkGameEnd(): void {
    // 玩家死亡
    if (this.player.checkDead()) {
      this.endGame(false);
      return;
    }
    
    // 获胜条件：最后存活
    if (this.alivePlayers <= 1) {
      this.endGame(true);
      return;
    }
  }

  /**
   * 结束游戏
   */
  endGame(victory: boolean): void {
    this.gameState = 'ended';
    
    // 显示游戏结束界面
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverTitle = document.getElementById('game-over-title');
    const gameOverStats = document.getElementById('game-over-stats');
    
    if (gameOverScreen && gameOverTitle && gameOverStats) {
      gameOverScreen.style.display = 'flex';
      
      if (victory) {
        gameOverTitle.textContent = '🏆 大吉大利，今晚吃鸡!';
        gameOverTitle.style.color = '#ffd700';
      } else {
        gameOverTitle.textContent = '💀 游戏结束';
        gameOverTitle.style.color = '#ff4444';
      }
      
      gameOverStats.innerHTML = `
        <div>击杀数：${this.killCount}</div>
        <div>剩余玩家：${this.alivePlayers}</div>
        <div>安全区阶段：${this.shrinkPhase}</div>
      `;
    }
  }

  /**
   * 增加击杀数
   */
  addKill(): void {
    this.killCount++;
  }

  /**
   * 获取游戏状态
   */
  getGameState(): 'waiting' | 'playing' | 'ended' {
    return this.gameState;
  }

  /**
   * 获取击杀数
   */
  getKillCount(): number {
    return this.killCount;
  }

  /**
   * 获取剩余玩家
   */
  getAlivePlayers(): number {
    return this.alivePlayers;
  }

  /**
   * 获取安全区信息
   */
  getSafeZoneInfo(): { center: THREE.Vector2; radius: number } {
    return {
      center: this.safeZoneCenter.clone(),
      radius: this.safeZoneRadius
    };
  }

  /**
   * 重置游戏
   */
  reset(): void {
    this.gameState = 'waiting';
    this.killCount = 0;
    this.alivePlayers = 50;
    this.shrinkPhase = 0;
    this.safeZoneRadius = 500;
    this.safeZoneCenter.set(0, 0);
    
    // 清理空投
    for (const airdrop of this.airdrops) {
      airdrop.dispose(this.scene);
    }
    this.airdrops = [];
    
    // 清理敌人
    this.enemyManager.dispose();
    
    // 清理宝箱
    this.lootSystem.dispose();
    
    // 重置玩家
    this.player.reset();
    
    // 隐藏游戏结束界面
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen) {
      gameOverScreen.style.display = 'none';
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.boundaryMesh) {
      this.boundaryMesh.geometry.dispose();
      (this.boundaryMesh.material as THREE.Material).dispose();
      this.scene.remove(this.boundaryMesh);
    }
    
    for (const airdrop of this.airdrops) {
      airdrop.dispose(this.scene);
    }
    this.airdrops = [];
  }
}

/**
 * 空投类
 */
class Airdrop {
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public velocity: THREE.Vector3;
  public landed: boolean = false;
  
  private scene: THREE.Scene;

  constructor(x: number, y: number, z: number, scene: THREE.Scene) {
    this.position = new THREE.Vector3(x, y, z);
    this.scene = scene;
    this.velocity = new THREE.Vector3(0, -10, 0);
    
    this.mesh = this.createMesh();
    this.scene.add(this.mesh);
  }

  /**
   * 创建空投模型
   */
  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    
    // 箱子主体
    const boxGeometry = new THREE.BoxGeometry(1.5, 1, 1.5);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x4a90d9 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 0, 0);
    group.add(box);
    
    // 条纹
    const stripeGeometry = new THREE.BoxGeometry(1.6, 0.2, 1.6);
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(0, 0.1, 0);
    group.add(stripe);
    
    // 降落伞
    const parachuteGeometry = new THREE.SphereGeometry(2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const parachuteMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const parachute = new THREE.Mesh(parachuteGeometry, parachuteMaterial);
    parachute.position.set(0, 3, 0);
    group.add(parachute);
    
    // 绳子
    const ropeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3);
    const ropeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
    rope.position.set(0, 1.5, 0);
    group.add(rope);
    
    group.position.copy(this.position);
    
    return group;
  }

  /**
   * 更新空投
   */
  update(delta: number): void {
    if (this.landed) return;
    
    // 下落
    this.velocity.y += 2 * delta; // 重力
    this.position.y += this.velocity.y * delta;
    
    // 飘动
    this.position.x += Math.sin(performance.now() / 1000) * 0.5;
    this.position.z += Math.cos(performance.now() / 1000) * 0.5;
    
    // 旋转
    this.mesh.rotation.y += delta * 0.5;
    
    // 落地检测
    if (this.position.y <= 1) {
      this.position.y = 1;
      this.landed = true;
      
      // 移除降落伞
      const parachute = this.mesh.children.find(c => c instanceof THREE.SphereGeometry);
      if (parachute) {
        parachute.visible = false;
      }
    }
    
    this.mesh.position.copy(this.position);
  }

  /**
   * 清理资源
   */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}