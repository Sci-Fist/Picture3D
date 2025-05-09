// js\visualizationManager.js

import * as THREE from "three";

export class VisualizationManager {
  constructor() {
    console.log("VisualizationManager constructor called");
    this.activePhotos = new Set();
    this.lastCameraPosition = new THREE.Vector3();
    this.updateThreshold = 0.1;
    this.viewDistance = 20;
    this.targetCenter = new THREE.Vector3(0, 0, 0);

    // Radius for the spherical layout
    this.sphereRadius = 10;
    // Base multiplier for spacing identical timestamps (radians per ID difference)
    // INCREASED significantly to prevent photos with same date from being perfectly stacked
    this.identicalTimestampSpacingMultiplier = 0.15; // Increased from 0.04
    // Angle per day to distribute photos around the sphere (radians per day)
    this.anglePerDay = 0.02; // 0.02 radians ~ 1.1 degrees per day

    // NEW: Track the current visualization mode
    this.currentMode = "spherical"; // Default mode
  }

  // Method to set the current visualization mode
  setMode(mode) {
    if (this.currentMode !== mode) {
      console.log(`VisualizationManager: Changing mode to ${mode}`);
      this.currentMode = mode;
      // Note: The scene needs to be cleared and rebuilt by main.js after this call
      // The updateScene method will then use the new mode.
    }
  }

  // Calculates the position and rotation for a photo based on the current mode
  calculatePosition(photoMetadata, allPhotos) {
    // Pass allPhotos here for cubic placeholder
    switch (this.currentMode) {
      case "spherical":
        return this.calculateSphericalPosition(photoMetadata);
      case "cubic":
        return this.calculateCubePosition(photoMetadata, allPhotos); // Pass allPhotos to cubic
      // Add more modes here later
      default:
        console.error(
          `VisualizationManager: Unknown mode: ${this.currentMode}. Falling back to spherical.`,
        );
        this.currentMode = "spherical"; // Reset to default
        return this.calculateSphericalPosition(photoMetadata);
    }
  }

  // Calculates the position and rotation for a photo in the spherical view based on date
  calculateSphericalPosition(photoMetadata) {
    const photoId = photoMetadata.name;

    if (
      !photoMetadata ||
      !photoMetadata.date ||
      isNaN(photoMetadata.date.getTime())
    ) {
      return null;
    }

    const date = photoMetadata.date;
    const id = photoMetadata.id || 0;

    const epoch = new Date("2000-01-01T00:00:00Z");
    const timeDifferenceMs = date.getTime() - epoch.getTime();
    const daysSinceEpoch = timeDifferenceMs / (1000 * 60 * 60 * 24);

    let theta = (daysSinceEpoch * this.anglePerDay) % (Math.PI * 2);
    if (theta < 0) {
      theta += Math.PI * 2;
    }

    const hours = date.getHours();
    const hoursFraction = hours / 24;
    const phiMin = Math.PI / 4;
    const phiMax = (3 * Math.PI) / 4;
    const phiRange = phiMax - phiMin;

    let phi = phiMin + hoursFraction * phiRange;

    // Add spacing for photos with identical dates using the unique ID
    const spacingOffset = id * this.identicalTimestampSpacingMultiplier; // Apply increased multiplier

    theta += spacingOffset;
    phi += spacingOffset * 0.1;

    // Ensure phi stays within the desired range
    phi = Math.max(phiMin, Math.min(phiMax, phi));

    const x =
      this.targetCenter.x + this.sphereRadius * Math.sin(phi) * Math.cos(theta);
    const y = this.targetCenter.y + this.sphereRadius * Math.cos(phi);
    const z =
      this.targetCenter.z + this.sphereRadius * Math.sin(phi) * Math.sin(theta);

    const position = new THREE.Vector3(x, y, z);

    const lookAtVector = this.targetCenter;
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    dummy.lookAt(lookAtVector);
    const rotation = dummy.rotation.clone();

    return { position, rotation };
  }

  // PLACEHOLDER METHOD: Calculates the position and rotation for Cubic view
  // This is not a full cubic layout. It just positions them differently for now.
  // A proper cubic layout would involve mapping properties (like folder, tags, date ranges)
  // to different faces or regions of the cube.
  calculateCubePosition(photoMetadata, allPhotos) {
    // Accept allPhotos here
    const photoId = photoMetadata.name;

    if (
      !photoMetadata ||
      !photoMetadata.date ||
      isNaN(photoMetadata.date.getTime())
    ) {
      return null; // Exclude photos without valid dates
    }

    const id = photoMetadata.id || 0;
    const cubeSize = 20; // Size of the virtual cube
    const spacing = 2; // Space between items in the placeholder

    // Simple placeholder: Arrange them in a grid in front of the camera
    const itemsPerRow = 5; // How many items per row in the grid
    const rowIndex = Math.floor(id / itemsPerRow);
    const colIndex = id % itemsPerRow;

    // Need total photos count or at least rows count to center vertically
    const totalPhotos = allPhotos ? allPhotos.length : 1; // Use actual count if available
    const totalRows = Math.ceil(totalPhotos / itemsPerRow);

    const x = (colIndex - (itemsPerRow - 1) / 2) * spacing; // Center horizontally
    // Use totalRows to help center vertically
    const y = (rowIndex - (totalRows - 1) / 2) * -spacing; // Center vertically, negative for down
    const z = -cubeSize / 2; // Place them in front of the viewer at Z = -10

    const position = new THREE.Vector3(x, y, z);

    // For cube view, photos might face forward or follow wall angles
    // Let's make them face forward for this simple placeholder
    const rotation = new THREE.Euler(0, 0, 0); // No rotation

    return { position, rotation };
  }

  updateScene(dataManager, sceneManager, camera) {
    // console.log('VisualizationManager updateScene called'); // Debug log

    const allPhotos = dataManager.getAllPhotos(); // Get all photos

    const photosToDisplay = new Set();
    const photoPlacements = new Map();

    allPhotos.forEach((photoMetadata) => {
      // Pass allPhotos to calculatePosition in case the mode (like cubic) needs it
      const placement = this.calculatePosition(photoMetadata, allPhotos);
      if (placement) {
        photosToDisplay.add(photoMetadata.name);
        photoPlacements.set(photoMetadata.name, placement);
      } else {
        photosToDisplay.delete(photoMetadata.name);
      }
    });

    const photosToRemove = new Set();
    this.activePhotos.forEach((photoId) => {
      if (!photosToDisplay.has(photoId)) {
        photosToRemove.add(photoId);
      }
    });

    photosToRemove.forEach((photoId) => {
      sceneManager.removePhoto(photoId);
      this.activePhotos.delete(photoId);
    });

    const photosToAdd = new Set();
    photosToDisplay.forEach((photoId) => {
      if (!this.activePhotos.has(photoId)) {
        const photoMetadata = dataManager.getPhoto(photoId);
        if (photoMetadata) {
          photosToAdd.add(photoMetadata);
        } else {
          console.warn(
            `Photo ID ${photoId} marked for display but not found in DataManager.`,
          );
        }
      }
    });

    photosToAdd.forEach((photoMetadata) => {
      const placement = photoPlacements.get(photoMetadata.name);
      if (placement) {
        sceneManager.addPhoto(
          photoMetadata,
          placement.position,
          placement.rotation,
        );
        this.activePhotos.add(photoMetadata.name);
      } else {
        console.error(
          `VisualizationManager: Could not find placement for photo ${photoMetadata.name} marked for display. This indicates a logic error.`,
        );
      }
    });

    // console.log(`VisualizationManager: Added ${photosToAdd.size}, Removed ${photosToRemove.size}. Total active: ${this.activePhotos.size}`);
  }

  clear() {
    this.activePhotos.clear();
    this.lastCameraPosition.set(0, 0, 0);
    this.targetCenter.set(0, 0, 0);
    // Note: currentMode is not reset here, it persists until changed via settings
    console.log("VisualizationManager state cleared.");
  }
}
