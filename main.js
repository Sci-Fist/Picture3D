import { ThreeSceneManager } from './js/threeSceneManager.js';
import { UIHandler } from './js/uiHandler.js';
import { FileLoader } from './js/fileLoader.js';
import { NavigationControls } from './js/navigationControls.js';
import { VisualizationManager } from './js/visualizationManager.js';
import { DataManager } from './js/dataManager.js';

// Set up the Three.js scene
const threeSceneManager = new ThreeSceneManager();
const container = document.getElementById('3d-container');
threeSceneManager.init(container);

// Set up UI and bind file selector
const uiHandler = new UIHandler();
uiHandler.init();

const dataManager = new DataManager();
const fileLoader = new FileLoader();

async function startVisualization() {
    // Initialize VisualizationManager after files are loaded
    visualizationManager.updateScene(dataManager, threeSceneManager, threeSceneManager.getCamera());
}

uiHandler.bindFileSelector(async (files) => { // Added async
    uiHandler.showLoading("Scanning photos...");
    await fileLoader.readFiles(files, dataManager, uiHandler, startVisualization);
    // uiHandler.hideLoading();  // No longer needed, handled in fileLoader


});

// Initialize navigation controls
const camera = threeSceneManager.getCamera();
const controlsElement = document.getElementById('3d-container'); // Or a specific element
const navigationControls = new NavigationControls();
navigationControls.init(camera, controlsElement);

const visualizationManager = new VisualizationManager();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    visualizationManager.updateScene(dataManager, threeSceneManager, threeSceneManager.getCamera());
    navigationControls.update();
    threeSceneManager.render();
}

// Start the animation loop
animate();
