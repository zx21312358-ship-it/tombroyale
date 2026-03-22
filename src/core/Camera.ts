import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * 相机管理类
 * 处理第一人称相机和指针锁定控制
 *
 * 使用 PointerLockControls 直接控制相机
 */
export class CameraManager {
  public camera: THREE.PerspectiveCamera;
  public controls: PointerLockControls;
  public object: THREE.Object3D;
  public domElement: HTMLElement;

  constructor() {
    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    // 使用 canvas-container 或 canvas 元素作为 PointerLockControls 的 domElement
    // 这样在指针锁定时，键盘事件会正确绑定到游戏容器
    this.domElement = document.getElementById('canvas-container') ||
                      document.querySelector('canvas') ||
                      document.body;

    // 创建控制对象 - PointerLockControls 会创建内部对象来控制相机
    this.controls = new PointerLockControls(this.camera, this.domElement);

    // 获取控制对象并保存引用（使用新的 API）
    this.object = this.controls.object;
    // 初始位置设为 (0, 50, 0)，确保在游戏开始前能看到地面
    this.object.position.set(0, 50, 0);

    // 设置相机向下看，以便能看到地面
    // 在 Three.js 中，正的 rotation.x 是向下看
    this.camera.rotation.set(Math.PI / 6, 0, 0, 'YXZ');

    console.log('[Camera] Initialized with domElement:', this.domElement);
  }

  /**
   * 将相机控制对象添加到场景
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.object);
  }

  /**
   * 获取相机控制对象
   */
  getObject(): THREE.Object3D {
    return this.object;
  }

  /**
   * 获取相机方向
   */
  getDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }

  /**
   * 设置相机位置
   */
  setPosition(x: number, y: number, z: number): void {
    this.object.position.set(x, y, z);
  }

  /**
   * 获取相机位置
   */
  getPosition(): THREE.Vector3 {
    return this.object.position.clone();
  }

  /**
   * 设置相机旋转
   * @param yaw Y 轴旋转（左右看）
   * @param pitch X 轴旋转（上下看），负值向下看，正值向上看
   */
  setRotation(yaw: number, pitch: number): void {
    // PointerLockControls 使用 object 作为父对象
    // object 只控制 Y 轴旋转（左右看）
    // camera 的 X 轴旋转控制上下看（相对于 object 的本地旋转）
    
    // 只设置 object 的 Y 轴旋转
    this.object.rotation.set(0, yaw, 0);
    
    // 只设置 camera 的 X 轴旋转（相对于 object 的本地旋转）
    // 使用 order 'YXZ' 确保旋转顺序正确
    this.camera.rotation.set(pitch, 0, 0, 'YXZ');
    
    // 强制更新矩阵
    this.camera.updateMatrixWorld(true);
    this.object.updateMatrixWorld(true);
  }

  /**
   * 锁定指针
   */
  lock(): void {
    this.controls.lock();
  }

  /**
   * 解锁指针
   */
  unlock(): void {
    this.controls.unlock();
  }

  /**
   * 检查是否锁定
   */
  isLocked(): boolean {
    return this.controls.isLocked;
  }

  /**
   * 更新相机
   */
  update(delta: number): void {
    // PointerLockControls 会自动处理更新
  }

  /**
   * 处理窗口大小变化
   */
  onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
