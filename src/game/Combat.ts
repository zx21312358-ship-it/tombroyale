import * as THREE from 'three';
import { Player } from '../core/Player';
import { Enemy } from '../entities/Enemy';

/**
 * 战斗系统
 * 处理伤害计算、血条显示、战斗效果等
 */
export class CombatSystem {
  private scene: THREE.Scene;
  private player: Player;
  
  // 伤害数字效果
  private damageNumbers: DamageNumber[] = [];
  
  constructor(scene: THREE.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }
  
  /**
   * 对敌人造成伤害
   */
  damageEnemy(enemy: Enemy, damage: number, isHeadshot: boolean = false): void {
    if (isHeadshot) {
      damage *= 2; // 爆头双倍伤害
    }
    
    enemy.takeDamage(damage);
    this.showDamageNumber(enemy.position, damage, isHeadshot);
  }
  
  /**
   * 对玩家造成伤害
   */
  damagePlayer(damage: number, source?: THREE.Vector3): void {
    // 计算护甲减免
    const armorReduction = 0; // TODO: 从玩家装备获取
    const finalDamage = damage * (1 - armorReduction);
    
    this.player.takeDamage(finalDamage);
    this.showDamageNumber(this.player.getPosition(), -finalDamage, false, true);
    
    // 受伤特效（屏幕闪红）
    this.showHitEffect();
  }
  
  /**
   * 显示伤害数字
   */
  private showDamageNumber(
    position: THREE.Vector3, 
    damage: number, 
    isHeadshot: boolean = false,
    isPlayer: boolean = false
  ): void {
    const damageNumber = new DamageNumber(
      position, 
      damage, 
      isHeadshot,
      isPlayer
    );
    this.scene.add(damageNumber.mesh);
    this.damageNumbers.push(damageNumber);
  }
  
  /**
   * 显示受伤效果
   */
  private showHitEffect(): void {
    // 创建红色覆盖层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, transparent 50%, rgba(255,0,0,0.5) 100%);
      pointer-events: none;
      z-index: 999;
      animation: fadeOut 0.5s ease-out;
    `;
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      overlay.remove();
    }, 500);
  }
  
  /**
   * 更新战斗系统
   */
  update(delta: number): void {
    // 更新伤害数字
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const damageNumber = this.damageNumbers[i];
      damageNumber.update(delta);
      
      if (damageNumber.isDead()) {
        this.scene.remove(damageNumber.mesh);
        this.damageNumbers.splice(i, 1);
      }
    }
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    for (const damageNumber of this.damageNumbers) {
      this.scene.remove(damageNumber.mesh);
    }
    this.damageNumbers = [];
  }
}

/**
 * 伤害数字显示类
 */
class DamageNumber {
  public mesh: THREE.Group;
  private velocity: THREE.Vector3;
  private lifetime: number = 0;
  private maxLifetime: number = 1.5;
  private isDeadFlag: boolean = false;
  
  constructor(
    position: THREE.Vector3, 
    damage: number, 
    isHeadshot: boolean = false,
    isPlayer: boolean = false
  ) {
    this.velocity = new THREE.Vector3(0, 2, 0);
    
    // 创建文本纹理
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;
    
    // 绘制背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 256, 128);
    
    // 绘制数字
    const color = isPlayer ? '#00ff00' : (isHeadshot ? '#ff0000' : '#ffffff');
    ctx.fillStyle = color;
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let text = Math.floor(damage).toString();
    if (isHeadshot) {
      text += ' HEADSHOT!';
    }
    ctx.fillText(text, 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    
    this.mesh = new THREE.Group();
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 1.5, 1);
    sprite.userData.isDamageSprite = true;
    this.mesh.add(sprite);
    
    this.mesh.position.copy(position);
    this.mesh.position.y += 2;
  }
  
  update(delta: number): void {
    this.lifetime += delta;
    
    // 向上移动
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    
    // 减速
    this.velocity.y -= delta * 5;
    
    // 淡出
    if (this.lifetime > this.maxLifetime * 0.5) {
      const alpha = 1 - (this.lifetime - this.maxLifetime * 0.5) / (this.maxLifetime * 0.5);
      this.mesh.children.forEach(child => {
        if (child instanceof THREE.Sprite) {
          (child.material as THREE.SpriteMaterial).opacity = alpha;
        }
      });
    }
    
    if (this.lifetime >= this.maxLifetime) {
      this.isDeadFlag = true;
    }
  }
  
  isDead(): boolean {
    return this.isDeadFlag;
  }
}