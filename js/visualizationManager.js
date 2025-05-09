// js\visualizationManager.js
// CORRECTED: Code within swipePhoto and scrollStack now correctly expects and uses the passed sceneManager

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

    // Track the current visualization mode
    this.currentMode = "spherical"; // Default mode

    // Stack Management Properties
    this.photoStacks = new Map(); // Map: calculatedPositionKey -> Set<photoId>
    this.spreadStackRadius = 2; // Radius to spread stacked photos around
    this.spreadStackDuration = 300; // Animation duration for spreading

    // Animation tracking (simple example - needs more robust management for multiple animations)
    this.activeAnimations = new Set(); // Set to track animating photos or groups
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
        // Pass id=0 here to ensure all photos with the same date get the *same* base position for stacking
        // The spreading logic will then offset them based on their true unique ID.
        return this.calculateSphericalPosition(photoMetadata, 0); // Use base position for stacking
      case "cubic":
        return this.calculateCubePosition(photoMetadata, allPhotos); // Pass allPhotos to cubic
      // Add more modes here later
      default:
        console.error(
          `VisualizationManager: Unknown mode: ${this.currentMode}. Falling back to spherical.`,
        );
        this.currentMode = "spherical"; // Reset to default
        return this.calculateSphericalPosition(photoMetadata, 0); // Use base position for stacking
    }
  }

  // MODIFIED: calculateSphericalPosition now accepts an optional ID for base positioning
  calculateSphericalPosition(photoMetadata, baseId = photoMetadata.id || 0) {
    // Use baseId (0 for initial stacking) for the core position calculation
    // Use the photo's actual unique ID for spreading *within* a stack later
    const id = baseId;

    if (
      !photoMetadata ||
      !photoMetadata.date ||
      isNaN(photoMetadata.date.getTime())
    ) {
      return null;
    }

    const date = photoMetadata.date;
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

    // *** Removed the id-based spacing from here ***
    // The id-based spacing will now be handled by the spreading logic for stacks.
    // This ensures photos with identical timestamps get the *exact same* base position.

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
  calculateCubePosition(photoMetadata, allPhotos) {
    const photoId = photoMetadata.name;
    if (
      !photoMetadata ||
      !photoMetadata.date ||
      isNaN(photoMetadata.date.getTime())
    ) {
      return null; // Exclude photos without valid dates
    }
    const id = photoMetadata.id || 0;
    const cubeSize = 20;
    const spacing = 2;
    const itemsPerRow = 5;
    const rowIndex = Math.floor(id / itemsPerRow);
    const colIndex = id % itemsPerRow;
    const totalPhotos = allPhotos ? allPhotos.length : 1;
    const totalRows = Math.ceil(totalPhotos / itemsPerRow);
    const x = (colIndex - (itemsPerRow - 1) / 2) * spacing;
    const y = (rowIndex - (totalRows - 1) / 2) * -spacing;
    const z = -cubeSize / 2;
    const position = new THREE.Vector3(x, y, z);
    const rotation = new THREE.Euler(0, 0, 0);
    return { position, rotation };
  }

  updateScene(dataManager, sceneManager, camera) {
    // console.log('VisualizationManager updateScene called');

    const allPhotos = dataManager.getAllPhotos(); // Get all photos
    const photosToDisplay = new Set();
    const photoPlacements = new Map(); // Map: photoId -> { position, rotation }
    const newPhotoStacks = new Map(); // Map: positionKey -> Set<photoId> for this update

    allPhotos.forEach((photoMetadata) => {
      // Calculate base position for potential stacking based on the current mode
      const placement = this.calculatePosition(photoMetadata, allPhotos);

      if (placement) {
        photosToDisplay.add(photoMetadata.name);
        photoPlacements.set(photoMetadata.name, placement);

        // Identify stacks based on identical positions
        const positionKey = `${placement.position.x.toFixed(4)},${placement.position.y.toFixed(4)},${placement.position.z.toFixed(4)}`; // Create a string key for the position
        if (!newPhotoStacks.has(positionKey)) {
          newPhotoStacks.set(positionKey, new Set());
        }
        newPhotoStacks.get(positionKey).add(photoMetadata.name); // Add photo ID to the stack at this position
      } else {
        photosToDisplay.delete(photoMetadata.name);
      }
    });

    // Store the new stack information
    this.photoStacks = newPhotoStacks;

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
        // For newly added photos, place them at their calculated base position initially.
        // Spreading animation happens separately on long press release.
        sceneManager.addPhoto(
          photoMetadata,
          placement.position.clone(), // Use a clone so the original placement isn't modified by animation
          placement.rotation.clone(),
        );
        this.activePhotos.add(photoMetadata.name);

        // Update the mesh's userData to indicate if it's part of a stack
        const photoMesh = sceneManager.getPhotoMesh(photoMetadata.name);
        if (photoMesh) {
          const positionKey = `${placement.position.x.toFixed(4)},${placement.position.y.toFixed(4)},${placement.position.z.toFixed(4)}`;
          photoMesh.userData.isStacked =
            this.photoStacks.has(positionKey) &&
            this.photoStacks.get(positionKey).size > 1;
          photoMesh.userData.stackKey = photoMesh.userData.isStacked
            ? positionKey
            : null;
          // Store the base position for stacked items
          photoMesh.userData.baseStackedPosition = photoMesh.userData.isStacked
            ? placement.position.clone()
            : null;
          photoMesh.userData.originalRotation = placement.rotation.clone(); // Store original rotation
        }
      } else {
        console.error(
          `VisualizationManager: Could not find placement for photo ${photoMetadata.name} marked for display.`,
        );
      }
    });
  }

  // Handle Spreading a Stack
  spreadStack(stackAnchorPhotoMetadata, sceneManager) {
    const stackKey = stackAnchorPhotoMetadata.stackKey; // Use the stored stack key from the mesh
    if (
      !stackKey ||
      !this.photoStacks.has(stackKey) ||
      this.photoStacks.get(stackKey).size <= 1
    ) {
      console.warn(
        "VisualizationManager: Not part of a valid stack to spread.",
      );
      return;
    }

    const photoIdsInStack = Array.from(this.photoStacks.get(stackKey));
    const numPhotosInStack = photoIdsInStack.length;

    console.log(
      `VisualizationManager: Spreading stack at ${stackKey} with ${numPhotosInStack} photos.`,
    );

    const basePosition =
      stackAnchorPhotoMetadata.baseStackedPosition || new THREE.Vector3(); // Use stored base position
    const baseRotation =
      stackAnchorPhotoMetadata.originalRotation || new THREE.Euler(0, 0, 0); // Use stored original rotation

    // Simple spreading: arrange in a circle around the base position
    const angleStep = (Math.PI * 2) / numPhotosInStack; // Angle between photos in the circle

    photoIdsInStack.forEach((photoId, index) => {
      const photoMesh = sceneManager.getPhotoMesh(photoId);
      if (photoMesh) {
        // Calculate offset position in local space (relative to the base position)
        const offsetX = this.spreadStackRadius * Math.cos(index * angleStep);
        const offsetY = this.spreadStackRadius * Math.sin(index * angleStep);
        const offsetZ = 0; // Keep flat for now

        const spreadLocalOffset = new THREE.Vector3(offsetX, offsetY, offsetZ);

        // Apply the offset, rotated to match the base position's orientation
        const rotationQuaternion = new THREE.Quaternion().setFromEuler(
          baseRotation,
        );
        const spreadWorldOffset = spreadLocalOffset
          .clone()
          .applyQuaternion(rotationQuaternion);

        const targetPosition = basePosition.clone().add(spreadWorldOffset);

        // Animate photo to its spread position
        sceneManager.animatePhotoToPosition(
          photoMesh,
          targetPosition,
          this.spreadStackDuration,
        );

        // Update mesh state - it's no longer considered "stacked" in this visual position
        photoMesh.userData.isStacked = false; // They are now spread
        // We keep stackKey and baseStackedPosition in userData in case we want to re-stack them later
      }
    });

    // Optional: Remove the stack from the active stack list if it's fully spread
    // This might prevent re-triggering spread on photos that are already spread.
    // For MVP, it might be okay to just leave it, or remove it if re-stacking isn't planned.
    // this.photoStacks.delete(stackKey); // Could delete the stack entry
  }

  // Handle Swiping a Photo (Placeholder)
  swipePhoto(photoMetadata, swipeVector, photoMesh, sceneManager) {
    console.log(
      "VisualizationManager: Handling swipe (THROW Placeholder) for",
      photoMetadata.name,
      "Vector:",
      swipeVector.x,
      swipeVector.y,
    );

    if (!photoMesh || !sceneManager || !sceneManager.getCamera) {
      // Added checks
      console.error(
        "VisualizationManager: swipePhoto missing required arguments or sceneManager is incomplete.",
      );
      return;
    }

    // Basic "throw" animation logic (placeholder):
    const throwDistance = 20; // How far to throw it
    const throwStrength = 0.05; // How much swipe vector influences the throw direction

    const camera = sceneManager.getCamera(); // Get camera instance
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection); // Get camera's forward direction

    // Create a side/up vector relative to the camera based on swipe direction
    // This is a simplified mapping from 2D screen swipe to 3D direction.
    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
      camera.quaternion,
    );
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
      camera.quaternion,
    );

    const swipe3DDirection = cameraDirection
      .clone()
      .multiplyScalar(throwDistance) // Base throw direction (forward), clone to avoid modifying cameraDirection
      .add(cameraRight.multiplyScalar(swipeVector.x * throwStrength)) // Add side component
      .add(cameraUp.multiplyScalar(-swipeVector.y * throwStrength)); // Add up/down component (-y because screen Y is down)

    const targetPosition = photoMesh.position.clone().add(swipe3DDirection);

    // Animate the throw
    sceneManager.animatePhotoToPosition(photoMesh, targetPosition, 500); // animate over 500ms

    // Optional: Remove the thrown photo from the scene after animation?
    // setTimeout(() => { sceneManager.removePhoto(photoMetadata.name); }, 600); // Remove slightly after animation
  }

  // Handle Vertical Swipe for Stack Scrolling (Placeholder)
  scrollStack(stackAnchorPhotoMetadata, swipeVectorY, photoMesh, sceneManager) {
    console.log(
      "VisualizationManager: Handling stack scroll (PLACEHOLDER) for",
      stackAnchorPhotoMetadata.name,
      "Swipe Y:",
      swipeVectorY,
    );

    if (!photoMesh || !sceneManager || !sceneManager.getCamera) {
      // Added checks
      console.error(
        "VisualizationManager: scrollStack missing required arguments or sceneManager is incomplete.",
      );
      return;
    }

    const stackKey = stackAnchorPhotoMetadata.stackKey; // Use the stored stack key
    if (
      !stackKey ||
      !this.photoStacks.has(stackKey) ||
      this.photoStacks.get(stackKey).size <= 1
    ) {
      console.warn(
        "VisualizationManager: Not on a stack or stack is too small to scroll.",
      );
      return;
    }

    const photoIdsInStack = Array.from(this.photoStacks.get(stackKey));
    const numPhotosInStack = photoIdsInStack.length;

    // Find the current photo's index within the stack
    const currentIndex = photoIdsInStack.indexOf(stackAnchorPhotoMetadata.name);
    if (currentIndex === -1) {
      console.warn(
        "VisualizationManager: Swiped photo not found in its reported stack.",
      );
      return;
    }

    // Determine scroll direction based on swipeVectorY
    const scrollDirection = swipeVectorY < 0 ? 1 : -1; // 1 for forward (up swipe), -1 for backward (down swipe)

    let nextIndex = currentIndex + scrollDirection;

    // Wrap around the stack if scrolling past the ends
    if (nextIndex >= numPhotosInStack) {
      nextIndex = 0; // Wrap to the beginning
    } else if (nextIndex < 0) {
      nextIndex = numPhotosInStack - 1; // Wrap to the end
    }

    const nextPhotoId = photoIdsInStack[nextIndex];
    const nextPhotoMesh = sceneManager.getPhotoMesh(nextPhotoId);
    if (!nextPhotoMesh) {
      console.warn(
        "VisualizationManager: Next photo in stack not found in scene.",
      );
      return;
    }

    console.log(
      `Scrolling stack from index ${currentIndex} to ${nextIndex} (${nextPhotoId})`,
    );

    // --- Animation for Stack Scroll (PLACEHOLDER) ---
    // The desired effect is likely animating the CAMERA/OrbitControls target to the next photo.
    // This requires interaction with the NavigationControls or Camera directly from main.js.
    // A simple visual placeholder animation below:

    // Move the *current* photo slightly backward and the *next* photo slightly forward
    const currentMesh = photoMesh; // The mesh that was swiped
    const currentOriginalPosition =
      currentMesh.userData.baseStackedPosition || currentMesh.position.clone();

    // Animate current photo back slightly
    const backwardOffset = new THREE.Vector3(0, 0, -0.1).applyQuaternion(
      sceneManager.getCamera().quaternion,
    );
    sceneManager.animatePhotoToPosition(
      currentMesh,
      currentOriginalPosition.clone().add(backwardOffset),
      150,
    );

    // Animate the next photo forward slightly to "bring it to front"
    const nextOriginalPosition =
      nextPhotoMesh.userData.baseStackedPosition ||
      nextPhotoMesh.position.clone();
    const highlightPosition = nextOriginalPosition
      .clone()
      .add(
        new THREE.Vector3(0, 0, 0.5).applyQuaternion(
          sceneManager.getCamera().quaternion,
        ),
      ); // Slightly forward
    sceneManager.animatePhotoToPosition(nextPhotoMesh, highlightPosition, 150);

    // Optional: Revert positions after a short delay to simulate "settling"
    setTimeout(() => {
      sceneManager.animatePhotoToPosition(
        currentMesh,
        currentOriginalPosition,
        100,
      ); // Move current back to base
      sceneManager.animatePhotoToPosition(
        nextPhotoMesh,
        nextOriginalPosition,
        100,
      ); // Move next back to base
    }, 300); // Start settling animation after 300ms

    // You would also typically animate the CAMERA/OrbitControls target here
    // Example (requires callback to main.js):
    // if (typeof this.onScrollToPhoto === 'function') { this.onScrollToPhoto(nextPhotoMesh.position); }

    // Update state: You might need to track which photo in the stack is currently "active" or "front"
    // This also needs more robust state management.
  }

  clear() {
    this.activePhotos.clear();
    this.lastCameraPosition.set(0, 0, 0);
    this.targetCenter.set(0, 0, 0);
    this.photoStacks.clear(); // Clear stack data
    // Note: currentMode is not reset here, it persists until changed via settings
    console.log("VisualizationManager state cleared.");
  }
}
