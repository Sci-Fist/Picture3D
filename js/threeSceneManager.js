// js/threeSceneManager.js

// Import Three.js core library from the installed 'three' package
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

    this.photoPlaneBaseSize = 10; // Base size for the photo plane (height)

    // *** Gesture Detection Properties ***
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.isPointerDown = false;
    this.pointerDownTime = 0;
    this.longPressThreshold = 500; // milliseconds
    this.pointerDownPosition = new THREE.Vector2(); // To track initial press position
    this.moveThreshold = 5; // pixels, to distinguish click from drag/swipe
    this.currentIntersectedPhoto = null; // Track the photo under the pointer on down

    // Callback functions to be set by main.js for specific interactions
    this.onPhotoLongPressRelease = null; // Callback for long press release
    this.onPhotoSwipe = null; // Callback for swipe
    this.onPhotoInteractionStart = null; // Callback when interaction starts on a photo
    this.onPhotoInteractionEnd = null; // Callback when interaction ends on a photo
    this.onPhotoClick = null; // Callback for a simple click on a photo
  }

  init(containerElement) {
    this.container = containerElement;

    // Get initial dimensions from the container element
    const initialWidth = this.container ? this.container.clientWidth : 1;
    const initialHeight = this.container ? this.container.clientHeight : 1;
    // Ensure aspect ratio is not zero or NaN
    const aspectRatio = initialWidth / initialHeight || 1;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111); // Dark background

    // Camera - Position inside the sphere radius (10)
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    // *** Adjust camera position to be *inside* the sphere ***
    // Sphere radius is 10. Positioning at Z=5 places it within the sphere, looking at the center.
    this.camera.position.set(0, 0, 5); // Start inside the sphere
    this.camera.lookAt(0, 0, 0); // Look towards the center of the sphere

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Append the renderer's DOM element (the canvas) to the container
    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    } else {
      console.error(
        "ThreeSceneManager: Cannot append renderer DOM element, container not found.",
      );
    }

    // Basic Lighting
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Slightly brighter directional light
    directionalLight.position.set(5, 5, 5).normalize();
    this.scene.add(directionalLight);

    // *** Add pointer event listeners to the canvas ***
    if (this.renderer && this.renderer.domElement) {
      const domElement = this.renderer.domElement;
      domElement.addEventListener("pointerdown", this.onPointerDown.bind(this));
      domElement.addEventListener("pointerup", this.onPointerUp.bind(this));
      domElement.addEventListener("pointermove", this.onPointerMove.bind(this));
      // Prevent context menu on right click which interferes with OrbitControls
      domElement.addEventListener("contextmenu", (event) =>
        event.preventDefault(),
      );
    } else {
      console.error(
        "ThreeSceneManager: Renderer DOM element not available for pointer listeners.",
      );
    }

    // Handle window resizing
    // This listener will fire automatically on initial page load and window resize
    window.addEventListener("resize", this.onWindowResize.bind(this));

    console.log("ThreeSceneManager initialized.");
  }

  // *** Pointer Event Handlers ***

  onPointerDown(event) {
    // Ignore multi-touch or secondary mouse buttons for basic gestures for now
    // Allow left (0) and right (2) buttons for OrbitControls compatibility
    if (event.isPrimary === false || (event.button !== 0 && event.button !== 2))
      return;

    this.isPointerDown = true;
    this.pointerDownTime = performance.now();
    this.pointerDownPosition.set(event.clientX, event.clientY);

    // Update the pointer coordinates for raycasting
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform a raycast to see if a photo was hit (only on primary button down)
    if (event.button === 0) {
      // Only raycast on left mouse down / primary touch down
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersectableObjects = Array.from(this.photoObjects.values());

      const intersects = this.raycaster.intersectObjects(
        intersectableObjects,
        false,
      );

      if (intersects.length > 0) {
        this.currentIntersectedPhoto = intersects[0].object;
        // Notify main.js to potentially disable OrbitControls
        if (typeof this.onPhotoInteractionStart === "function") {
          this.onPhotoInteractionStart();
        }
      } else {
        this.currentIntersectedPhoto = null;
      }
    } else {
      // If right button is pressed, no photo interaction is intended for now
      this.currentIntersectedPhoto = null;
    }
  }

  onPointerUp(event) {
    // Only process gestures on primary button up (usually left mouse)
    if (event.isPrimary === false || event.button !== 0) {
      // If OrbitControls was disabled for interaction start, re-enable it now
      if (typeof this.onPhotoInteractionEnd === "function") {
        this.onPhotoInteractionEnd();
      }
      this.isPointerDown = false; // Ensure flag is reset
      return;
    }

    this.isPointerDown = false; // Pointer is definitely up now

    const pointerUpTime = performance.now();
    const dragDistance = this.pointerDownPosition.distanceTo(
      new THREE.Vector2(event.clientX, event.clientY),
    );

    // Check if we had a photo intersected when the pointer went down
    if (this.currentIntersectedPhoto) {
      const photoMetadata = this.currentIntersectedPhoto.userData.photoMetadata;

      // Check gesture type based on time and distance
      const isLongPress =
        pointerUpTime - this.pointerDownTime >= this.longPressThreshold;
      const isClick = dragDistance < this.moveThreshold;
      const isSwipe = dragDistance >= this.moveThreshold; // Movement beyond threshold is a swipe/drag

      if (isLongPress && isClick) {
        // Check for long press (duration met, little movement)
        console.log(
          "ThreeSceneManager: Long Press Released Detected on Photo:",
          photoMetadata.name,
        );
        if (typeof this.onPhotoLongPressRelease === "function") {
          this.onPhotoLongPressRelease(
            photoMetadata,
            this.currentIntersectedPhoto,
          );
        }
      } else if (isClick) {
        // Check for simple click (brief duration, little movement)
        console.log(
          "ThreeSceneManager: Click Detected on Photo:",
          photoMetadata.name,
        );
        if (typeof this.onPhotoClick === "function") {
          this.onPhotoClick(photoMetadata);
        }
      } else if (isSwipe) {
        // Check for swipe (movement detected)
        console.log(
          "ThreeSceneManager: Swipe Detected on Photo:",
          photoMetadata.name,
        );
        const startX = this.pointerDownPosition.x;
        const startY = this.pointerDownPosition.y;
        const endX = event.clientX;
        const endY = event.clientY;
        const swipeVector = new THREE.Vector2(endX - startX, endY - startY);

        if (typeof this.onPhotoSwipe === "function") {
          this.onPhotoSwipe(
            photoMetadata,
            swipeVector,
            this.currentIntersectedPhoto,
          );
        }
      }

      // Optional: Remove highlight state
      // this.unhighlightPhoto(this.currentIntersectedPhoto);

      this.currentIntersectedPhoto = null; // Clear the intersected photo reference
    } // End if currentIntersectedPhoto

    // Notify main.js that interaction has ended
    if (typeof this.onPhotoInteractionEnd === "function") {
      this.onPhotoInteractionEnd();
    }
  }

  onPointerMove(event) {
    // Update pointer coordinates for potential raycasting (e.g., for hover effects, though not implemented)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // If pointer is down AND we had a photo initially, we are currently performing a drag/swipe gesture on the photo.
    if (this.isPointerDown && this.currentIntersectedPhoto) {
      // Add logic here if you need real-time drag feedback, like moving the photo visually while dragging.
      // The actual gesture (swipe direction, throw) is calculated on pointer up.
    }

    // If pointer is down but no photo was hit, OrbitControls will handle the scene movement.
  }

  // *** Existing Methods (modified slightly or unchanged) ***

  onWindowResize() {
    if (this.container && this.camera && this.renderer) {
      // Get dimensions from the container element which is sized by CSS
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      if (width > 0 && height > 0) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        console.log(
          `ThreeSceneManager: Resized renderer to ${width}x${height}`,
        );
      } else {
        console.warn(
          "ThreeSceneManager: Resizing detected but container dimensions are zero or negative.",
        );
      }
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

  addPhoto(photoMetadata, position, rotation = new THREE.Euler(0, 0, 0)) {
    const photoId = photoMetadata.name;

    if (this.photoObjects.has(photoId)) {
      return;
    }
    if (!photoMetadata || !photoMetadata.src) {
      console.error(
        `Cannot add photo (ID: ${photoId || "N/A"}): Missing photo metadata or image source URL.`,
      );
      return;
    }

    const placeholderMaterial = new THREE.MeshBasicMaterial({
      color: 0x555555,
      side: THREE.DoubleSide,
    });
    const initialGeometry = new THREE.PlaneGeometry(
      this.photoPlaneBaseSize,
      this.photoPlaneBaseSize,
    );

    const photoMesh = new THREE.Mesh(initialGeometry, placeholderMaterial);
    photoMesh.position.copy(position);
    photoMesh.rotation.copy(rotation);

    photoMesh.userData = {
      photoId: photoId,
      photoMetadata: photoMetadata,
      initialPosition: position.clone(),
    }; // Store initial position
    // Add flags for stack state (updated by VisualizationManager)
    photoMesh.userData.isStacked = false;
    photoMesh.userData.stackKey = null;
    photoMesh.userData.baseStackedPosition = null;
    photoMesh.userData.originalRotation = rotation.clone();

    this.scene.add(photoMesh);
    this.photoObjects.set(photoId, photoMesh);

    this.textureLoader.load(
      photoMetadata.src,
      (texture) => {
        if (photoMesh && photoMesh.parent && photoMetadata) {
          if (photoMesh.geometry && !photoMesh.geometry.disposed)
            photoMesh.geometry.dispose();
          if (photoMesh.material && !photoMesh.material.disposed)
            photoMesh.material.dispose();

          const imgWidth = photoMetadata.imageWidth || texture.image.width;
          const imgHeight = photoMetadata.imageHeight || texture.image.height;
          let aspectRatio = 1;
          if (imgWidth > 0 && imgHeight > 0) {
            aspectRatio = imgWidth / imgHeight;
          } else {
            console.warn(
              `Could not get valid dimensions for texture of ${photoId}. Using default 1:1 aspect ratio.`,
            );
            photoMesh.geometry = new THREE.PlaneGeometry(
              this.photoPlaneBaseSize,
              this.photoPlaneBaseSize,
            );
            photoMesh.geometry.needsUpdate = true;
            photoMesh.material = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide,
              transparent: true,
              alphaTest: 0.01,
            });
            photoMesh.material.needsUpdate = true;
            if (
              photoMetadata &&
              typeof photoMetadata.revokeObjectURL === "function"
            ) {
              photoMetadata.revokeObjectURL();
            }
            return;
          }

          photoMesh.geometry = new THREE.PlaneGeometry(
            aspectRatio * this.photoPlaneBaseSize,
            this.photoPlaneBaseSize,
          );
          photoMesh.geometry.needsUpdate = true;
          photoMesh.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.01,
          });
          photoMesh.material.needsUpdate = true;

          if (
            photoMetadata &&
            typeof photoMetadata.revokeObjectURL === "function"
          ) {
            photoMetadata.revokeObjectURL();
          }
        } else {
          if (texture) texture.dispose();
          if (
            photoMetadata &&
            typeof photoMetadata.revokeObjectURL === "function"
          ) {
            photoMetadata.revokeObjectURL();
          }
        }
      },
      undefined, // onProgress
      (err) => {
        console.error(`Error loading texture for photo ${photoId}:`, err);
        if (photoMesh && photoMesh.parent) {
          if (photoMesh.material && !photoMesh.material.disposed) {
            if (photoMesh.material.map) photoMesh.material.map.dispose();
            photoMesh.material.dispose();
          }
          photoMesh.material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
          });
          photoMesh.material.needsUpdate = true;
        }
      },
    );
  }

  getPhotoMesh(photoId) {
    return this.photoObjects.get(photoId);
  }

  removePhoto(photoId) {
    const photoMesh = this.photoObjects.get(photoId);
    if (photoMesh) {
      if (photoMesh.geometry && !photoMesh.geometry.disposed) {
        photoMesh.geometry.dispose();
      }
      if (photoMesh.material && !photoMesh.material.disposed) {
        if (photoMesh.material.map) {
          photoMesh.material.map.dispose();
        }
        photoMesh.material.dispose();
      }
      if (
        photoMesh.userData &&
        photoMesh.userData.photoMetadata &&
        typeof photoMesh.userData.photoMetadata.revokeObjectURL === "function"
      ) {
        photoMesh.userData.photoMetadata.revokeObjectURL();
      }
      this.scene.remove(photoMesh);
      this.photoObjects.delete(photoId);
    }
  }

  clearPhotos() {
    const photoIdsToRemove = Array.from(this.photoObjects.keys());
    photoIdsToRemove.forEach((photoId) => {
      this.removePhoto(photoId);
    });
    this.photoObjects.clear();
    console.log("Cleared all photo objects from the scene.");
  }

  // Method to find the photo mesh under the given pointer coordinates
  getPhotoAtPointer(pointerX, pointerY) {
    const canvas = this.renderer.domElement;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    this.pointer.x = ((pointerX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; // Make sure event.clientY is used

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersectableObjects = Array.from(this.photoObjects.values());

    const intersects = this.raycaster.intersectObjects(
      intersectableObjects,
      false,
    );

    if (intersects.length > 0) {
      // Return the first intersected photo object
      return intersects[0].object;
    }
    return null;
  }

  // NEW: Animation method for photo meshes
  animatePhotoToPosition(photoMesh, targetPosition, duration = 300) {
    if (!photoMesh) return;

    // Stop any existing position animation on this mesh
    if (photoMesh.userData.animationId) {
      cancelAnimationFrame(photoMesh.userData.animationId);
      delete photoMesh.userData.animationId; // Clear the old ID
    }

    const startPosition = photoMesh.position.clone();
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1); // Animation progress (0 to 1)

      // Smoothstep easing function (provides smoother start and end)
      const easedT = t * t * (3 - 2 * t);

      // Linear interpolation (Lerp) between start and target positions
      photoMesh.position.lerpVectors(startPosition, targetPosition, easedT);

      if (t < 1) {
        photoMesh.userData.animationId = requestAnimationFrame(animate);
      } else {
        // Animation finished, ensure it's exactly at the target
        photoMesh.position.copy(targetPosition);
        // Clean up animation ID
        delete photoMesh.userData.animationId;
      }
    };

    photoMesh.userData.animationId = requestAnimationFrame(animate);
  }
}
