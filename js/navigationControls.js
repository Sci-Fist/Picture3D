// js/navigationControls.js

// Import the OrbitControls class from the installed 'three' package
// Vite will find this in node_modules/three/examples/jsm/controls/OrbitControls.js
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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

    // Configure controls for orbiting a central point (like the origin, where photos are placed)
    this.controls.enableDamping = true; // Add smooth camera movement
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.5; // Adjust rotation speed
    this.controls.zoomSpeed = 1.2; // Adjust zoom speed
    this.controls.panSpeed = 0.8; // Adjust pan speed
    this.controls.screenSpacePanning = false; // Set to false for 3D space panning
    this.controls.minDistance = 0.1; // Minimum distance from the target (prevents going inside very center)
    this.controls.maxDistance = 500; // Maximum distance from the target

    // Set the target the camera orbits around - this should be the center of your spherical arrangement
    this.controls.target.set(0, 0, 0); // Orbit around the origin where the sphere is centered
    this.controls.update(); // Must call .update() after changes

    // Optional: Remove default pan cursor - OrbitControls usually manages this well
    // domElement.style.cursor = "grab";
  }

  update() {
    // Call update in the animation loop if damping is enabled or if auto-rotation is on
    if (this.controls && this.controls.enabled) {
      // Only update if controls are enabled
      this.controls.update();
    }
  }

  getControls() {
    return this.controls;
  }

  // Optional: Add a reset method if you want to reset camera position/zoom on clear
  // reset() {
  //     if (this.controls) {
  //          this.controls.reset(); // Resets camera to initial position/zoom and target
  //          // Or set specific position:
  //          // this.controls.object.position.set(0, 0, 5); // Set camera position inside sphere
  //          // this.controls.target.set(0, 0, 0); // Set orbit target
  //          // this.controls.update();
  //     }
  // }
}
