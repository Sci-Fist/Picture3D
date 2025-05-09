// js/navigationControls.js

// Import the OrbitControls class using the module path from the CDN (Using unpkg)
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js";

export class NavigationControls {
  constructor() {
    console.log("NavigationControls constructor called");
    this.controls = null;
  }

  init(camera, domElement) {
    console.log(
      "NavigationControls init called with camera:",
      camera,
      "domElement:",
      domElement,
    );
    // Instantiate OrbitControls (now imported directly)
    this.controls = new OrbitControls(camera, domElement);

    // Configure controls (adjust as needed for your spherical view)
    // Assuming you want the camera to orbit a central point (like the origin)
    this.controls.enableDamping = true; // Add smooth camera movement
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.5; // Adjust rotation speed
    this.controls.zoomSpeed = 1.2; // Adjust zoom speed
    this.controls.panSpeed = 0.8; // Adjust pan speed
    this.controls.screenSpacePanning = false; // Set to false for 3D space panning
    this.controls.minDistance = 0.1; // Minimum distance from the target (prevents going inside sphere)
    this.controls.maxDistance = 500; // Maximum distance from the target

    // Set the target the camera orbits around
    this.controls.target.set(0, 0, 0); // Orbit around the origin
    this.controls.update(); // Must call .update() after changes

    // Optional: Remove default pan cursor
    domElement.style.cursor = "grab";

    // Add event listeners for cursor changes on interaction
    this.controls.addEventListener("start", () => {
      if (domElement) domElement.style.cursor = "grabbing";
    });
    this.controls.addEventListener("end", () => {
      if (domElement) domElement.style.cursor = "grab";
    });
  }

  update() {
    // Call update in the animation loop if damping is enabled or if auto-rotation is on
    if (this.controls && this.controls.enabled && this.controls.enableDamping) {
      this.controls.update();
    }
  }

  getControls() {
    return this.controls;
  }
}
