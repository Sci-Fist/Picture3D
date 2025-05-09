import { ThreeSceneManager } from "./js/threeSceneManager.js";
import { UIHandler } from "./js/uiHandler.js";
import { FileLoader } from "./js/fileLoader.js";
import { NavigationControls } from "./js/navigationControls.js";
import { VisualizationManager } from "./js/visualizationManager.js";
import { DataManager } from "./js/dataManager.js";

// Set up the Three.js scene
const threeSceneManager = new ThreeSceneManager();
const container = document.getElementById("3d-container");
threeSceneManager.init(container);

// Set up UI
const uiHandler = new UIHandler();
uiHandler.init();

// Set up data and file loading
const dataManager = new DataManager();
const fileLoader = new FileLoader();

// Set up visualization manager
const visualizationManager = new VisualizationManager();

// Set up navigation controls (needs camera and domElement from threeSceneManager)
const camera = threeSceneManager.getCamera();
const controlsElement = document.getElementById("3d-container");
const navigationControls = new NavigationControls();
navigationControls.init(camera, controlsElement);

// Function to start the visualization after files are loaded
async function startVisualization() {
  // Update the scene initially with loaded data
  visualizationManager.updateScene(
    dataManager,
    threeSceneManager,
    threeSceneManager.getCamera(),
  );

  // Add an event listener to the OrbitControls 'change' event
  // This ensures the visualization updates when the camera moves
  navigationControls.getControls().addEventListener("change", () => {
    visualizationManager.updateScene(
      dataManager,
      threeSceneManager,
      threeSceneManager.getCamera(),
    );
  });

  console.log("Visualization started.");
}

// Bind the file selector
uiHandler.bindFileSelector(async (files) => {
  // Loading indicator is now handled within fileLoader.readFiles
  await fileLoader.readFiles(files, dataManager, uiHandler, startVisualization);
  // startVisualization is called by fileLoader after reading is complete
});

// Bind the clear selection button
uiHandler.bindClearButton(() => {
  dataManager.clearPhotos();
  threeSceneManager.clearPhotos();
  visualizationManager.clear(); // Add a clear method to VisualizationManager if needed
  // Potentially re-initialize or reset the scene/camera position here
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Only update controls and render in the animation loop
  // Visualization logic is now triggered by the controls 'change' event
  navigationControls.update(); // Required for damping and other updates
  threeSceneManager.render();
}

// Start the animation loop
animate();
