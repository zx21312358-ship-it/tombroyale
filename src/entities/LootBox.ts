import * as THREE from 'three';

/**
 * 宝箱类型
 */
export type LootBoxType = 'bronze' | 'gold' | 'jade' | 'tomb';

/**
 * 宝箱类
 * 用于在古墓中生成可交互的宝箱
 */
export class LootBoxEntity {
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public opened: boolean = false;
  public type: LootBoxType;
  
  // 发光动画
  private floatOffset: number = 0;
  
  constructor(x: number, y: number, z: number, type: LootBoxType = 'bronze') {
    this.position = new THREE.Vector3(x, y, z);
    this.type = type;
    this.mesh = this.createMesh();
    this.mesh.position.set(x, y, z);
    this.mesh.userData = { type: 'lootbox', lootbox: this };
  }
  
  /**
   * 创建宝箱模型
   */
  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    
    // 宝箱颜色
    const colors: Record<LootBoxType, number> = {
      bronze: 0xcd7f32,
      gold: 0xffd700,
      jade: 0x00ff7f,
      tomb: 0x8b4513
    };
    
    const color = colors[this.type];
    
    // 宝箱主体
    const boxGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.5);
    const boxMaterial = new THREE.MeshLambertMaterial({ 
      color,
      map: this.createPixelTexture(color)
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 0.3, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);
    
    // 宝箱盖
    const lidGeometry = new THREE.BoxGeometry(0.85, 0.15, 0.55);
    const lid = new THREE.Mesh(lidGeometry, boxMaterial);
    lid.position.set(0, 0.65, 0);
    lid.castShadow = true;
    group.add(lid);
    
    // 装饰（金属包边）
    const trimMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffaa00,
      metalness: 0.8,
      roughness: 0.2
    });
    
    // 横向包边
    const trimGeo1 = new THREE.BoxGeometry(0.9, 0.05, 0.55);
    const trim1 = new THREE.Mesh(trimGeo1, trimMaterial);
    trim1.position.set(0, 0.5, 0);
    group.add(trim1);
    
    // 纵向包边
    const trimGeo2 = new THREE.BoxGeometry(0.1, 0.3, 0.55);
    const trim2 = new THREE.Mesh(trimGeo2, trimMaterial);
    trim2.position.set(0, 0.45, 0);
    group.add(trim2);
    
    // 发光球体
    const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0.9, 0);
    group.add(glow);
    
    // 点光源
    const pointLight = new THREE.PointLight(color, 1, 5);
    pointLight.position.set(0, 1, 0);
    group.add(pointLight);
    
    return group;
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
    
    // 添加木纹效果
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 2);
      ctx.lineTo(16, i * 2);
      ctx.stroke();
    }
    
    // 添加噪点
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * 16);
      const y = Math.floor(Math.random() * 16);
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(x, y, 1, 1);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
  
  /**
   * 打开宝箱
   */
  open(): void {
    if (this.opened) return;
    this.opened = true;
    
    // 打开动画：盖子旋转
    const lid = this.mesh.children[1];
    if (lid) {
      lid.rotation.x = -Math.PI / 3;
      lid.position.y += 0.2;
    }
    
    // 减少发光
    const glow = this.mesh.children[4];
    if (glow instanceof THREE.Mesh) {
      (glow.material as THREE.Material).opacity = 0.2;
    }
    
    // 减少光源
    const light = this.mesh.children[5];
    if (light instanceof THREE.PointLight) {
      light.intensity = 0.3;
    }
  }
  
  /**
   * 更新宝箱（动画）
   */
  update(delta: number): void {
    if (this.opened) return;
    
    this.floatOffset += delta * 2;
    
    // 浮动动画
    this.mesh.position.y = this.position.y + Math.sin(this.floatOffset) * 0.05;
    
    // 缓慢旋转
    this.mesh.rotation.y += delta * 0.3;
  }
  
  /**
   * 检查是否在范围内
   */
  isInRange(position: THREE.Vector3, range: number): boolean {
    return this.position.distanceTo(position) <= range;
  }
  
  /**
   * 清理资源
   */
  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    
    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}

/**
 * 批量生成宝箱
 */
export class LootBoxSpawner {
  private lootBoxes: LootBoxEntity[] = [];
  private scene: THREE.Scene;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  /**
   * 生成宝箱
   */
  spawn(x: number, y: number, z: number, type?: LootBoxType): LootBoxEntity {
    const boxType = type || this.getRandomType();
    const lootBox = new LootBoxEntity(x, y, z, boxType);
    this.scene.add(lootBox.mesh);
    this.lootBoxes.push(lootBox);
    return lootBox;
  }
  
  /**
   * 随机类型
   */
  private getRandomType(): LootBoxType {
    const rand = Math.random();
    if (rand < 0.5) return 'bronze';
    if (rand < 0.8) return 'gold';
    if (rand < 0.95) return 'jade';
    return 'tomb';
  }
  
  /**
   * 获取所有宝箱
   */
  getAllBoxes(): LootBoxEntity[] {
    return [...this.lootBoxes];
  }
  
  /**
   * 更新所有宝箱
   */
  update(delta: number): void {
    for (const box of this.lootBoxes) {
      box.update(delta);
    }
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    for (const box of this.lootBoxes) {
      box.dispose(this.scene);
    }
    this.lootBoxes = [];
  }
}