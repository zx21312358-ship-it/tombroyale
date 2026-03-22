import * as THREE from 'three';
import { Player } from '../core/Player';
import { BattleRoyaleManager } from '../game/BattleRoyale';
import { Inventory } from '../game/LootSystem';

/**
 * HUD 管理类
 * 处理游戏 UI 显示（血条、物品栏、小地图、击杀数等）
 */
export class HUDManager {
  private player: Player;
  private battleRoyale: BattleRoyaleManager;
  private inventory: Inventory | null = null;
  
  // UI 元素
  private healthBar: HTMLElement | null = null;
  private healthText: HTMLElement | null = null;
  private killCountEl: HTMLElement | null = null;
  private aliveCountEl: HTMLElement | null = null;
  private zoneTimerEl: HTMLElement | null = null;
  private weaponEl: HTMLElement | null = null;
  private inventoryEl: HTMLElement | null = null;
  private minimapEl: HTMLElement | null = null;
  private crosshairEl: HTMLElement | null = null;
  private startScreenEl: HTMLElement | null = null;
  private gameOverScreenEl: HTMLElement | null = null;
  private notificationsEl: HTMLElement | null = null;
  private loadingScreenEl: HTMLElement | null = null;

  constructor(player: Player, battleRoyale: BattleRoyaleManager) {
    this.player = player;
    this.battleRoyale = battleRoyale;
    
    this.createHUD();
  }

  /**
   * 创建 HUD
   */
  private createHUD(): void {
    // 创建 HUD 容器
    const hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';
    hudContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      font-family: 'Courier New', monospace;
      color: white;
    `;
    document.body.appendChild(hudContainer);

    // 准星
    this.createCrosshair(hudContainer);

    // 血条
    this.createHealthBar(hudContainer);

    // 击杀数和剩余玩家
    this.createStats(hudContainer);

    // 武器显示
    this.createWeaponDisplay(hudContainer);

    // 物品栏
    this.createInventory(hudContainer);

    // 小地图
    this.createMinimap(hudContainer);

    // 通知区域
    this.createNotifications(hudContainer);
    
    // 获取已有的开始屏幕和游戏结束屏幕
    this.startScreenEl = document.getElementById('loading-screen');
    this.gameOverScreenEl = document.getElementById('game-over-screen');
    
    // 绑定按钮事件
    this.bindButtonEvents();
  }
  
  /**
   * 绑定按钮事件
   */
  private bindButtonEvents(): void {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.startScreenEl) {
          this.startScreenEl.style.display = 'none';
        }
        this.startGame();
      });
    }
    
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.gameOverScreenEl) {
          this.gameOverScreenEl.style.display = 'none';
        }
        this.restartGame();
      });
    }
    
    // 添加点击屏幕重新锁定指针的功能
    document.addEventListener('click', (e) => {
      // 如果游戏已开始但指针未锁定，点击屏幕可以重新锁定
      const target = e.target as HTMLElement;
      if (target.tagName !== 'BUTTON' && target.tagName !== 'A') {
        const gameStarted = document.getElementById('hud-container') !== null;
        if (gameStarted) {
          // 检查是否需要重新锁定
          const controls = (window as any).game?.camera?.controls;
          if (controls && !controls.isLocked) {
            controls.lock();
          }
        }
      }
    });
    
    // 监听 ESC 键解锁后显示提示
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        const controls = (window as any).game?.camera?.controls;
        if (controls && !controls.isLocked) {
          this.showNotification('点击屏幕或按 Enter 键继续游戏', 5000);
        }
      }
    });

    // 监听 Enter 键重新锁定（只处理 Enter 键，不影响其他键）
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const controls = (window as any).game?.camera?.controls;
        if (controls && !controls.isLocked) {
          controls.lock();
          const game = (window as any).game;
          if (game && game.renderer) {
            game.renderer.focus();
          }
        }
      }
    }, { passive: false });
  }

  /**
   * 创建准星
   */
  private createCrosshair(container: HTMLElement): void {
    // 使用 HTML 中已存在的 #crosshair 元素，不再重复创建
    this.crosshairEl = document.getElementById('crosshair');
  }

  /**
   * 创建血条
   */
  private createHealthBar(container: HTMLElement): void {
    const healthContainer = document.createElement('div');
    healthContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      width: 300px;
      height: 30px;
      background-color: rgba(0, 0, 0, 0.5);
      border: 2px solid #333;
      border-radius: 4px;
      overflow: hidden;
    `;
    
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #ff4444, #ff6666);
      transition: width 0.3s;
    `;
    healthContainer.appendChild(healthBar);
    
    const healthText = document.createElement('span');
    healthText.id = 'health-text';
    healthText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 16px;
      font-weight: bold;
      text-shadow: 1px 1px 2px black;
    `;
    healthText.textContent = '100/100';
    healthContainer.appendChild(healthText);
    
    container.appendChild(healthContainer);
    this.healthBar = healthBar;
    this.healthText = healthText;
  }

  /**
   * 创建统计信息
   */
  private createStats(container: HTMLElement): void {
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      text-align: right;
    `;
    
    // 击杀数
    const killCount = document.createElement('div');
    killCount.id = 'kill-count';
    killCount.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #ff4444;
      text-shadow: 2px 2px 4px black;
    `;
    killCount.innerHTML = '💀 0';
    statsContainer.appendChild(killCount);
    
    // 剩余玩家
    const aliveCount = document.createElement('div');
    aliveCount.id = 'alive-count';
    aliveCount.style.cssText = `
      font-size: 18px;
      color: #44ff44;
      text-shadow: 1px 1px 2px black;
      margin-top: 5px;
    `;
    aliveCount.innerHTML = '👥 50';
    statsContainer.appendChild(aliveCount);
    
    // 安全区计时器
    const zoneTimer = document.createElement('div');
    zoneTimer.id = 'zone-timer';
    zoneTimer.style.cssText = `
      font-size: 16px;
      color: #ffff44;
      text-shadow: 1px 1px 2px black;
      margin-top: 10px;
    `;
    zoneTimer.textContent = '⭕ 60s';
    statsContainer.appendChild(zoneTimer);
    
    container.appendChild(statsContainer);
    this.killCountEl = killCount;
    this.aliveCountEl = aliveCount;
    this.zoneTimerEl = zoneTimer;
  }

  /**
   * 创建武器显示
   */
  private createWeaponDisplay(container: HTMLElement): void {
    const weaponDisplay = document.createElement('div');
    weaponDisplay.id = 'weapon-display';
    weaponDisplay.style.cssText = `
      position: absolute;
      bottom: 80px;
      right: 20px;
      text-align: right;
    `;
    
    const weaponName = document.createElement('div');
    weaponName.style.cssText = `
      font-size: 20px;
      font-weight: bold;
      color: #ffd700;
      text-shadow: 2px 2px 4px black;
    `;
    weaponName.textContent = '🔫 手枪';
    weaponDisplay.appendChild(weaponName);
    
    container.appendChild(weaponDisplay);
    this.weaponEl = weaponDisplay;
  }

  /**
   * 创建物品栏
   */
  private createInventory(container: HTMLElement): void {
    const inventoryContainer = document.createElement('div');
    inventoryContainer.id = 'inventory';
    inventoryContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      padding: 8px;
      background-color: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
    `;
    
    // 创建 9 个物品槽
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.style.cssText = `
        width: 50px;
        height: 50px;
        border: 2px solid #666;
        background-color: rgba(50, 50, 50, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        position: relative;
      `;
      
      // 快捷键提示
      const keyHint = document.createElement('span');
      keyHint.style.cssText = `
        position: absolute;
        top: 2px;
        left: 4px;
        font-size: 10px;
        color: #aaa;
      `;
      keyHint.textContent = (i + 1).toString();
      slot.appendChild(keyHint);
      
      inventoryContainer.appendChild(slot);
    }
    
    container.appendChild(inventoryContainer);
    this.inventoryEl = inventoryContainer;
  }

  /**
   * 创建小地图
   */
  private createMinimap(container: HTMLElement): void {
    const minimapContainer = document.createElement('div');
    minimapContainer.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 150px;
      height: 150px;
      background-color: rgba(0, 0, 0, 0.5);
      border: 2px solid #333;
      border-radius: 4px;
      overflow: hidden;
    `;
    
    const minimap = document.createElement('canvas');
    minimap.id = 'minimap';
    minimap.width = 150;
    minimap.height = 150;
    minimap.style.cssText = `
      width: 100%;
      height: 100%;
    `;
    minimapContainer.appendChild(minimap);
    
    container.appendChild(minimapContainer);
    this.minimapEl = minimapContainer;
  }

  /**
   * 创建通知区域
   */
  private createNotifications(container: HTMLElement): void {
    const notifications = document.createElement('div');
    notifications.id = 'notifications';
    notifications.style.cssText = `
      position: absolute;
      top: 200px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      pointer-events: none;
    `;
    container.appendChild(notifications);
    this.notificationsEl = notifications;
  }

  /**
   * 显示通知
   */
  showNotification(message: string, duration: number = 3000): void {
    if (!this.notificationsEl) return;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: rgba(0, 0, 0, 0.7);
      color: #ffd700;
      padding: 10px 20px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 16px;
      animation: fadeInOut ${duration}ms;
    `;
    notification.textContent = message;
    this.notificationsEl.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, duration);
  }

  /**
   * 更新 HUD
   */
  update(): void {
    // 更新血条
    if (this.healthBar && this.healthText) {
      const health = this.player.getHealth();
      const maxHealth = this.player.getMaxHealth();
      const percent = (health / maxHealth) * 100;
      this.healthBar.style.width = `${percent}%`;
      this.healthText.textContent = `${Math.floor(health)}/${maxHealth}`;
      
      // 根据血量改变颜色
      if (percent > 60) {
        this.healthBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
      } else if (percent > 30) {
        this.healthBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc00)';
      } else {
        this.healthBar.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
      }
    }
    
    // 更新击杀数
    if (this.killCountEl) {
      this.killCountEl.innerHTML = `💀 ${this.battleRoyale.getKillCount()}`;
    }
    
    // 更新剩余玩家
    if (this.aliveCountEl) {
      this.aliveCountEl.innerHTML = `👥 ${this.battleRoyale.getAlivePlayers()}`;
    }
  }

  /**
   * 设置物品栏
   */
  setInventory(inventory: Inventory): void {
    this.inventory = inventory;
    this.updateInventoryDisplay();
  }

  /**
   * 更新物品栏显示
   */
  private updateInventoryDisplay(): void {
    if (!this.inventory || !this.inventoryEl) return;
    
    const slots = this.inventoryEl.querySelectorAll('.inventory-slot');
    const items = this.inventory.getAllItems();
    const selectedSlot = this.inventory.getSelectedSlot();
    
    const itemIcons: Record<string, string> = {
      'pistol': '🔫',
      'rifle': '🔫',
      'shotgun': '🔫',
      'sniper': '🎯',
      'bandage': '🩹',
      'medkit': '💊',
      'elixir': '🧪',
      'gold_coin': '🪙',
      'jade_piece': '💎',
      'bronze_vessel': '🏺',
      'dragon_treasure': '🐉'
    };
    
    slots.forEach((slot, index) => {
      const item = items[index];
      // 清除之前的内容（保留 keyHint）
      const keyHint = slot.querySelector('span');
      const slotEl = slot as HTMLElement;
      slotEl.innerHTML = '';
      if (keyHint) slotEl.appendChild(keyHint);
      
      if (item) {
        const icon = itemIcons[item.id] || '📦';
        const iconEl = document.createElement('span');
        iconEl.textContent = icon;
        slotEl.appendChild(iconEl);
        
        // 高亮选中槽
        if (index === selectedSlot) {
          slotEl.style.borderColor = '#ffd700';
          slotEl.style.boxShadow = '0 0 10px #ffd700';
        } else {
          slotEl.style.borderColor = '#666';
          slotEl.style.boxShadow = 'none';
        }
      }
    });
  }

  /**
   * 开始游戏回调
   */
  private startGame(): void {
    // 由 main.ts 处理游戏启动
    const event = new CustomEvent('game-start');
    document.dispatchEvent(event);
  }

  /**
   * 重启游戏回调
   */
  private restartGame(): void {
    const event = new CustomEvent('game-restart');
    document.dispatchEvent(event);
  }

  /**
   * 显示/隐藏 HUD
   */
  setVisible(visible: boolean): void {
    const hudContainer = document.getElementById('hud-container');
    if (hudContainer) {
      hudContainer.style.display = visible ? 'block' : 'none';
    }
  }
  
  /**
   * 显示游戏结束屏幕
   */
  showGameOverScreen(won: boolean, kills: number): void {
    if (!this.gameOverScreenEl) return;
    
    const title = document.getElementById('game-over-title');
    const stats = document.getElementById('game-over-stats');
    
    if (title) {
      title.textContent = won ? '大吉大利，今晚吃鸡!' : '游戏结束';
      title.style.color = won ? '#ffd700' : '#ff4444';
    }
    
    if (stats) {
      stats.innerHTML = `
        <div>击杀数：${kills}</div>
      `;
    }
    
    this.gameOverScreenEl.style.display = 'flex';
  }

  /**
   * 清理资源
   */
  dispose(): void {
    const hudContainer = document.getElementById('hud-container');
    if (hudContainer) {
      hudContainer.remove();
    }
  }
}