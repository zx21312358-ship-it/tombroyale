# 更新日志

## [2026-03-22] - WSAD 移动和准星问题修复

### 修复内容

#### 1. WSAD 按键无法控制移动

**问题描述**:
- 按 WSAD 键时，控制台显示状态已正确设置（如 `moveForward = true`）
- 但玩家角色完全不移动

**根本原因**:
1. **键位检测方式错误**: 原代码使用 `event.key` 判断按键，会受输入法和系统语言影响
   - `event.key` 返回按键产生的字符，在中文输入法下可能不是预期的值
   - 例如：按 `W` 可能触发其他字符

2. **移动方向计算错误**:
   - 原代码使用 `this.camera.camera.quaternion` 计算方向
   - 但 `PointerLockControls` 中，方向存储在 `controls.object` 上，而不是 `camera` 上
   - 导致计算出的移动向量始终是零向量 `{x: 0, y: 0, z: 0}`

**修复方案**:
```typescript
// 修复前（错误）
const forward = new THREE.Vector3();
forward.set(0, 0, -1);
forward.applyQuaternion(this.camera.camera.quaternion); // 错误的相机对象
if (this.moveForward) moveVec.add(forward);

// 修复后（正确）- 参考 d:\game01\tombroyale 的实现
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
```

**修改文件**:
- `src/core/Player.ts` - 键盘事件处理和移动逻辑
- `src/core/Camera.ts` - PointerLockControls 绑定元素

---

#### 2. 双重准星问题

**问题描述**:
- 屏幕中心显示两个准星重叠（一个白色十字 + 一个绿色十字带中心圆点）

**根本原因**:
- 准星被创建了两次：
  1. `index.html` 中定义了静态的 `#crosshair` 元素（白色十字）
  2. `HUD.ts` 中 `createCrosshair()` 方法又动态创建了一个准星（绿色十字 + 中心圆点）

**修复方案**:
- 删除 `HUD.ts` 中重复创建准星的代码
- 直接使用 HTML 中已存在的 `#crosshair` 元素

**修改文件**:
- `src/ui/HUD.ts` - 简化 `createCrosshair()` 方法

---

#### 3. 移动速度调整

**问题描述**:
- 玩家移动速度过快，影响游戏体验

**修复方案**:
- 将 `speed` 从 `10` 改为 `9`（降低 10%）

**修改文件**:
- `src/core/Player.ts:25`

---

### 技术细节

#### event.key vs event.code

| 属性 | 说明 | 示例 | 适用场景 |
|------|------|------|----------|
| `event.key` | 按键产生的字符 | 'w', 'W', 'あ' | 文本输入 |
| `event.code` | 物理按键编码 | 'KeyW', 'KeyA' | 游戏控制 |

游戏控制应始终使用 `event.code`，因为它基于物理按键位置，不受输入法影响。

#### PointerLockControls 架构

```
PointerLockControls
├── object (Object3D)     <- 存储位置和 Y 轴旋转（左右看）
└── camera (Camera)       <- 存储 X 轴旋转（上下看，相对于 object）
```

移动时应使用内置方法：
- `controls.moveForward(distance)` - 前后移动
- `controls.moveRight(distance)` - 左右移动

这些方法会正确处理相机方向，无需手动计算。

---

### 提交信息

```
commit: Initial commit: TombRoyale 摸金战场

修复 WSAD 移动和双重准星问题

- 使用 event.code 替代 event.key 判断按键，避免输入法影响
- 使用 PointerLockControls 的 moveForward/moveRight 方法处理移动
- 移除 HUD 中重复创建的准星
- 降低移动速度 10% (10 -> 9)

修改文件:
- src/core/Player.ts - 键盘事件和移动逻辑
- src/core/Camera.ts - PointerLockControls 绑定元素
- src/ui/HUD.ts - 简化准星创建
- index.html - 准星样式优化
```

---

### 参考项目

本次修复参考了 `D:\game01\tombroyale` 项目的实现方式。
