import * as THREE from 'three';
import { Player } from '../core/Player';
import { BlockType } from '../utils/BlockUtils';

/**
 * 物品类型
 */
export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HEALTH = 'health',
  SKILL = 'skill',
  TREASURE = 'treasure'
}

/**
 * 物品定义
 */
export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  value: number;
  description: string;
  // 武器属性
  damage?: number;
  fireRate?: number;
  // 护甲属性
  armor?: number;
  // 治疗属性
  healAmount?: number;
  // 技能属性
  skillEffect?: string;
}

/**
 * 物品定义表
 */
export const ITEMS: Record<string, Item> = {
  // 武器
  'pistol': {
    id: 'pistol',
    name: '手枪',
    type: ItemType.WEAPON,
    rarity: 'common',
    value: 100,
    description: '基础手枪，适合近战',
    damage: 25,
    fireRate: 0.15
  },
  'rifle': {
    id: 'rifle',
    name: '步枪',
    type: ItemType.WEAPON,
    rarity: 'rare',
    value: 300,
    description: '全自动步枪，中等伤害',
    damage: 20,
    fireRate: 0.1
  },
  'shotgun': {
    id: 'shotgun',
    name: ' shotgun',
    type: ItemType.WEAPON,
    rarity: 'rare',
    value: 400,
    description: '霰弹枪，近距离高伤害',
    damage: 15,
    fireRate: 0.5
  },
  'sniper': {
    id: 'sniper',
    name: '狙击枪',
    type: ItemType.WEAPON,
    rarity: 'epic',
    value: 600,
    description: '狙击步枪，超远距离一击必杀',
    damage: 80,
    fireRate: 1.0
  },
  'bronze_sword': {
    id: 'bronze_sword',
    name: '青铜剑',
    type: ItemType.WEAPON,
    rarity: 'rare',
    value: 350,
    description: '古墓中的青铜剑，锋利无比',
    damage: 35,
    fireRate: 0.3
  },
  'jade_dagger': {
    id: 'jade_dagger',
    name: '玉匕首',
    type: ItemType.WEAPON,
    rarity: 'epic',
    value: 500,
    description: '古玉制成的匕首，带有神秘力量',
    damage: 45,
    fireRate: 0.2
  },
  // 护甲
  'cloth_armor': {
    id: 'cloth_armor',
    name: '布衣',
    type: ItemType.ARMOR,
    rarity: 'common',
    value: 50,
    description: '简单的布衣，提供少量保护',
    armor: 10
  },
  'leather_armor': {
    id: 'leather_armor',
    name: '皮甲',
    type: ItemType.ARMOR,
    rarity: 'rare',
    value: 200,
    description: '鞣制皮甲，提供中等保护',
    armor: 25
  },
  'bronze_armor': {
    id: 'bronze_armor',
    name: '青铜甲',
    type: ItemType.ARMOR,
    rarity: 'epic',
    value: 450,
    description: '青铜打造的盔甲，防御力极高',
    armor: 40
  },
  'jade_armor': {
    id: 'jade_armor',
    name: '玉甲',
    type: ItemType.ARMOR,
    rarity: 'legendary',
    value: 800,
    description: '传说中的玉甲，刀枪不入',
    armor: 60
  },
  // 治疗物品
  'bandage': {
    id: 'bandage',
    name: '绷带',
    type: ItemType.HEALTH,
    rarity: 'common',
    value: 20,
    description: '简单的绷带，治疗少量生命值',
    healAmount: 15
  },
  'medkit': {
    id: 'medkit',
    name: '医疗包',
    type: ItemType.HEALTH,
    rarity: 'rare',
    value: 100,
    description: '标准医疗包，治疗中量生命值',
    healAmount: 50
  },
  'elixir': {
    id: 'elixir',
    name: '还魂丹',
    type: ItemType.HEALTH,
    rarity: 'epic',
    value: 300,
    description: '古墓中的仙丹，完全恢复生命值',
    healAmount: 100
  },
  // 技能
  'speed_boost': {
    id: 'speed_boost',
    name: '疾行符',
    type: ItemType.SKILL,
    rarity: 'rare',
    value: 150,
    description: '使用后短时间内提升移动速度',
    skillEffect: 'speed'
  },
  'invisibility': {
    id: 'invisibility',
    name: '隐身符',
    type: ItemType.SKILL,
    rarity: 'epic',
    value: 400,
    description: '使用后短时间内隐身',
    skillEffect: 'invisibility'
  },
  // 宝物
  'gold_coin': {
    id: 'gold_coin',
    name: '金币',
    type: ItemType.TREASURE,
    rarity: 'common',
    value: 50,
    description: '古代金币，可以兑换物品'
  },
  'jade_piece': {
    id: 'jade_piece',
    name: '玉佩',
    type: ItemType.TREASURE,
    rarity: 'rare',
    value: 200,
    description: '精美的玉佩，价值不菲'
  },
  'bronze_vessel': {
    id: 'bronze_vessel',
    name: '青铜鼎',
    type: ItemType.TREASURE,
    rarity: 'epic',
    value: 500,
    description: '古代青铜器，珍贵文物'
  },
  'dragon_treasure': {
    id: 'dragon_treasure',
    name: '龙珠',
    type: ItemType.TREASURE,
    rarity: 'legendary',
    value: 1000,
    description: '传说中的龙珠，蕴含神秘力量'
  }
};

/**
 * 宝箱类
 */
export class LootBox {
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public opened: boolean = false;
  public loot: Item[] = [];
  public type: 'bronze' | 'gold' | 'jade' = 'bronze';

  constructor(x: number, y: number, z: number, type: 'bronze' | 'gold' | 'jade' = 'bronze') {
    this.position = new THREE.Vector3(x, y, z);
    this.type = type;
    this.mesh = this.createMesh(x, y, z);
    this.loot = this.generateLoot(type);
  }

  /**
   * 创建宝箱模型
   */
  private createMesh(x: number, y: number, z: number): THREE.Group {
    const group = new THREE.Group();

    // 宝箱主体
    const colors: Record<string, number> = {
      bronze: 0xcd7f32,
      gold: 0xffd700,
      jade: 0x00ff7f
    };

    const color = colors[this.type];
    const boxGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.5);
    const boxMaterial = new THREE.MeshLambertMaterial({ color });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 0.3, 0);
    group.add(box);

    // 宝箱盖
    const lidGeometry = new THREE.BoxGeometry(0.85, 0.15, 0.55);
    const lid = new THREE.Mesh(lidGeometry, boxMaterial);
    lid.position.set(0, 0.65, 0);
    group.add(lid);

    // 发光效果
    const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const lightMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(0, 0.8, 0);
    group.add(light);

    // 点光源
    const pointLight = new THREE.PointLight(color, 1, 5);
    pointLight.position.set(0, 1, 0);
    group.add(pointLight);

    group.position.set(x + 0.5, y, z + 0.5);
    group.userData = { type: 'lootbox', lootbox: this };

    return group;
  }

  /**
   * 生成战利品
   */
  private generateLoot(type: string): Item[] {
    const lootCount = Math.floor(Math.random() * 2) + 1;
    const items: Item[] = [];

    const rarityPool: Record<string, string[]> = {
      bronze: ['pistol', 'cloth_armor', 'bandage', 'gold_coin'],
      gold: ['rifle', 'shotgun', 'leather_armor', 'medkit', 'jade_piece', 'speed_boost'],
      jade: ['sniper', 'bronze_sword', 'jade_dagger', 'bronze_armor', 'elixir', 'invisibility', 'bronze_vessel']
    };

    const pool = rarityPool[type] || rarityPool.bronze;

    for (let i = 0; i < lootCount; i++) {
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      if (ITEMS[itemId]) {
        items.push(ITEMS[itemId]);
      }
    }

    // 小概率获得传奇物品
    if (Math.random() < 0.05) {
      items.push(ITEMS['dragon_treasure']);
    }

    return items;
  }

  /**
   * 打开宝箱
   */
  open(): Item[] {
    if (this.opened) return [];
    this.opened = true;

    // 打开动画
    const lid = this.mesh.children[1];
    if (lid) {
      lid.rotation.x = -Math.PI / 4;
    }

    // 减少发光
    const light = this.mesh.children[2];
    if (light) {
      (light.material as THREE.Material).opacity = 0.2;
    }

    return this.loot;
  }

  /**
   * 更新宝箱（动画）
   */
  update(delta: number): void {
    // 浮动动画
    if (!this.opened) {
      this.mesh.position.y = this.position.y + Math.sin(performance.now() / 500) * 0.1;
      this.mesh.rotation.y += delta * 0.5;
    }
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
 * 物品栏类
 */
export class Inventory {
  private slots: (Item | null)[];
  private selectedSlot: number = 0;
  private capacity: number = 9;

  // 装备
  private equippedWeapon: Item | null = null;
  private equippedArmor: Item | null = null;

  constructor() {
    this.slots = new Array(this.capacity).fill(null);
  }

  /**
   * 添加物品
   */
  addItem(item: Item): boolean {
    // 先尝试堆叠
    if (item.type === ItemType.HEALTH || item.type === ItemType.TREASURE) {
      // 可堆叠物品逻辑（简化版）
    }

    // 找空位
    for (let i = 0; i < this.capacity; i++) {
      if (this.slots[i] === null) {
        this.slots[i] = item;
        return true;
      }
    }

    return false; // 背包已满
  }

  /**
   * 移除物品
   */
  removeItem(slot: number): Item | null {
    if (slot >= 0 && slot < this.capacity) {
      const item = this.slots[slot];
      this.slots[slot] = null;
      return item;
    }
    return null;
  }

  /**
   * 获取物品
   */
  getItem(slot: number): Item | null {
    if (slot >= 0 && slot < this.capacity) {
      return this.slots[slot];
    }
    return null;
  }

  /**
   * 选择物品槽
   */
  selectSlot(slot: number): void {
    if (slot >= 0 && slot < this.capacity) {
      this.selectedSlot = slot;
    }
  }

  /**
   * 获取选中槽
   */
  getSelectedSlot(): number {
    return this.selectedSlot;
  }

  /**
   * 装备物品
   */
  equipItem(slot: number): boolean {
    const item = this.getItem(slot);
    if (!item) return false;

    if (item.type === ItemType.WEAPON) {
      this.equippedWeapon = item;
      return true;
    } else if (item.type === ItemType.ARMOR) {
      this.equippedArmor = item;
      return true;
    }

    return false;
  }

  /**
   * 使用物品
   */
  useItem(slot: number, player: Player): boolean {
    const item = this.getItem(slot);
    if (!item) return false;

    if (item.type === ItemType.HEALTH) {
      player.heal(item.healAmount || 0);
      this.removeItem(slot);
      return true;
    } else if (item.type === ItemType.WEAPON) {
      return this.equipItem(slot);
    } else if (item.type === ItemType.ARMOR) {
      return this.equipItem(slot);
    }

    return false;
  }

  /**
   * 获取装备的武器
   */
  getEquippedWeapon(): Item | null {
    return this.equippedWeapon;
  }

  /**
   * 获取装备的护甲
   */
  getEquippedArmor(): Item | null {
    return this.equippedArmor;
  }

  /**
   * 获取所有物品
   */
  getAllItems(): (Item | null)[] {
    return [...this.slots];
  }

  /**
   * 清空背包
   */
  clear(): void {
    this.slots.fill(null);
    this.equippedWeapon = null;
    this.equippedArmor = null;
  }
}

/**
 * 战利品系统管理类
 */
export class LootSystem {
  private scene: THREE.Scene;
  private player: Player;
  private lootBoxes: LootBox[] = [];
  private inventory: Inventory;

  constructor(scene: THREE.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.inventory = new Inventory();

    this.setupControls();
  }

  /**
   * 设置控制
   */
  private setupControls(): void {
    const onKeyDown = (event: KeyboardEvent) => {
      // 数字键选择物品槽
      if (event.code >= 'Digit1' && event.code <= 'Digit9') {
        const slot = parseInt(event.code.replace('Digit', '')) - 1;
        this.inventory.selectSlot(slot);
      }
      // E 键打开宝箱
      if (event.code === 'KeyE') {
        this.tryOpenLootBox();
      }
      // F 键使用物品
      if (event.code === 'KeyF') {
        this.useSelectedItem();
      }
    };

    document.addEventListener('keydown', onKeyDown);
  }

  /**
   * 生成宝箱
   */
  spawnLootBox(x: number, y: number, z: number, type?: 'bronze' | 'gold' | 'jade'): void {
    const boxType = type || this.getRandomType();
    const lootBox = new LootBox(x, y, z, boxType);
    this.scene.add(lootBox.mesh);
    this.lootBoxes.push(lootBox);
  }

  /**
   * 随机类型
   */
  private getRandomType(): 'bronze' | 'gold' | 'jade' {
    const rand = Math.random();
    if (rand < 0.6) return 'bronze';
    if (rand < 0.9) return 'gold';
    return 'jade';
  }

  /**
   * 尝试打开宝箱
   */
  private tryOpenLootBox(): void {
    const playerPos = this.player.getPosition();

    for (const box of this.lootBoxes) {
      if (box.opened) continue;

      const distance = box.position.distanceTo(playerPos);
      if (distance < 2) {
        const loot = box.open();
        this.collectLoot(loot);
        break;
      }
    }
  }

  /**
   * 收集战利品
   */
  private collectLoot(items: Item[]): void {
    for (const item of items) {
      if (!this.inventory.addItem(item)) {
        // 背包已满，显示提示
        console.log('背包已满！');
      }
    }
  }

  /**
   * 使用选中的物品
   */
  private useSelectedItem(): void {
    const slot = this.inventory.getSelectedSlot();
    this.inventory.useItem(slot, this.player);
  }

  /**
   * 更新战利品系统
   */
  update(delta: number): void {
    for (const box of this.lootBoxes) {
      box.update(delta);
    }
  }

  /**
   * 获取物品栏
   */
  getInventory(): Inventory {
    return this.inventory;
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