// js/threeSceneManager.js

// Import Three.js core library from the installed 'three' package
// Vite will find this in node_modules
import * as THREE from "three";

export class ThreeSceneManager {
  constructor() {
    console.log("ThreeSceneManager constructor called");
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
    this.photoObjects = new Map(); // Map to hold photo meshes: photoId -> mesh
    this.loadingManager = new THREE.LoadingManager(); // Manager for textures
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
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
    // >> TEMPORARY VISIBILITY SETTING: Start well outside the sphere radius (10)
    this.camera.position.z = 25; // TEMPORARILY Start well outside the sphere for visibility

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio); // Improve rendering quality on high-res displays
    this.container.appendChild(this.renderer.domElement);

    // Basic Lighting (Optional but recommended)
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

    // Add event listener for raycasting on click
    this.renderer.domElement.addEventListener(
      "click",
      this.onCanvasClick.bind(this),
      false,
    );

    // Handle window resizing
    window.addEventListener("resize", this.onWindowResize.bind(this));

    console.log("ThreeSceneManager initialized.");
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
  // Accepts photoMetadata object which contains src and other info
  addPhoto(photoMetadata, position, rotation = new THREE.Euler(0, 0, 0)) {
    const photoId = photoMetadata.name; // Use photo name as unique ID

    if (this.photoObjects.has(photoId)) {
      console.warn(`Photo object for ID ${photoId} already exists in scene.`);
      return;
    }
    if (!photoMetadata.src) {
      console.error(`Cannot add photo ${photoId}: Missing image source URL.`);
      return;
    }

    // Create a placeholder material while texture loads
    const material = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.DoubleSide,
    }); // Dark grey placeholder
    // >> TEMPORARILY larger size for visibility
    // Use a significantly larger size initially. The aspect ratio will be corrected later.
    const geometry = new THREE.PlaneGeometry(10, 10); // TEMPORARILY larger size for visibility

    const photoMesh = new THREE.Mesh(geometry, material);
    photoMesh.position.copy(position);
    photoMesh.rotation.copy(rotation);

    // Store the original photo data or ID on the mesh for raycasting and preview
    photoMesh.userData = { photoId: photoId, photoMetadata: photoMetadata };

    this.scene.add(photoMesh);
    this.photoObjects.set(photoId, photoMesh);

    // Asynchronously load the texture
    this.textureLoader.load(
      photoMetadata.src,
      // onLoad callback
      (texture) => {
        if (photoMesh.material) {
          // Check if mesh/material still exist (wasn't removed while loading)
          // Dispose of the placeholder material
          photoMesh.material.dispose();

          // Update geometry aspect ratio if dimensions are known
          let width = photoMetadata.imageWidth || texture.image.width;
          let height = photoMetadata.imageHeight || texture.image.height;

          if (width && height && width > 0 && height > 0) {
            const aspectRatio = width / height;
            // Scale the plane geometry to match the image aspect ratio while maintaining overall scale
            // Revert back to a more reasonable base size after testing
            photoMesh.geometry.dispose(); // Dispose old geometry
            photoMesh.geometry = new THREE.PlaneGeometry(aspectRatio * 5, 5); // Revert back to a more reasonable base size
          } else {
            // If dimensions are unknown or invalid, use a default plane size that's visible
            photoMesh.geometry.dispose(); // Dispose old geometry
            photoMesh.geometry = new THREE.PlaneGeometry(5, 5); // Use a default visible size
          }

          photoMesh.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
          });
          photoMesh.material.needsUpdate = true; // Ensure material updates
          console.log(`Loaded texture for photo ${photoId}`);
          // TODO: Apply orientation if needed using photoMetadata.orientation (requires geometry or material transform)
        } else {
          // Mesh was removed while texture was loading
          texture.dispose();
          console.log(`Texture loaded for ${photoId} but mesh was removed.`);
        }
      },
      // onProgress callback (optional)
      undefined,
      // onError callback
      (err) => {
        console.error(`Error loading texture for photo ${photoId}:`, err);
        if (photoMesh.material) {
          photoMesh.material.color.set(0xff0000); // Indicate error with red color
          photoMesh.material.needsUpdate = true;
        }
      },
    );

    // console.log(`Added photo placeholder ${photoId} at position`, position); // Debug log (less verbose)
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
        // Dispose texture if it was loaded
        if (photoMesh.material.map) photoMesh.material.map.dispose();
        photoMesh.material.dispose();
      }

      // Revoke the object URL created for the image data
      if (
        photoMesh.userData &&
        photoMesh.userData.photoMetadata &&
        photoMesh.userData.photoMetadata.revokeObjectURL
      ) {
        photoMesh.userData.photoMetadata.revokeObjectURL();
      }

      this.scene.remove(photoMesh);
      this.photoObjects.delete(photoId);
      console.log(`Removed photo ${photoId} from scene.`); // Debug log
    } else {
      console.warn(
        `Attempted to remove photo ${photoId} but it was not found in the scene.`,
      );
    }
  }

  // Clear all photo objects from the scene
  clearPhotos() {
    // Create a list of photo IDs to remove to avoid modifying the map while iterating
    const photoIdsToRemove = Array.from(this.photoObjects.keys());

    photoIdsToRemove.forEach((photoId) => {
      this.removePhoto(photoId); // Use the existing removePhoto method to handle disposal
    });

    // photoObjects map is already cleared by removePhoto calls
    console.log("Cleared all photo objects from the scene.");
  }

  onCanvasClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Find objects intersected by the raycaster
    const intersects = raycaster.intersectObjects(
      Array.from(this.photoObjects.values()),
    );

    if (intersects.length > 0) {
      // The first intersected object is the closest one
      const intersectedObject = intersects[0].object;

      // Check if the intersected object has photo data
      if (
        intersectedObject.userData &&
        intersectedObject.userData.photoMetadata
      ) {
        const photoMetadata = intersectedObject.userData.photoMetadata;
        console.log("Clicked on photo:", photoMetadata.name);

        // Trigger an event or call a callback to show the preview
        // For now, let's dispatch a custom event that main.js can listen to
        const previewEvent = new CustomEvent("photoClicked", {
          detail: photoMetadata,
        });
        window.dispatchEvent(previewEvent); // Dispatch the event on the window
      }
    }
  }
}
