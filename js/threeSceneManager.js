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

    // Base size for the photo plane (height) - Adjusted again for better visibility
    this.photoPlaneBaseSize = 10; // Let's use 10 units height as a base. Sphere radius is 10.
  }

  init(containerElement) {
    this.container = containerElement;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111); // Dark background

    // Camera - Initial aspect ratio can be set here, but will be corrected by resize handler
    // Use a default ratio or the initial container size, but the resize call at the end is crucial.
    const initialWidth = this.container ? this.container.clientWidth : 1;
    const initialHeight = this.container ? this.container.clientHeight : 1;
    const aspectRatio = initialWidth / initialHeight || 1; // Default to 1 if dimensions are 0

    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    // >> Adjust initial camera position - Closer to sphere radius (10)
    this.camera.position.z = 12; // Start closer to the sphere for visibility (slightly outside radius)
    // Look towards the origin (where the sphere is centered and photos are placed)
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Do NOT set size here using clientWidth/clientHeight directly
    // Instead, append the canvas, THEN call the resize handler
    this.renderer.setPixelRatio(window.devicePixelRatio); // Improve rendering quality on high-res displays

    // Append the renderer's DOM element (the canvas) to the container
    if (this.container) {
      this.container.appendChild(this.renderer.domElement);
    } else {
      console.error(
        "ThreeSceneManager: Cannot append renderer DOM element, container not found.",
      );
      // Handle this fatal case - perhaps throw an error or return early?
      // Given the check in main.js, this console.error should suffice.
    }

    // Basic Lighting
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Slightly brighter directional light
    directionalLight.position.set(5, 5, 5).normalize();
    this.scene.add(directionalLight);

    // Add event listener for raycasting on click - Listen on the renderer's canvas element
    if (this.renderer && this.renderer.domElement) {
      // Check if renderer and its element exist
      this.renderer.domElement.addEventListener(
        "click",
        this.onCanvasClick.bind(this),
        false,
      );
      // Set initial cursor state - OrbitControls might override this
      // The OrbitControls init will likely handle setting the cursor on the canvas
      // this.renderer.domElement.style.cursor = 'grab';
    } else {
      console.error(
        "ThreeSceneManager: Renderer DOM element not available for click listener.",
      );
    }

    // Handle window resizing
    window.addEventListener("resize", this.onWindowResize.bind(this));

    // *** IMPORTANT FIX ***
    // Manually call the resize handler ONCE after appending the canvas
    // This ensures the renderer size and camera aspect ratio are set based on
    // the container's actual computed size after layout.
    this.onWindowResize();

    console.log("ThreeSceneManager initialized.");
  }

  onWindowResize() {
    // Ensure elements exist and container has dimensions
    if (this.container && this.camera && this.renderer) {
      // Use window.innerWidth/innerHeight directly if #3d-container is fixed to viewport
      const width = this.container.clientWidth; // Using clientWidth/Height is usually reliable if the container CSS is correct
      const height = this.container.clientHeight;

      if (width > 0 && height > 0) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        // console.log(`ThreeSceneManager: Resized to ${width}x${height}`); // Debug log
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
    // Only render if renderer, scene, and camera are initialized
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    } else {
      // Optional: Log a warning if render is called before initialization is complete.
      // This might happen if init() failed due to container size.
      if (
        this.container &&
        (this.container.clientWidth <= 0 || this.container.clientHeight <= 0)
      ) {
        // console.warn("ThreeSceneManager: Render skipped due to zero container size.");
      } else if (
        this.container &&
        (!this.renderer || !this.scene || !this.camera)
      ) {
        // console.warn("ThreeSceneManager: render() called before Three.js components are fully initialized.");
      }
    }
  }

  // Add a photo mesh to the scene
  // Accepts photoMetadata object which contains src and other info
  addPhoto(photoMetadata, position, rotation = new THREE.Euler(0, 0, 0)) {
    const photoId = photoMetadata.name; // Use photo name as unique ID

    if (this.photoObjects.has(photoId)) {
      // console.warn(`Photo object for ID ${photoId} already exists in scene.`);
      return;
    }
    if (!photoMetadata || !photoMetadata.src) {
      console.error(
        `Cannot add photo (ID: ${photoId || "N/A"}): Missing photo metadata or image source URL.`,
      );
      // Consider adding a fallback plain color mesh here if metadata exists but src doesn't
      return;
    }

    // Create a placeholder material while texture loads
    const placeholderMaterial = new THREE.MeshBasicMaterial({
      color: 0x555555, // Medium grey placeholder
      side: THREE.DoubleSide,
    });

    // Use the determined base size for the initial placeholder geometry
    // Start with a square geometry based on the base size
    const initialGeometry = new THREE.PlaneGeometry(
      this.photoPlaneBaseSize,
      this.photoPlaneBaseSize,
    );

    const photoMesh = new THREE.Mesh(initialGeometry, placeholderMaterial);
    photoMesh.position.copy(position);
    photoMesh.rotation.copy(rotation); // Apply initial rotation calculated by vis manager

    // Store the original photo data or ID on the mesh for raycasting and preview
    photoMesh.userData = { photoId: photoId, photoMetadata: photoMetadata };

    this.scene.add(photoMesh);
    this.photoObjects.set(photoId, photoMesh);
    // console.log(`Added photo placeholder ${photoId} to scene.`);

    // Asynchronously load the texture
    this.textureLoader.load(
      photoMetadata.src,
      // onLoad callback
      (texture) => {
        // Check if the mesh is still in the scene (parent is not null) and wasn't removed
        // Also check if photoMetadata still exists (not cleared during loading)
        if (photoMesh && photoMesh.parent && photoMetadata) {
          // Dispose of the placeholder geometry and material BEFORE creating/assigning new ones
          // Check if they are not already disposed
          if (photoMesh.geometry && !photoMesh.geometry.disposed)
            photoMesh.geometry.dispose();
          if (photoMesh.material && !photoMesh.material.disposed)
            photoMesh.material.dispose();

          // Determine image dimensions and calculate aspect ratio
          const imgWidth = photoMetadata.imageWidth || texture.image.width;
          const imgHeight = photoMetadata.imageHeight || texture.image.height;

          let aspectRatio = 1; // Default to 1 if dimensions are invalid
          if (imgWidth > 0 && imgHeight > 0) {
            aspectRatio = imgWidth / imgHeight;
          } else {
            console.warn(
              `Could not get valid dimensions for texture of ${photoId} (w=${imgWidth}, h=${imgHeight}). Using default 1:1 aspect ratio.`,
            );
            // Use the base size for both dimensions if aspect ratio cannot be determined
            photoMesh.geometry = new THREE.PlaneGeometry(
              this.photoPlaneBaseSize,
              this.photoPlaneBaseSize,
            );
            photoMesh.geometry.needsUpdate = true; // Ensure geometry updates
            // Assign the texture map even if aspect is 1:1
            photoMesh.material = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide,
              transparent: true,
              alphaTest: 0.01,
            });
            photoMesh.material.needsUpdate = true;
            // Revoke URL here if texture was successfully used even with default geom
            if (
              photoMetadata &&
              typeof photoMetadata.revokeObjectURL === "function"
            ) {
              photoMetadata.revokeObjectURL();
            }
            return; // Exit callback here after setting square geometry
          }

          // Create new geometry with correct aspect ratio based on base size (height)
          // The height is fixed to baseSize, width adjusts by aspect ratio
          photoMesh.geometry = new THREE.PlaneGeometry(
            aspectRatio * this.photoPlaneBaseSize, // Width
            this.photoPlaneBaseSize, // Height
          );
          // Update the geometry for rendering
          photoMesh.geometry.needsUpdate = true;

          // Create the final material with the loaded texture
          photoMesh.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true, // Needed for alphaTest to work or for images with alpha
            alphaTest: 0.01, // Render pixels only if they have alpha > 0.01 (helps with jagged edges from transparency)
          });
          photoMesh.material.needsUpdate = true; // Ensure material updates

          // console.log(`Loaded texture and updated mesh for photo ${photoId} (Aspect: ${aspectRatio.toFixed(2)}, Final Size: ${photoMesh.geometry.parameters.width.toFixed(2)}x${photoMesh.geometry.parameters.height.toFixed(2)})`); // Debug log

          // Revoke the object URL AFTER the texture has been successfully loaded and applied
          if (
            photoMetadata &&
            typeof photoMetadata.revokeObjectURL === "function"
          ) {
            photoMetadata.revokeObjectURL();
            // console.log(`Revoked Object URL for ${photoId} after texture load finished.`);
          } // else { console.warn(`revokeObjectURL not found or already called for photo ${photoId} after texture load finished.`); }
        } else {
          // Mesh was removed or metadata cleared while texture was loading, dispose of the texture
          // console.log(`Texture loaded for ${photoId} but mesh was removed or metadata cleared before applying. Disposing texture.`); // Debug log
          if (texture) texture.dispose();

          // If texture loaded but mesh/metadata was gone, revoke URL here too
          if (
            photoMetadata &&
            typeof photoMetadata.revokeObjectURL === "function"
          ) {
            photoMetadata.revokeObjectURL();
            // console.log(`Revoked Object URL for ${photoId} during load finished (mesh/metadata gone).`);
          }
        }
      },
      // onProgress callback (optional)
      // You could update a loading bar per photo here if needed
      undefined, // onProgress

      // onError callback
      (err) => {
        console.error(`Error loading texture for photo ${photoId}:`, err);
        // Change mesh material to indicate error
        // Check if mesh and its parent still exist
        if (photoMesh && photoMesh.parent) {
          // Dispose of existing material/texture if they somehow exist
          if (photoMesh.material && !photoMesh.material.disposed) {
            if (photoMesh.material.map) photoMesh.material.map.dispose();
            photoMesh.material.dispose();
          }
          photoMesh.material = new THREE.MeshBasicMaterial({
            // Assign a red error material
            color: 0xff0000,
            side: THREE.DoubleSide,
          });
          photoMesh.material.needsUpdate = true;
        }
        // Do NOT revoke the URL on error here if the mesh is still in the scene,
        // as it might still reference the problematic URL. Revocation should ideally
        // happen when the mesh is removed or the URL is replaced.
        // Given our revoke logic is in the onLoad success or remove,
        // we don't need an extra revoke here on error unless we specifically want
        // to clean up the URL even if the mesh stays (e.g., showing red).
        // If the photoMetadata object itself holds the URL reference and its state,
        // relying on the revokeObjectURL method on the metadata object is safer.

        // However, if the error happened and the mesh *is* subsequently removed,
        // the removePhoto method will handle the revoke.
      },
    );

    // console.log(`Attempted to add photo ${photoId} to scene.`);
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
      // Check if not already disposed
      if (photoMesh.geometry && !photoMesh.geometry.disposed) {
        photoMesh.geometry.dispose();
        // console.log(`Disposed geometry for ${photoId}`);
      }
      if (photoMesh.material && !photoMesh.material.disposed) {
        // Dispose texture if it was loaded and has a map
        if (photoMesh.material.map) {
          photoMesh.material.map.dispose();
          // console.log(`Disposed texture map for ${photoId}`);
        }
        photoMesh.material.dispose();
        // console.log(`Disposed material for ${photoId}`);
      }

      // Revoke the object URL associated with the photo data
      // This should ideally happen when the texture loading attempt is finished (success or fail)
      // and the URL is no longer needed, or when the photo is removed.
      // Let's ensure it's called here as a safety net if it wasn't called in onLoad/onError.
      if (
        photoMesh.userData &&
        photoMesh.userData.photoMetadata &&
        typeof photoMesh.userData.photoMetadata.revokeObjectURL === "function"
      ) {
        // The revokeObjectURL method itself should handle checking if it was already revoked
        photoMesh.userData.photoMetadata.revokeObjectURL();
        // console.log(`Revoked Object URL for ${photoId} during remove.`);
      } else {
        // console.warn(`revokeObjectURL not found or already called for photo ${photoId} on remove`);
      }

      this.scene.remove(photoMesh);
      this.photoObjects.delete(photoId);
      // console.log(`Removed photo ${photoId} from scene.`);
    } else {
      // console.warn(`Attempted to remove photo ${photoId} but it was not found in the scene.`);
    }
  }

  // Clear all photo objects from the scene
  clearPhotos() {
    // Create a list of photo IDs to remove to avoid modifying the map while iterating
    const photoIdsToRemove = Array.from(this.photoObjects.keys());

    photoIdsToRemove.forEach((photoId) => {
      this.removePhoto(photoId); // Use the existing removePhoto method to handle disposal
    });

    // photoObjects map should be effectively cleared by removePhoto calls
    // Ensure it's fully cleared
    this.photoObjects.clear();
    console.log("Cleared all photo objects from the scene.");
  }

  onCanvasClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    // Use the renderer's canvas element for bounding rectangle
    const canvas = this.renderer.domElement;
    if (!canvas) {
      console.error(
        "ThreeSceneManager: Cannot perform raycasting, renderer DOM element is missing.",
      );
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Find objects intersected by the raycaster
    // Filter to only include meshes that are intended to be photos (have photoId in userData)
    const intersectableObjects = [];
    this.photoObjects.forEach((mesh) => {
      // Ensure the mesh exists and is a valid Mesh before adding
      if (mesh && mesh.isMesh && mesh.userData && mesh.userData.photoId) {
        intersectableObjects.push(mesh);
      }
    });

    // Only perform raycasting if there are intersectable objects
    if (intersectableObjects.length === 0) {
      // console.log("No intersectable photo objects in scene."); // Can be noisy
      return;
    }

    // Use the filtered list for raycasting
    const intersects = raycaster.intersectObjects(
      intersectableObjects,
      false, // Set to false, we don't need recursive check unless photos are grouped
    );

    if (intersects.length > 0) {
      // The first intersected object is the closest one
      const intersectedObject = intersects[0].object;

      // Check if the intersected object has photo data in userData
      if (
        intersectedObject.userData &&
        intersectedObject.userData.photoMetadata
      ) {
        const photoMetadata = intersectedObject.userData.photoMetadata;
        console.log("Clicked on photo:", photoMetadata.name);

        // Trigger an event or call a callback to show the preview
        // Dispatch a custom event that uiHandler can listen to
        const previewEvent = new CustomEvent("photoClicked", {
          detail: photoMetadata,
        });
        window.dispatchEvent(previewEvent); // Dispatch the event on the window
      } else {
        console.warn(
          "Raycast hit an object marked as photo but missing expected userData.",
        );
      }
    } else {
      // console.log("Raycast hit no photo objects."); // Can be noisy if clicking empty space
    }
  }
}
