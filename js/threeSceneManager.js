// Import Three.js core library using the module path from the CDN
import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r158/build/three.module.js";

export class ThreeSceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
    this.photoObjects = new Map(); // Map to hold photo meshes: file.name -> mesh
  }

  init(containerElement) {
    this.container = containerElement;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111); // Dark background

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5; // Start close to the center

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    // Basic Lighting (Optional but recommended)
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

    // Handle window resizing
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  onWindowResize() {
    if (this.container && this.camera && this.renderer) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  getCamera() {
    return this.camera;
  }

  getScene() {
    return this.scene;
  }

  getRenderer() {
    return this.renderer;
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Add a photo mesh to the scene
  addPhoto(photoId, position, rotation = new THREE.Euler(0, 0, 0)) {
    if (this.photoObjects.has(photoId)) {
      console.warn(`Photo object for ID ${photoId} already exists.`);
      return;
    }

    // Placeholder geometry and material - you'll replace the material with a texture later
    const geometry = new THREE.PlaneGeometry(1, 1); // Placeholder size
    const material = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
    }); // Placeholder material

    const photoMesh = new THREE.Mesh(geometry, material);
    photoMesh.position.set(position.x, position.y, position.z);
    photoMesh.rotation.set(rotation.x, rotation.y, rotation.z);

    // Store the original photo data or ID on the mesh for raycasting
    photoMesh.userData = { photoId: photoId };

    this.scene.add(photoMesh);
    this.photoObjects.set(photoId, photoMesh);

    console.log(`Added photo ${photoId} at position`, position); // Debug log
    // TODO: Implement image texture loading asynchronously
    // Once loaded, update the material: photoMesh.material.map = texture;
  }

  // Get a photo mesh by its ID
  getPhotoMesh(photoId) {
    return this.photoObjects.get(photoId);
  }

  // Remove a photo mesh from the scene and dispose of resources
  removePhoto(photoId) {
    const photoMesh = this.photoObjects.get(photoId);
    if (photoMesh) {
      // Dispose of geometry, material, and texture to free up memory
      if (photoMesh.geometry) photoMesh.geometry.dispose();
      if (photoMesh.material) {
        if (photoMesh.material.map) photoMesh.material.map.dispose();
        photoMesh.material.dispose();
      }
      this.scene.remove(photoMesh);
      this.photoObjects.delete(photoId);
      console.log(`Removed photo ${photoId} from scene.`); // Debug log
    }
  }

  // Clear all photo objects from the scene
  clearPhotos() {
    this.photoObjects.forEach((mesh, photoId) => {
      // Dispose of geometry, material, and texture to free up memory
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
      }
      this.scene.remove(mesh);
    });
    this.photoObjects.clear();
    console.log("Cleared all photo objects from the scene.");
  }
}
