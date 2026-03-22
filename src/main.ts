import * as THREE from 'three';
import { RendererManager } from './core/Renderer';
import { CameraManager } from './core/Camera';
import { World } from './core/World';
import { Player } from './core/Player';
import { ShootingManager } from './game/Shooting';
import { LootSystem } from './game/LootSystem';
import { EnemyManager } from './entities/Enemy';
import { BattleRoyaleManager } from './game/BattleRoyale';
import { HUDManager } from './ui/HUD';

/**
 * TombRoyale - 摸金战场
 * 主入口文件
 */
class Game {
  private renderer: RendererManager;
  private camera: CameraManager;
  private world: World;
  private player: Player;
  private shooting: ShootingManager;
  private lootSystem: LootSystem;
  private enemyManager: EnemyManager;
  private battleRoyale: BattleRoyaleManager;
  private hud: HUDManager;
  
  private clock: THREE.Clock;
  private running: boolean = false;
  private started: boolean = false;

  constructor() {
    // 创建渲染器
    const container = document.getElementById('game-container') || document.body;
    this.renderer = new RendererManager(container);

    // 创建相机
    this.camera = new CameraManager();

    // 将相机控制对象添加到场景
    this.camera.addToScene(this.renderer.scene);

    // 创建世界
    this.world = new World(this.renderer.scene);

    // 创建玩家
    this.player = new Player(this.camera, this.world);
    
    // 创建射击系统
    this.shooting = new ShootingManager(this.camera, this.world, this.player, this.renderer.scene);
    
    // 创建战利品系统
    this.lootSystem = new LootSystem(this.renderer.scene, this.player);
    
    // 创建敌人管理器
    this.enemyManager = new EnemyManager(this.renderer.scene, this.player, this.world);
    
    // 创建吃鸡模式管理器
    this.battleRoyale = new BattleRoyaleManager(
      this.renderer.scene,
      this.player,
      this.world,
      this.enemyManager,
      this.lootSystem
    );
    
    // 创建 HUD
    this.hud = new HUDManager(this.player, this.battleRoyale);
    this.hud.setInventory(this.lootSystem.getInventory());
    
    // 创建时钟
    this.clock = new THREE.Clock();
    
    // 设置事件监听
    this.setupEvents();
    
    // 添加光照
    this.setupLights();
    
    // 初始生成世界
    this.world.generate();
  }

  /**
   * 设置光照
   */
  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.renderer.scene.add(ambientLight);
    
    // 平行光（太阳）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.renderer.scene.add(directionalLight);
  }

  /**
   * 设置事件监听
   */
  private setupEvents(): void {
    // 窗口大小变化
    window.addEventListener('resize', () => this.onResize());

    // 游戏开始事件
    document.addEventListener('game-start', () => {
      this.startGame();
    });

    // 游戏重启事件
    document.addEventListener('game-restart', () => {
      this.restartGame();
    });

    // 指针锁定变化
    this.camera.controls.addEventListener('lock', () => {
      // 指针锁定，游戏进行中
      console.log('[Camera] Pointer locked, focusing canvas');
      this.renderer.focus();
    });

    this.camera.controls.addEventListener('unlock', () => {
      // 指针解锁，显示提示
      console.log('[Camera] Pointer unlocked');
      if (this.started && !this.player.checkDead()) {
        this.hud.showNotification('按 ESC 继续游戏');
      }
    });
  }

  /**
   * 开始游戏
   */
  private startGame(): void {
    this.started = true;
    this.running = true;
    
    // 防按键失灵规则 2 & 5：游戏开始时聚焦到 canvas，确保焦点回到游戏
    this.renderer.focus();
    console.log('Game started, canvas focused');
    
    // 设置玩家初始位置 - 在地表上方
    const spawnY = this.world.getHeightAt(0, 0);
    console.log('Spawn Y:', spawnY);
    this.player.setPosition(0, spawnY + 2, 0);
    
    // 设置相机初始俯仰角（向下看一点）
    // 在 Three.js 中，对于 PointerLockControls：
    // - 正的 camera.rotation.x 是向下看
    // - 负的 camera.rotation.x 是向上看
    const yaw = 0;
    const pitch = -Math.PI / 6; // 约 -30 度，向下看一点以便看到地面
    this.camera.setRotation(yaw, pitch);
    
    // 开始吃鸡模式
    this.battleRoyale.startGame();
    
    // 锁定指针
    this.camera.lock();
    
    // 开始游戏循环
    this.animate();
  }

  /**
   * 重启游戏
   */
  private restartGame(): void {
    // 清理
    this.battleRoyale.reset();
    this.player.reset();
    
    // 重新生成敌人和宝箱
    this.enemyManager.spawnEnemies(15);
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 200 - 100;
      const z = Math.random() * 200 - 100;
      const y = this.world.getHeightAt(x, z);
      this.lootSystem.spawnLootBox(x, y, z);
    }
    
    // 重置玩家位置
    const spawnY = this.world.getHeightAt(0, 0);
    this.player.setPosition(0, spawnY + 5, 0);
    
    // 防按键失灵规则 5：游戏重启时聚焦到 canvas
    this.renderer.focus();
    console.log('Game restarted, canvas focused');
    
    // 开始游戏
    this.battleRoyale.startGame();
    this.camera.lock();
  }

  /**
   * 处理窗口大小变化
   */
  private onResize(): void {
    this.renderer.onResize(window.innerWidth, window.innerHeight);
    this.camera.onResize(window.innerWidth, window.innerHeight);
  }

  /**
   * 游戏主循环
   */
  private animate(): void {
    if (!this.running) return;

    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // 更新玩家
    this.player.update(delta);
    
    // 更新世界（Chunk）
    const playerPos = this.player.getPosition();
    this.world.updateChunks(playerPos.x, playerPos.z);
    
    // 更新射击系统
    this.shooting.update(delta);
    
    // 更新战利品系统
    this.lootSystem.update(delta);
    
    // 更新吃鸡模式
    this.battleRoyale.update(delta);
    
    // 更新 HUD
    this.hud.update();
    
    // 渲染
    this.renderer.render(this.renderer.scene, this.camera.camera);
  }

  /**
   * 停止游戏
   */
  stop(): void {
    this.running = false;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stop();
    
    this.world.dispose();
    this.shooting.dispose();
    this.lootSystem.dispose();
    this.enemyManager.dispose();
    this.battleRoyale.dispose();
    this.hud.dispose();
    this.renderer.dispose();
  }
}

// 启动游戏
declare global {
  interface Window {
    game: Game | null;
  }
}

window.game = null;

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', () => {
  // 更新加载进度条
  const loadingProgress = document.getElementById('loading-progress');
  const loadingText = document.getElementById('loading-text');

  // 模拟加载进度（实际游戏初始化是即时的）
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 10;
    if (loadingProgress) loadingProgress.style.width = `${progress}%`;
    if (loadingText) loadingText.textContent = `正在加载资源... ${progress}%`;

    if (progress >= 100) {
      clearInterval(progressInterval);
      if (loadingText) loadingText.textContent = '加载完成！点击"开始游戏"';
    }
  }, 100);

  // 立即创建游戏实例
  window.game = new Game();
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  if (window.game) {
    window.game.dispose();
  }
});
