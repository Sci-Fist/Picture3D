// js\visualizationManager.js

// Ensure this line imports from the installed 'three' package, not a CDN
import * as THREE from "three";

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
    this.lastDate = null; // Track the date of the previous photo for spacing
    this.consecutiveDateCount = 0; // Count photos with consecutive identical dates
  }

  // Calculates the position and rotation for a photo in the spherical view based on date
  // This is the MVP visualization logic
  calculateSphericalPosition(photoMetadata) {
    const photoId = photoMetadata.name; // Use photo name as unique ID

    if (!photoMetadata.date || isNaN(photoMetadata.date.getTime())) {
      console.warn(
        `Photo ${photoMetadata.name} has no valid date metadata, skipping spherical positioning.`,
      );
      // For now, place photos without valid dates at the origin, but this might overlap them
      // return { position: new THREE.Vector3(0,0,0), rotation: new THREE.Euler(0,0,0) }; // Option to place invalid dates at origin
      return null; // Option to exclude photos without valid dates from visualization
    }

    const date = photoMetadata.date;
    const id = photoMetadata.id || 0; // Use the unique ID from FileLoader, fallback to 0

    // Simple mapping: Use date to distribute photos around a sphere
    // Let's map date to longitude (theta) and maybe time of day to latitude (phi)
    // This assumes a roughly uniform distribution of photos over time.

    // Example 1: Map date to angle around Y axis (longitude)
    // Need a reference date and a scale factor
    const epoch = new Date("2000-01-01T00:00:00Z"); // Arbitrary start date
    const daysSinceEpoch =
      (date.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24); // Difference in days
    const anglePerDay = 0.005; // Adjust this value to spread out photos (radians per day). Made slightly smaller.
    let theta = (daysSinceEpoch * anglePerDay) % (Math.PI * 2); // Ensure it wraps around

    // Example 2: Map something else to angle from Y axis (latitude)
    // Maybe map the hour of the day to latitude? (0 = top, PI = bottom)
    const hours = date.getHours(); // 0-23
    let phi = (hours / 24) * Math.PI; // Map 0-23 hours to 0-PI (top to bottom hemisphere)

    // --- Add spacing for photos with identical dates ---
    // If the current photo's date is the same as the previous one processed (in the dataManager array order)
    // we add a small offset based on its unique ID. This assumes the photos in the array are somewhat ordered.
    // A more robust approach might involve grouping by date first.
    // For simplicity now, let's add a small offset based on the unique ID.
    const spacingOffset = id * 0.5; // <-- Increased significantly for testing

    // Add the offset to both theta and phi to create a spiral or distributed effect for identical dates
    theta += spacingOffset;
    phi += spacingOffset * 0.5; // Add a smaller offset to phi

    // Spherical coordinates (radius, phi, theta)
    // Let's use a fixed radius for now
    const radius = 10; // Distance from the center (adjust based on your scene scale)

    // Ensure phi is between 0 and PI (avoids placing photos below the bottom of the sphere)
    // If mapping 0-23 hours to 0-PI, this is already handled, but the spacingOffset might push it out.
    phi = Math.max(0.001, Math.min(Math.PI - 0.001, phi)); // Keep phi slightly away from poles to avoid division by zero or weirdness

    const x = this.targetCenter.x + radius * Math.sin(phi) * Math.cos(theta);
    const y = this.targetCenter.y + radius * Math.cos(phi); // Y is up/down in Three.js
    const z = this.targetCenter.z + radius * Math.sin(phi) * Math.sin(theta); // Z is typically depth

    const position = new THREE.Vector3(x, y, z);

    // Calculate rotation to face the center (or the camera)
    // Pointing towards the origin (0,0,0)
    const lookAtVector = this.targetCenter;
    const dummy = new THREE.Object3D(); // Use a temporary object to calculate rotation
    dummy.position.copy(position);
    dummy.lookAt(lookAtVector);
    const rotation = dummy.rotation.clone();

    console.log(
      `Calculated position for ${photoId} (ID: ${id}, Date: ${date ? date.toISOString() || "Invalid Date" : "N/A"}):`,
      position.toArray(),
    ); // Log positions for debugging
    return { position, rotation };
  }

  // Main update method called when camera moves or data changes
  updateScene(dataManager, sceneManager, camera) {
    // console.log('VisualizationManager updateScene called'); // Debug log (can be noisy)

    // Get all photos from DataManager for now.
    // In a more optimized version, this would be more complex (e.g., getting photos in camera frustum + padding)
    const allPhotos = dataManager.getAllPhotos();

    const photosToDisplay = new Set();

    // Recalculate positions for all photos to determine which ones to add/remove.
    // This is inefficient for large datasets, but acceptable for MVP / getting it working.
    // A real dynamic loading would iterate over photos and check their position relative to the camera.
    // For now, we just add all photos that have a valid placement.
    allPhotos.forEach((photoMetadata) => {
      // Check if the photo already has a pre-calculated position (if you added caching later)
      // Or recalculate it every time (current approach)
      const placement = this.calculateSphericalPosition(photoMetadata);
      if (placement) {
        // We'll add the photo to the scene if it has valid placement info, regardless of camera view for this simple MVP step
        // A real dynamic loading would check:
        // if (photoIsWithinCameraFrustum(photoMetadata.position, camera)) { photosToDisplay.add(photoMetadata.name); }
        // For now, let's just mark all placeable photos for "display"
        photosToDisplay.add(photoMetadata.name);
      }
    });

    // Determine photos to remove (currently active but not in photosToDisplay set)
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

    // Determine photos to add (in photosToDisplay set but not currently active)
    const photosToAdd = new Set();
    photosToDisplay.forEach((photoId) => {
      if (!this.activePhotos.has(photoId)) {
        const photoMetadata = dataManager.getPhoto(photoId);
        if (photoMetadata) {
          photosToAdd.add(photoMetadata); // Add the photoMetadata object
        } else {
          console.warn(
            `Photo ID ${photoId} marked for display but not found in DataManager.`,
          );
        }
      }
    });

    // Add new photos
    photosToAdd.forEach((photoMetadata) => {
      const placement = this.calculateSphericalPosition(photoMetadata); // Recalculate placement (redundant but safe)
      if (placement) {
        sceneManager.addPhoto(
          photoMetadata,
          placement.position,
          placement.rotation,
        ); // Pass the full metadata
        this.activePhotos.add(photoMetadata.name); // Add the photo ID to active set
      } else {
        console.warn(
          `Could not calculate placement for photo ${photoMetadata.name} marked for display.`,
        );
      }
    });

    // console.log(`VisualizationManager: Added ${photosToAdd.size}, Removed ${photosToRemove.size}. Total active: ${this.activePhotos.size}`); // Can be noisy
  }

  // Clear method for when the user clears the selection
  clear() {
    this.activePhotos.clear();
    this.lastCameraPosition.set(0, 0, 0); // Reset last camera position
    this.lastDate = null; // Reset date tracking
    this.consecutiveDateCount = 0; // Reset date count
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
