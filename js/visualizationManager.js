// js/visualizationManager.js

// Import Three.js core library using the module path from the CDN (Using unpkg)
import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";

// Assuming DataManager and ThreeSceneManager are imported elsewhere (via main.js passing instances)
// import { DataManager } from './dataManager.js'; // Example import
// import { ThreeSceneManager } from './threeSceneManager.js'; // Example import

export class VisualizationManager {
  constructor() {
    console.log("VisualizationManager constructor called");
    this.activePhotos = new Set(); // Track photo IDs currently added to the scene
    this.lastCameraPosition = new THREE.Vector3(); // Store camera position for change detection
    this.updateThreshold = 0.1; // Distance the camera must move to trigger an update check
    this.viewDistance = 20; // Max distance photos are potentially visible (adjust as needed)
    this.targetCenter = new THREE.Vector3(0, 0, 0); // The point around which the photos are placed
  }

  // Calculates the position and rotation for a photo in the spherical view based on date
  // This is the MVP visualization logic
  calculateSphericalPosition(photoMetadata) {
    if (!photoMetadata.date || isNaN(photoMetadata.date.getTime())) {
      // Handle photos without valid date - maybe place them at a default spot or exclude
      // For now, return null to exclude them from this visualization mode
      console.warn(
        `Photo ${photoMetadata.name} has no valid date metadata, skipping spherical positioning.`,
      );
      return null;
    }

    const date = photoMetadata.date;
    // Simple mapping: Use date to distribute photos around a sphere
    // Let's map date to longitude (theta) and maybe time of day to latitude (phi)
    // This assumes a roughly uniform distribution of photos over time.

    // Example 1: Map date to angle around Y axis (longitude)
    // Need a reference date and a scale factor
    const epoch = new Date("2000-01-01T00:00:00Z"); // Arbitrary start date
    const daysSinceEpoch =
      (date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24); // Difference in days
    const anglePerDay = 0.01; // Adjust this value to spread out photos (radians per day)
    const theta = (daysSinceEpoch * anglePerDay) % (Math.PI * 2); // Ensure it wraps around

    // Example 2: Map something else to angle from Y axis (latitude)
    // Maybe map the hour of the day to latitude? (0 = top, PI = bottom)
    const hours = date.getHours(); // 0-23
    const phi = (hours / 24) * Math.PI; // Map 0-23 hours to 0-PI (top to bottom hemisphere)

    // Spherical coordinates (radius, phi, theta)
    // Let's use a fixed radius for now
    const radius = 10; // Distance from the center (adjust based on your scene scale)

    const x = this.targetCenter.x + radius * Math.sin(phi) * Math.cos(theta);
    const y = this.targetCenter.y + radius * Math.cos(phi);
    const z = this.targetCenter.z + radius * Math.sin(phi) * Math.sin(theta);

    const position = new THREE.Vector3(x, y, z);

    // Calculate rotation to face the center (or the camera)
    // Pointing towards the origin (0,0,0)
    const lookAtVector = this.targetCenter;
    const dummy = new THREE.Object3D(); // Use a temporary object to calculate rotation
    dummy.position.copy(position);
    dummy.lookAt(lookAtVector);
    const rotation = dummy.rotation.clone();

    return { position, rotation };
  }

  // Main update method called when camera moves or data changes
  updateScene(dataManager, sceneManager, camera) {
    // console.log('VisualizationManager updateScene called'); // Debug log (can be noisy)

    // Get photos that should be visible based on the current view
    const allPhotos = dataManager.getAllPhotos(); // Get all photos from DataManager for now

    // In a more optimized version, you'd filter `allPhotos` here based on camera frustum and distance
    // For MVP, we'll add/remove based on a simple distance check from the target center
    // This is a simplification and will still load textures for distant photos if they are added to the scene

    // Let's refine the MVP logic: Only add photos if they are within a certain *sphere* radius
    // and remove them if they are outside that radius. This is simpler than frustum culling for now.
    // The camera position relative to the photo is what matters for display, but a fixed radius
    // around the data center is easier to implement first.

    const photosToDisplay = new Set();
    const maxDistanceFromCenter = this.viewDistance; // Define a range around the data center

    allPhotos.forEach((photoMetadata) => {
      const placement = this.calculateSphericalPosition(photoMetadata);
      if (placement) {
        // For MVP, just add/remove based on existence in the data set
        // A proper implementation checks proximity to the camera OR proximity to a central point for layout
        photosToDisplay.add(photoMetadata.name); // Add the photo's unique ID
      }
    });

    // Determine photos to remove (currently active but not in photosToDisplay)
    const photosToRemove = new Set();
    this.activePhotos.forEach((photoId) => {
      if (!photosToDisplay.has(photoId)) {
        photosToRemove.add(photoId);
      }
    });

    // Remove photos
    photosToRemove.forEach((photoId) => {
      sceneManager.removePhoto(photoId); // sceneManager handles disposal
      this.activePhotos.delete(photoId);
    });

    // Determine photos to add (in photosToDisplay but not currently active)
    const photosToAdd = new Set();
    photosToDisplay.forEach((photoId) => {
      if (!this.activePhotos.has(photoId)) {
        // Check if the photo actually exists in DataManager's index
        const photoMetadata = dataManager.getPhoto(photoId); // Assuming DataManager has this method
        if (photoMetadata) {
          // Check if its position is within the visualization range (if using a fixed range)
          const placement = this.calculateSphericalPosition(photoMetadata); // Recalculate position
          // For now, we always add if it has placement info. Dynamic loading needs refinement here.
          // A better dynamic loading would check if the photo's *calculated position* is near the *camera*.
          // This MVP version adds/removes based on the *set of all photos loaded*, which isn't dynamic loading yet.
          // Let's stick to adding all photos with date data for now, and optimize dynamic loading later.
          photosToAdd.add(photoMetadata); // Add the photoMetadata object
        } else {
          console.warn(
            `Photo ID ${photoId} is in photosToDisplay set but not found in DataManager.`,
          );
        }
      }
    });

    // Add new photos
    photosToAdd.forEach((photoMetadata) => {
      // For MVP, always use spherical position
      const placement = this.calculateSphericalPosition(photoMetadata);
      if (placement) {
        sceneManager.addPhoto(
          photoMetadata,
          placement.position,
          placement.rotation,
        ); // Pass the full metadata
        this.activePhotos.add(photoMetadata.name); // Add the photo ID to active set
      }
    });

    // console.log(`VisualizationManager: Added ${photosToAdd.size}, Removed ${photosToRemove.size}. Total active: ${this.activePhotos.size}`); // Can be noisy
  }

  // Clear method for when the user clears the selection
  clear() {
    this.activePhotos.clear();
    this.lastCameraPosition.set(0, 0, 0); // Reset last camera position
    // The actual removal from the scene is handled by ThreeSceneManager.clearPhotos
    console.log("VisualizationManager state cleared.");
  }

  // You would add other visualization mode calculations here later
  // calculateCubePosition(photoMetadata) { ... }
  // calculateDistributedPosition(photoMetadata) { ... }

  // Method to handle photo clicks from the scene manager
  handlePhotoClick(photoMetadata, uiHandler) {
    uiHandler.showPreview(photoMetadata);
  }
}
