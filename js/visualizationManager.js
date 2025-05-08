// js/visualizationManager.js

// Import any necessary THREE modules here if needed, e.g.,
// import * as THREE from './lib/three.module.js';
// import { Vector3 } from './lib/three.module.js';

/**
 * Manages different 3D visualization modes and photo placement.
 * Orchestrates dynamic loading based on camera view.
 */
class VisualizationManager {
  constructor() {
    console.log("VisualizationManager constructor called"); // For debugging
    // You might want properties here to track current mode, displayed photos, etc.
    this.currentMode = "spherical"; // Example: 'spherical', 'cube', 'distributed'
    this.currentlyDisplayedPhotos = new Map(); // Map photo ID to its THREE.Mesh object
    // this.placementLogic = new SphericalPlacementLogic(); // Example: Object to handle position calculations
  }

  /**
   * Calculates the 3D position for a photo based on its metadata and the current visualization mode.
   * This is a placeholder and needs actual implementation based on date, location, etc.
   * @param {object} photoMetadata - The metadata of the photo.
   * @returns {THREE.Vector3} The calculated 3D position.
   */
  getPhotoPosition(photoMetadata) {
    console.log(
      "VisualizationManager: Calculating position for photo:",
      photoMetadata,
    );

    // --- Placeholder Logic ---
    // Replace this with logic based on photoMetadata.date, .location, etc.
    // For now, let's just place them randomly or in a simple grid/sphere for testing.

    // Simple random placement on a sphere for now
    const radius = 10; // Example sphere radius
    const phi = Math.random() * Math.PI; // Latitude
    const theta = Math.random() * Math.PI * 2; // Longitude

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
    // --- End Placeholder Logic ---
  }

  /**
   * Called in the animation loop or when files are loaded.
   * Determines which photos should be visible and instructs the scene manager to update.
   * @param {DataManager} dataManager - The DataManager instance holding photo metadata.
   * @param {ThreeSceneManager} sceneManager - The ThreeSceneManager instance to add/remove objects.
   * @param {THREE.Camera} camera - The current camera.
   */
  updateScene(dataManager, sceneManager, camera) {
    // This method will be called frequently. Implement efficient logic.

    // --- Placeholder Logic ---
    // This is a very basic placeholder.
    // Real implementation should:
    // 1. Get photos from dataManager based on camera frustum/distance.
    // 2. Compare with this.currentlyDisplayedPhotos.
    // 3. Add new visible photos using sceneManager.addPhoto(metadata, position, rotation).
    // 4. Remove no-longer-visible photos using sceneManager.removePhoto(photoId).
    // 5. Update this.currentlyDisplayedPhotos map.

    // For now, let's just add ALL photos from the dataManager if none are displayed.
    // This is NOT performant for large numbers of photos.

    const allPhotos = dataManager.getPhotos();
    const scene = sceneManager.getScene(); // Get the actual THREE.Scene object

    if (this.currentlyDisplayedPhotos.size === 0 && allPhotos.length > 0) {
      console.log(
        `VisualizationManager: Attempting to add ${allPhotos.length} photos to the scene.`,
      );

      // Limit adding a huge number of photos initially for performance testing
      const maxInitialPhotos = 50;
      const photosToAdd = allPhotos.slice(0, maxInitialPhotos);

      photosToAdd.forEach((photoMetadata) => {
        // In a real app, you'd get a texture here, probably asynchronously
        // For the placeholder, let's just add a simple representation
        const geometry = new THREE.PlaneGeometry(1, 1); // Example size
        const material = new THREE.MeshBasicMaterial({
          color: 0xcccccc,
          side: THREE.DoubleSide,
        }); // Placeholder material

        const photoMesh = new THREE.Mesh(geometry, material);

        // Calculate position (using the placeholder logic)
        const position = this.getPhotoPosition(photoMetadata);
        photoMesh.position.copy(position);

        // Basic rotation to face the origin (center of the sphere)
        photoMesh.lookAt(0, 0, 0);

        // You'd need a unique ID for the photo to remove it later
        // For placeholder, use array index as a simple ID
        // In a real app, photoData should have a unique ID (e.g., file path)
        const photoId =
          photoMetadata.src || `photo-${photosToAdd.indexOf(photoMetadata)}`;
        photoMesh.userData.photoId = photoId; // Store ID on the mesh

        scene.add(photoMesh);
        this.currentlyDisplayedPhotos.set(photoId, photoMesh);
        console.log(
          `VisualizationManager: Added placeholder mesh for ${photoId}`,
        );
      });

      // IMPORTANT: In a real implementation, you'd load textures asynchronously
      // and update the material once the texture is loaded.
    }

    // --- End Placeholder Logic ---
  }

  /**
   * Switches the visualization mode. Needs implementation.
   * @param {string} mode - The mode to switch to ('spherical', 'cube', 'distributed').
   */
  switchMode(mode) {
    console.log(`VisualizationManager: Switching mode to ${mode}`);
    this.currentMode = mode;
    // TODO: Implement logic to clear current scene, re-calculate all photo positions based on new mode, and add them back.
  }
}

// This is the critical line that makes VisualizationManager available for import
export { VisualizationManager };
