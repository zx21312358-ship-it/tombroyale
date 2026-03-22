# 摸金战场 TombRoyale

一个 Minecraft 体素像素风格的吃鸡射击游戏（带摸金/盗墓捡宝 + PvP 对抗）

## 🎮 游戏特色

- **体素像素风格**：方块世界，类似 Minecraft 的视觉风格
- **第一人称射击**：使用 PointerLock 控制，支持多种武器
- **古墓主题**：地下陵墓、粽子敌人、青铜器宝箱
- **程序生成地形**：使用 Perlin Noise 生成随机地形和古墓
- **吃鸡模式**：空投、缩圈、安全区、最后存活获胜
- **摸金系统**：探索古墓、打开宝箱、收集宝物和装备

## 🚀 快速开始

### 安装依赖

```bash
cd tombroyale
npm install
```

### 开发模式（快速启动）

```bash
npm run dev
```

然后在浏览器中打开 **http://localhost:5173**（或终端显示的地址）

### 快速启动游戏步骤

1. **启动开发服务器**：运行 `npm run dev`
2. **打开浏览器**：访问 http://localhost:5173
3. **点击"开始游戏"按钮**
4. **点击游戏画面**锁定鼠标指针
5. **开始游戏！**

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

### 一键启动脚本

```bash
# Windows (PowerShell)
cd tombroyale && npm run dev && start http://localhost:5173

# macOS/Linux
cd tombroyale && npm run dev & open http://localhost:5173  # macOS
cd tombroyale && npm run dev & xdg-open http://localhost:5173  # Linux
```

## 🎯 游戏操作

| 按键 | 功能 |
|------|------|
| W/A/S/D | 移动 |
| Shift | 跑步 |
| Space | 跳跃 |
| 鼠标左键 | 射击 |
| 鼠标右键 | 破坏方块 |
| B | 放置方块 |
| E | 打开宝箱 |
| F | 使用物品 |
| 1-4 | 切换武器 |
| ESC | 退出指针锁定 |

## 📁 项目结构

```
tombroyale/
├── public/
│   ├── textures/          # 纹理贴图
│   └── models/            # 3D 模型（可选）
├── src/
│   ├── core/
│   │   ├── World.ts       # Chunk 系统 + 程序生成
│   │   ├── Player.ts      # 玩家移动、跳跃
│   │   ├── Camera.ts      # 相机控制
│   │   └── Renderer.ts    # Three.js 渲染器
│   ├── game/
│   │   ├── Shooting.ts    # 射击系统
│   │   ├── LootSystem.ts  # 宝箱、物品拾取
│   │   ├── Combat.ts      # 战斗系统
│   │   └── BattleRoyale.ts# 吃鸡模式
│   ├── entities/
│   │   └── Enemy.ts       # 粽子 AI
│   ├── ui/
│   │   └── HUD.ts         # 游戏 UI
│   ├── utils/
│   │   ├── noise.ts       # Perlin noise
│   │   └── BlockUtils.ts  # 方块工具
│   └── main.ts            # 入口文件
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## 🎨 物品系统

### 武器
- 🔫 **手枪** (Pistol) - 基础武器，适合近战
- 🔫 **步枪** (Rifle) - 全自动，中等伤害
- 🔫 **霰弹枪** (Shotgun) - 近距离高伤害
- 🎯 **狙击枪** (Sniper) - 超远距离一击必杀
- ⚔️ **青铜剑** - 古墓中的青铜剑，锋利无比
- 🗡️ **玉匕首** - 古玉制成，带有神秘力量

### 护甲
- 🥋 **布衣** - 简单布衣，少量保护
- 🦺 **皮甲** - 鞣制皮甲，中等保护
- 🛡️ **青铜甲** - 青铜打造，高防御
- 💎 **玉甲** - 传说玉甲，刀枪不入

### 治疗物品
- 🩹 **绷带** - 治疗 15 点生命
- 💊 **医疗包** - 治疗 50 点生命
- 🧪 **还魂丹** - 完全恢复生命

### 宝物
- 🪙 **金币** - 古代货币
- 💎 **玉佩** - 精美玉佩
- 🏺 **青铜鼎** - 珍贵文物
- 🐉 **龙珠** - 传说宝物

## 🔧 技术栈

- **框架**: Vite + TypeScript
- **渲染**: Three.js r168+
- **控制**: PointerLockControls
- **物理**: 简单 AABB 碰撞
- **射击**: Raycaster 射线检测
- **地形生成**: Perlin Noise

## 📝 待开发功能

### 短期计划
- [ ] 更多纹理贴图（当前使用程序生成颜色）
- [ ] 更精细的粽子 AI（寻路算法）
- [ ] 小地图渲染
- [ ] 音效系统
- [ ] 更多武器和装备

### 中期计划
- [ ] 多人模式（使用 Colyseus）
- [ ] 更复杂的古墓结构
- [ ] 陷阱和机关
- [ ] 更多敌人类型
- [ ] 成就系统

### 长期计划
- [ ] 自定义房间系统
- [ ] 排行榜
- [ ] 更多游戏模式
- [ ] 创意模式
- [ ] 模组支持

## 🐛 已知问题

1. TypeScript 类型声明警告 - 需要安装 three 类型（`npm install @types/three`）
2. 纹理目前使用程序生成颜色，需要添加真实纹理贴图
3. 性能优化：大地图时可能需要 LOD 系统

## 📄 许可证

MIT License

## 🙏 致谢

- Three.js 团队
- Vite 团队
- Minecraft 启发
- 和平精英/PUBG 启发

---

**享受游戏！祝你好运！** 🎮