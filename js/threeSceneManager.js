import * as THREE from "./lib/three.module.js";

class ThreeSceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
  }

  init(container) {
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.offsetWidth / container.offsetHeight,
      0.1,
      1000,
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(this.renderer.domElement);

    // Example: Add a basic light
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.camera.position.z = 5; // Move the camera back a bit
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  addPhoto(photoData, position, rotation) {
    // Placeholder: Implement this later
    console.log("Adding photo:", photoData, position, rotation);
  }

  removePhoto(photoId) {
    // Placeholder: Implement this later
    console.log("Removing photo:", photoId);
  }
}

export { ThreeSceneManager };
