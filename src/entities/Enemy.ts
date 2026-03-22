import * as THREE from 'three';
import { Player } from '../core/Player';
import { World } from '../core/World';
import { distance3D } from '../utils/BlockUtils';

/**
 * 敌人类型 - 粽子
 */
export class Enemy {
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public health: number;
  public maxHealth: number;
  public damage: number;
  public speed: number;
  public dead: boolean = false;
  
  // AI 状态
  private state: 'idle' | 'chase' | 'attack' = 'idle';
  private target: Player | null = null;
  private attackCooldown: number = 0;
  private attackInterval: number = 1.5;
  
  // 移动
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private gravity: number = 20;
  
  // 掉落
  private lootDropped: boolean = false;

  constructor(x: number, y: number, z: number, world: World) {
    this.position = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.damage = 20;
    this.speed = 3;
    
    this.mesh = this.createMesh(x, y, z);
  }

  /**
   * 创建粽子模型
   */
  private createMesh(x: number, y: number, z: number): THREE.Group {
    const group = new THREE.Group();

    // 身体（绿色 - 粽子皮肤）
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.3);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x3d5c3d });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.35, 0);
    group.add(body);

    // 头部
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0x2d4c2d });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.9, 0);
    group.add(head);

    // 眼睛（红色发光）
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.05);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.95, 0.2);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.95, 0.2);
    group.add(rightEye);

    // 手臂
    const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x2d4c2d });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 0.5, 0.2);
    leftArm.rotation.x = Math.PI / 4;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 0.5, 0.2);
    rightArm.rotation.x = Math.PI / 4;
    group.add(rightArm);

    // 腿部
    const legGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x1d3c1d });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0, 0);
    group.add(rightLeg);

    // 血条
    const healthBarGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.05);
    const healthBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const healthBarBg = new THREE.Mesh(healthBarGeometry, healthBarBgMaterial);
    healthBarBg.position.set(0, 1.5, 0);
    group.add(healthBarBg);

    const healthBarFgGeometry = new THREE.BoxGeometry(0.75, 0.06, 0.06);
    const healthBarFgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const healthBarFg = new THREE.Mesh(healthBarFgGeometry, healthBarFgMaterial);
    healthBarFg.position.set(-0.375, 1.5, 0.03);
    healthBarFg.name = 'healthbar';
    group.add(healthBarFg);

    group.position.copy(this.position);
    group.userData = { type: 'enemy', enemy: this };

    return group;
  }

  /**
   * 更新敌人
   */
  update(delta: number, player: Player, world: World): void {
    if (this.dead) return;

    const playerPos = player.getPosition();
    const distance = distance3D(
      this.position.x, this.position.y, this.position.z,
      playerPos.x, playerPos.y, playerPos.z
    );

    // 状态机
    if (distance < 20) {
      this.state = 'chase';
    } else {
      this.state = 'idle';
    }

    if (distance < 1.5) {
      this.state = 'attack';
    }

    // 执行状态
    switch (this.state) {
      case 'chase':
        this.chase(playerPos, delta, world);
        break;
      case 'attack':
        this.attack(player, delta);
        break;
      case 'idle':
        this.idle(delta);
        break;
    }

    // 更新攻击冷却
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // 更新网格位置
    this.mesh.position.copy(this.position);
    
    // 朝向玩家
    if (this.state === 'chase' || this.state === 'attack') {
      this.mesh.lookAt(playerPos.x, this.position.y, playerPos.z);
    }

    // 更新血条
    this.updateHealthBar();
  }

  /**
   * 追击玩家
   */
  private chase(playerPos: THREE.Vector3, delta: number, world: World): void {
    const direction = new THREE.Vector3()
      .subVectors(playerPos, this.position)
      .normalize();

    // 简单寻路
    const newX = this.position.x + direction.x * this.speed * delta;
    const newZ = this.position.z + direction.z * this.speed * delta;

    // 检查碰撞
    if (!this.checkCollision(newX, this.position.z, world)) {
      this.position.x = newX;
    }
    if (!this.checkCollision(this.position.x, newZ, world)) {
      this.position.z = newZ;
    }

    // 重力
    this.velocity.y -= this.gravity * delta;
    const newY = this.position.y + this.velocity.y * delta;
    
    // 地面检测
    const groundY = this.getGroundY(world);
    if (newY < groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
    } else {
      this.position.y = newY;
    }
  }

  /**
   * 攻击玩家
   */
  private attack(player: Player, delta: number): void {
    if (this.attackCooldown <= 0) {
      player.takeDamage(this.damage);
      this.attackCooldown = this.attackInterval;
      
      // 攻击动画
      this.mesh.scale.set(1.2, 1.2, 1.2);
      setTimeout(() => {
        this.mesh.scale.set(1, 1, 1);
      }, 100);
    }
  }

  /**
   *  idle 状态
   */
  private idle(delta: number): void {
    // 轻微晃动
    this.mesh.rotation.y += delta * 0.5;
  }

  /**
   * 检查碰撞
   */
  private checkCollision(x: number, z: number, world: World): boolean {
    const [vx, vz] = [Math.floor(x), Math.floor(z)];
    
    // 检查周围方块
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const block = world.getBlock(vx + dx, Math.floor(this.position.y), vz + dz);
        if (block !== 0) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 获取地面高度
   */
  private getGroundY(world: World): number {
    const [vx, vz] = [Math.floor(this.position.x), Math.floor(this.position.z)];
    
    for (let y = Math.floor(this.position.y); y >= 0; y--) {
      const block = world.getBlock(vx, y, vz);
      if (block !== 0) {
        return y + 1.5;
      }
    }
    
    return 0;
  }

  /**
   * 受到伤害
   */
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // 受伤动画 - 闪烁红色
    const flashMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.7
    });
    
    // 保存原始材质
    const originalMaterials: THREE.Material[] = [];
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        originalMaterials.push(child.material as THREE.Material);
        child.material = flashMaterial.clone();
      }
    });
    
    setTimeout(() => {
      // 恢复原始材质
      let idx = 0;
      this.mesh.traverse(child => {
        if (child instanceof THREE.Mesh && child.material && idx < originalMaterials.length) {
          child.material = originalMaterials[idx++];
        }
      });
      flashMaterial.dispose();
    }, 100);

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * 死亡
   */
  die(): void {
    this.dead = true;
    
    // 死亡动画 - 散架效果
    this.mesh.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        setTimeout(() => {
          child.visible = false;
        }, index * 50);
      }
    });

    // 掉落物品
    setTimeout(() => {
      this.dropLoot();
    }, 500);
  }

  /**
   * 掉落战利品
   */
  private dropLoot(): void {
    if (this.lootDropped) return;
    this.lootDropped = true;
    
    // 可以添加掉落物品逻辑
  }

  /**
   * 更新血条
   */
  private updateHealthBar(): void {
    const healthBar = this.mesh.getObjectByName('healthbar');
    if (healthBar) {
      const scale = this.health / this.maxHealth;
      healthBar.scale.x = scale;
      healthBar.position.x = -0.375 * scale;
    }
  }

  /**
   * 清理资源
   */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          (child.material as THREE.Material)?.dispose();
        }
      }
    });
  }
}

/**
 * 敌人生成和管理类
 */
export class EnemyManager {
  private scene: THREE.Scene;
  private player: Player;
  private world: World;
  private enemies: Enemy[] = [];
  private maxEnemies: number = 20;

  constructor(scene: THREE.Scene, player: Player, world: World) {
    this.scene = scene;
    this.player = player;
    this.world = world;
  }

  /**
   * 生成敌人
   */
  spawnEnemy(x: number, y: number, z: number): void {
    if (this.enemies.length >= this.maxEnemies) return;

    const enemy = new Enemy(x, y, z, this.world);
    this.scene.add(enemy.mesh);
    this.enemies.push(enemy);
  }

  /**
   * 生成多个敌人
   */
  spawnEnemies(count: number): void {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 100 - 50;
      const z = Math.random() * 100 - 50;
      const y = this.world.getHeightAt(x, z);
      
      // 确保不在玩家附近生成
      const playerPos = this.player.getPosition();
      const distance = distance3D(x, y, z, playerPos.x, playerPos.y, playerPos.z);
      
      if (distance > 20) {
        this.spawnEnemy(x, y, z);
      }
    }
  }

  /**
   * 更新所有敌人
   */
  update(delta: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, this.player, this.world);

      if (enemy.dead) {
        enemy.dispose(this.scene);
        this.enemies.splice(i, 1);
      }
    }
  }

  /**
   * 获取存活敌人数量
   */
  getAliveCount(): number {
    return this.enemies.filter(e => !e.dead).length;
  }

  /**
   * 获取所有敌人
   */
  getAllEnemies(): Enemy[] {
    return this.enemies;
  }

  /**
   * 清理所有敌人
   */
  dispose(): void {
    for (const enemy of this.enemies) {
      enemy.dispose(this.scene);
    }
    this.enemies = [];
  }
}