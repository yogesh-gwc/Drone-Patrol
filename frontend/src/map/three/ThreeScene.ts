import { AmbientLight, Camera, DirectionalLight, Scene } from 'three'

/**
 * The Three.js scene and its lighting.
 *
 * The camera is a bare `Camera`, not a PerspectiveCamera: its projection
 * matrix is overwritten every frame from MapLibre's camera, so any intrinsic
 * parameters would be ignored. MapLibre owns the geographic camera; this class
 * only holds what it renders.
 *
 * Lighting is restrained on purpose - a neutral fill plus one key light and a
 * weak cool bounce. No coloured rims or bloom.
 */
export class ThreeScene {
  readonly scene: Scene
  readonly camera: Camera

  private readonly lights: (AmbientLight | DirectionalLight)[]

  constructor() {
    this.scene = new Scene()
    this.camera = new Camera()

    const ambient = new AmbientLight(0xc4d0de, 1.1)

    // Scene axes are East-North-Up in metres, so lights are positioned in
    // metres too. High and to the north-west, matching the default bearing.
    const key = new DirectionalLight(0xffffff, 2.2)
    key.position.set(-1500, 2200, 3000)

    const bounce = new DirectionalLight(0x8fa6c4, 0.5)
    bounce.position.set(1800, -1400, 600)

    this.lights = [ambient, key, bounce]
    this.scene.add(ambient, key, bounce)
  }

  /** Releases the lights. Meshes are owned by ThreeObjectManager. */
  dispose(): void {
    for (const light of this.lights) {
      this.scene.remove(light)
      light.dispose()
    }
    this.lights.length = 0
  }
}
