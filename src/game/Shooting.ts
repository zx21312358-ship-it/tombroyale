import * as THREE from 'three';
import { CameraManager } from '../core/Camera';
import { World, BlockType } from '../core/World';
import { Player } from '../core/Player';

/**
 * 子弹类
 */
export class Bullet {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public mesh: THREE.Mesh;
  public damage: number;
  public active: boolean = true;
  public lifetime: number = 3; // 秒

  constructor(position: THREE.Vector3, direction: THREE.Vector3, damage: number = 25) {
    this.position = position.clone();
    this.velocity = direction.clone().multiplyScalar(50); // 子弹速度
    this.damage = damage;

    // 创建子弹网格（小黄色球体）
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
  }

  update(delta: number): void {
    this.position.add(this.velocity.clone().multiplyScalar(delta));
    this.mesh.position.copy(this.position);
    this.lifetime -= delta;

    if (this.lifetime <= 0) {
      this.active = false;
    }
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/**
 * 射击管理类
 * 处理射击、射线检测、方块破坏
 */
export class ShootingManager {
  private camera: CameraManager;
  private world: World;
  private player: Player;
  private scene: THREE.Scene;

  private bullets: Bullet[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  // 射击状态
  private canShoot: boolean = true;
  private shootCooldown: number = 0.15; // 射击间隔
  private currentShootTime: number = 0;

  // 武器
  private currentWeapon: string = 'pistol';
  private weapons: Record<string, { damage: number; fireRate: number; spread: number }> = {
    pistol: { damage: 25, fireRate: 0.15, spread: 0.02 },
    rifle: { damage: 20, fireRate: 0.1, spread: 0.05 },
    shotgun: { damage: 15, fireRate: 0.5, spread: 0.15 },
    sniper: { damage: 80, fireRate: 1.0, spread: 0.001 }
  };

  // 后坐力
  private recoil: THREE.Vector2 = new THREE.Vector2();

  constructor(camera: CameraManager, world: World, player: Player, scene: THREE.Scene) {
    this.camera = camera;
    this.world = world;
    this.player = player;
    this.scene = scene;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupControls();
    this.createGunModel();
  }

  /**
   * 创建枪械模型（简单方块）
   */
  private gunModel: THREE.Mesh | null = null;

  private createGunModel(): void {
    // 简单的枪模型
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
    this.gunModel = new THREE.Mesh(geometry, material);

    // 将枪添加到相机
    const cameraObj = this.camera.controls.getObject();
    this.gunModel.position.set(0.2, -0.2, -0.3);
    cameraObj.add(this.gunModel);
  }

  /**
   * 设置控制
   *
   * 注意：只处理武器切换和 B 键放置方块，不拦截 WASD 移动键
   */
  private setupControls(): void {
    const onMouseDown = (event: MouseEvent) => {
      if (!this.camera.isLocked()) return;

      if (event.button === 0) {
        // 左键射击
        this.shoot();
      } else if (event.button === 2) {
        // 右键破坏方块
        this.destroyBlock();
      }
    };

    const onMouseUp = () => {
      // 停止连射
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // 数字键切换武器
      if (['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        const weaponIndex = parseInt(event.key) - 1;
        const weapons = ['pistol', 'rifle', 'shotgun', 'sniper'];
        this.currentWeapon = weapons[weaponIndex];
        return;
      }
      // B 键放置方块
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        this.placeBlock();
        return;
      }
      // 重要：不要拦截移动键（WASD、箭头键、Shift、空格），让 Player.ts 处理
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown, { passive: false });

    // 禁用右键菜单
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  /**
   * 射击
   */
  shoot(): void {
    const now = performance.now() / 1000;
    if (now - this.currentShootTime < this.shootCooldown) return;

    this.currentShootTime = now;
    const weapon = this.weapons[this.currentWeapon];

    // 获取射击方向
    const direction = this.camera.getDirection();

    // 应用后坐力
    this.applyRecoil(weapon.spread);

    // 创建子弹
    const cameraPos = this.camera.getPosition();
    const bullet = new Bullet(cameraPos, direction, weapon.damage);
    this.scene.add(bullet.mesh);
    this.bullets.push(bullet);

    // 枪口动画
    this.gunRecoil();

    // 射线检测命中
    this.raycaster.set(cameraPos, direction);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      if (intersect.distance > 100) break;

      // 检查是否击中敌人 - 向上查找父对象
      let targetObject: THREE.Object3D | null = intersect.object;
      while (targetObject && !targetObject.userData.type) {
        targetObject = targetObject.parent;
      }
      
      if (targetObject && targetObject.userData.type === 'enemy') {
        const enemy = targetObject.userData.enemy;
        if (enemy) {
          enemy.takeDamage(weapon.damage);
          // 命中反馈 - 闪烁效果
          this.showHitMarker(targetObject as THREE.Mesh);
        }
        break;
      }

      // 检查是否击中方块
      const hitPos = intersect.point;
      const normal = intersect.face?.normal;
      if (normal) {
        // 可以添加命中粒子效果
      }
      break;
    }
  }

  /**
   * 应用后坐力
   */
  private applyRecoil(spread: number): void {
    const pitchObject = (this.camera as any).pitchObject;
    if (pitchObject) {
      pitchObject.rotation.x += (Math.random() - 0.5) * spread;
      this.camera.getObject().rotation.y += (Math.random() - 0.5) * spread * 0.5;
    }
  }

  /**
   * 命中标记反馈
   */
  private showHitMarker(mesh: THREE.Mesh): void {
    // 闪烁效果
    const originalMaterial = mesh.material;
    const flashMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    mesh.material = flashMaterial;
    
    setTimeout(() => {
      mesh.material = originalMaterial;
      flashMaterial.dispose();
    }, 100);
  }

  /**
   * 枪械后坐力动画
   */
  private gunRecoil(): void {
    if (!this.gunModel) return;

    const originalPos = new THREE.Vector3(0.2, -0.2, -0.3);
    const recoilPos = new THREE.Vector3(0.2, -0.15, -0.2);

    // 简单动画
    this.gunModel.position.copy(recoilPos);

    setTimeout(() => {
      if (this.gunModel) {
        this.gunModel.position.copy(originalPos);
      }
    }, 100);
  }

  /**
   * 破坏方块
   */
  destroyBlock(): void {
    const direction = this.camera.getDirection();
    const cameraPos = this.camera.getPosition();

    this.raycaster.set(cameraPos, direction);
    this.raycaster.far = 6;

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      if (intersect.object instanceof THREE.InstancedMesh) {
        const matrix = new THREE.Matrix4();
        const instanceId = intersect.instanceId !== undefined ? intersect.instanceId : 0;
        intersect.object.getMatrixAt(instanceId, matrix);
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(matrix);

        const [x, y, z] = [Math.floor(position.x), Math.floor(position.y), Math.floor(position.z)];
        this.world.setBlock(x, y, z, BlockType.AIR);

        // 创建粒子效果
        this.createDestroyParticles(position);
        break;
      }
    }
  }

  /**
   * 放置方块
   */
  placeBlock(): void {
    const direction = this.camera.getDirection();
    const cameraPos = this.camera.getPosition();

    this.raycaster.set(cameraPos, direction);
    this.raycaster.far = 6;

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      if (intersect.object instanceof THREE.InstancedMesh) {
        const matrix = new THREE.Matrix4();
        const instanceId = intersect.instanceId !== undefined ? intersect.instanceId : 0;
        intersect.object.getMatrixAt(instanceId, matrix);
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(matrix);

        const normal = intersect.face?.normal || new THREE.Vector3(0, 1, 0);
        const [x, y, z] = [
          Math.floor(position.x + normal.x * 0.5),
          Math.floor(position.y + normal.y * 0.5),
          Math.floor(position.z + normal.z * 0.5)
        ];

        // 检查是否在玩家位置
        const playerPos = this.player.getPosition();
        const dx = Math.abs(x + 0.5 - playerPos.x);
        const dy = Math.abs(y + 0.5 - playerPos.y);
        const dz = Math.abs(z + 0.5 - playerPos.z);

        if (dx < 0.8 && dz < 0.8 && dy < 1.8) {
          return; // 不能放在玩家身上
        }

        this.world.setBlock(x, y, z, BlockType.STONE);
        break;
      }
    }
  }

  /**
   * 创建破坏粒子
   */
  private createDestroyParticles(position: THREE.Vector3): void {
    // 简单粒子效果
    const particleCount = 5;
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({ color: 0x808080 });

    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.position.x += (Math.random() - 0.5) * 0.5;
      particle.position.y += (Math.random() - 0.5) * 0.5;
      particle.position.z += (Math.random() - 0.5) * 0.5;

      this.scene.add(particle);

      // 动画
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 3,
        (Math.random() - 0.5) * 3
      );

      const animate = () => {
        particle.position.add(velocity.clone().multiplyScalar(0.016));
        velocity.y -= 9.8 * 0.016;
        particle.rotation.x += 0.1;
        particle.rotation.y += 0.1;

        if (particle.position.y < 0) {
          this.scene.remove(particle);
          geometry.dispose();
          material.dispose();
        } else {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }
  }

  /**
   * 更新子弹
   */
  update(delta: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(delta);

      if (!bullet.active) {
        bullet.dispose(this.scene);
        this.bullets.splice(i, 1);
      }
    }
  }

  /**
   * 获取当前武器
   */
  getCurrentWeapon(): string {
    return this.currentWeapon;
  }

  /**
   * 切换武器
   */
  setWeapon(weapon: string): void {
    if (this.weapons[weapon]) {
      this.currentWeapon = weapon;
      const w = this.weapons[weapon];
      this.shootCooldown = w.fireRate;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    for (const bullet of this.bullets) {
      bullet.dispose(this.scene);
    }
    this.bullets = [];

    if (this.gunModel) {
      this.gunModel.geometry.dispose();
      this.gunModel.material.dispose();
    }
  }
}