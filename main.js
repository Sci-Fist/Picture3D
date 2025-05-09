// js/main.js
import { ThreeSceneManager } from "./js/threeSceneManager.js";
import { UIHandler } from "./js/uiHandler.js";
import { FileLoader } from "./js/fileLoader.js";
import { NavigationControls } from "./js/navigationControls.js";
import { VisualizationManager } from "./js/visualizationManager.js";
import { DataManager } from "./js/dataManager.js";

// Set up the Three.js scene
const threeSceneManager = new ThreeSceneManager();
const container = document.getElementById("3d-container");
if (!container) {
  console.error("FATAL ERROR: 3D container element #3d-container not found!");
} else {
  threeSceneManager.init(container);
  // Call onWindowResize explicitly here
  // This ensures the renderer and camera are sized based on the container's
  // computed size immediately after init and the DOM is ready.
  threeSceneManager.onWindowResize();
}

// Set up UI
const uiHandler = new UIHandler();
uiHandler.init(); // Initialize UI elements and their internal listeners

// Set up data and file loading
const dataManager = new DataManager();
const fileLoader = new FileLoader();

// Set up visualization manager
const visualizationManager = new VisualizationManager();

// Set up navigation controls (needs camera and domElement from threeSceneManager)
const camera = threeSceneManager.getCamera();
// Use the renderer's DOM element for OrbitControls - this is the canvas itself
const controlsElement = threeSceneManager.getRenderer()
  ? threeSceneManager.getRenderer().domElement
  : null;

const navigationControls = new NavigationControls();
// Ensure camera and controlsElement (the canvas) are valid before initializing controls
// The threeSceneManager.init and subsequent onWindowResize call should ensure
// renderer.domElement is available here.
if (camera && controlsElement) {
  navigationControls.init(camera, controlsElement);
} else {
  console.error(
    "FATAL ERROR: Camera or controls element (renderer.domElement) not available for navigation controls initialization.",
  );
}

let isProcessingFiles = false;

// Function to start the visualization after files are loaded
async function startVisualization() {
  console.log("main.js: File loading complete. Starting visualization setup.");

  // Update the scene initially with loaded data using the current visualization mode
  visualizationManager.updateScene(
    dataManager,
    threeSceneManager,
    threeSceneManager.getCamera(),
  );

  // Add an event listener to the OrbitControls 'change' event
  // This ensures the visualization updates when the camera moves (for dynamic loading)
  // NOTE: This listener should only be added once overall.
  // A simple check to prevent adding multiple listeners on subsequent file loads:
  const controls = navigationControls.getControls();
  // Ensure controls object exists before trying to add a listener
  if (controls && !controls._changeListenerAdded) {
    // Use a custom flag on the controls object to check if listener was added
    controls.addEventListener("change", () => {
      visualizationManager.updateScene(
        dataManager,
        threeSceneManager,
        threeSceneManager.getCamera(),
      );
    });
    controls._changeListenerAdded = true; // Set the flag
    console.log("main.js: Camera change listener added.");
  } else if (!controls) {
    console.warn(
      "main.js: Navigation controls not available, skipping camera change listener setup.",
    );
  }

  console.log(
    "main.js: Initial visualization update triggered by load complete.",
  );
}

// Bind the file selector
uiHandler.bindFileSelector(async (files) => {
  if (isProcessingFiles) {
    console.log("main.js: File selection ignored - already processing files.");
    return;
  }

  if (!files || files.length === 0) {
    console.log("main.js: No files selected or selection cancelled.");
    return;
  }

  isProcessingFiles = true;
  console.log(
    `main.js: File selection detected. Starting file processing sequence for ${files.length} items.`,
  );

  try {
    console.log("main.js: Clearing previous data.");
    dataManager.clearPhotos();
    threeSceneManager.clearPhotos();
    visualizationManager.clear();

    await fileLoader.readFiles(
      files,
      dataManager,
      uiHandler,
      startVisualization, // This callback runs AFTER files are loaded
    );

    console.log("main.js: File processing sequence completed.");
  } catch (error) {
    console.error("main.js: Error during file processing sequence:", error);
    uiHandler.hideLoading();
  } finally {
    isProcessingFiles = false;
    console.log("main.js: File processing flag reset.");
  }
});

// Bind the clear selection button
uiHandler.bindClearButton(() => {
  console.log("main.js: Clear button clicked. Clearing data and scene.");
  isProcessingFiles = false; // Reset flag
  dataManager.clearPhotos();
  threeSceneManager.clearPhotos();
  visualizationManager.clear();
  console.log(
    "main.js: Clear complete. Camera change listener may persist but data/scene are cleared.",
  );
});

// Define the controls information text
const controlsInfoText = `
Left Mouse Button + Drag: Rotate View
Right Mouse Button + Drag: Pan View (Move sideways)
Mouse Wheel: Zoom In/Out

Click Photo: Show Preview
Long Press & Release Photo: Spread Stack
Swipe Photo: Throw Photo (Placeholder)
Vertical Swipe on Stack: Scroll Stack (Placeholder)
`; // Updated info text

// Bind the show controls button
uiHandler.bindShowControlsButton(() => {
  uiHandler.showControlsInfo(controlsInfoText);
});

// Bind the show settings button
uiHandler.bindShowSettingsButton(() => {
  uiHandler.showSettings();
});

// Bind the visualization mode change event from the settings modal
uiHandler.bindVisualizationModeChange((selectedMode) => {
  console.log(`main.js: Visualization mode selected: ${selectedMode}`);
  visualizationManager.setMode(selectedMode);

  // Re-calculate positions and update the scene with the new mode
  // Clear the scene and rebuild it based on the current data and new mode
  threeSceneManager.clearPhotos();
  visualizationManager.activePhotos.clear();
  visualizationManager.updateScene(
    dataManager,
    threeSceneManager,
    threeSceneManager.getCamera(),
  );
});

// Bind the toggle controls button -- no specific callback needed in main.js for now
uiHandler.bindToggleControlsButton(() => {
  // UIHandler handles the visibility toggle.
  // If you needed to enable/disable OrbitControls based on the overlay state,
  // you would add logic here or pass a callback to uiHandler.bindToggleControlsButton
  // For now, OrbitControls stays active regardless of overlay visibility.
});

// *** Bind interaction callbacks from ThreeSceneManager ***
// These functions are called by ThreeSceneManager when a gesture is detected on a photo
threeSceneManager.onPhotoInteractionStart = () => {
  // Optional: Disable OrbitControls when the user starts interacting directly with a photo
  if (navigationControls.getControls()) {
    navigationControls.getControls().enabled = false;
    console.log("main.js: Disabled OrbitControls for photo interaction.");
  }
};

threeSceneManager.onPhotoInteractionEnd = () => {
  // Re-enable OrbitControls when the user stops interacting with a photo
  if (navigationControls.getControls()) {
    navigationControls.getControls().enabled = true;
    console.log("main.js: Enabled OrbitControls after photo interaction.");
  }
};

threeSceneManager.onPhotoLongPressRelease = (photoMetadata, photoMesh) => {
  console.log(
    "main.js: Received Long Press Release on photo:",
    photoMetadata.name,
  );
  // Check if this photo is part of a stack before trying to spread
  if (photoMesh && photoMesh.userData.isStacked) {
    // Trigger the visualization manager to spread the stack, passing the sceneManager
    visualizationManager.spreadStack(photoMetadata, threeSceneManager);
  } else {
    console.log(
      "main.js: Long Press Release on non-stacked photo.",
      photoMetadata.name,
    );
    // Optional: Handle long press on a single photo (e.g., show larger preview with more info)
  }
};

threeSceneManager.onPhotoSwipe = (photoMetadata, swipeVector, photoMesh) => {
  console.log(
    "main.js: Received Swipe on photo:",
    photoMetadata.name,
    "Vector:",
    swipeVector.x,
    swipeVector.y,
  );

  // Check swipe direction to differentiate throw vs stack scroll (if on a stack)
  if (photoMesh && photoMesh.userData.isStacked) {
    // If on a stack, check if it's a vertical swipe for scrolling
    const verticalThreshold = 0.8; // require swipe to be mostly vertical (e.g., > 80% vertical)
    const swipeDirectionNormalized = swipeVector.clone().normalize();
    // Use dot product with up vector (0, 1) for screen space Y axis
    const verticality = Math.abs(swipeDirectionNormalized.y);

    if (verticality > verticalThreshold) {
      console.log(
        "main.js: Detected vertical swipe on stacked photo. Triggering stack scroll.",
      );
      visualizationManager.scrollStack(
        photoMetadata,
        swipeVector.y,
        photoMesh,
        threeSceneManager,
      ); // Pass all arguments
    } else {
      console.log(
        "main.js: Detected non-vertical swipe on stacked photo. Treating as throw.",
      );
      // Fallback to throw logic for non-vertical swipes on stacks
      visualizationManager.swipePhoto(
        photoMetadata,
        swipeVector,
        photoMesh,
        threeSceneManager,
      ); // Pass all arguments
    }
  } else {
    // If not on a stack, it's always a throw
    console.log(
      "main.js: Detected swipe on non-stacked photo. Treating as throw.",
    );
    visualizationManager.swipePhoto(
      photoMetadata,
      swipeVector,
      photoMesh,
      threeSceneManager,
    ); // Pass all arguments
  }
};

// This callback is triggered by ThreeSceneManager on a detected click
threeSceneManager.onPhotoClick = (photoMetadata) => {
  console.log("main.js: Received Click on photo:", photoMetadata.name);
  // Trigger the UI to show the preview
  uiHandler.showPreview(photoMetadata);
};

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (navigationControls) {
    navigationControls.update(); // Update controls (handles damping, panning, zooming)
  }

  if (threeSceneManager) {
    threeSceneManager.render(); // Render the scene
  }
}

animate();
console.log("main.js: Animation loop started.");
