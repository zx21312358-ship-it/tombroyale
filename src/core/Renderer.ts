import * as THREE from 'three';

/**
 * 渲染器管理类
 * 处理 Three.js 渲染器设置和更新
 */
export class RendererManager {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  private renderPixelated: boolean = true;

  constructor(container: HTMLElement) {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // 天空蓝
    // 增加雾效距离以便看到更远
    this.scene.fog = new THREE.Fog(0x87ceeb, 100, 300);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 像素化渲染（体素风格）
    if (this.renderPixelated) {
      this.renderer.setPixelRatio(0.5);
    }

    // 将 canvas 添加到 canvas-container
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(this.renderer.domElement);
    } else {
      container.appendChild(this.renderer.domElement);
    }

    // 设置 canvas 可聚焦（防按键失灵规则 1）
    this.renderer.domElement.setAttribute('tabindex', '0');
    this.renderer.domElement.style.outline = 'none'; // 移除聚焦边框
  }

  /**
   * 渲染场景
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /**
   * 处理窗口大小变化
   */
  onResize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  /**
   * 设置场景背景
   */
  setBackground(color: number): void {
    this.scene.background = new THREE.Color(color);
  }

  /**
   * 设置雾效
   */
  setFog(color: number, near: number, far: number): void {
    this.scene.fog = new THREE.Fog(color, near, far);
  }

  /**
   * 添加对象到场景
   */
  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * 从场景移除对象
   */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /**
   * 获取 canvas 元素
   */
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * 聚焦到 canvas（防按键失灵规则 2）
   */
  focus(): void {
    this.renderer.domElement.focus();
  }
}
