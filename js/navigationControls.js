// js\navigationControls.js

import * as THREE from "./lib/three.module.js"; // We need Vector3, Vector2, Spherical, and MathUtils

/**
 * Basic navigation controls for orbiting a target point (default: origin).
 * Handles mouse drag for orbit and mouse wheel for zoom.
 */
class NavigationControls {
  constructor() {
    console.log("NavigationControls constructor called"); // For debugging

    this.camera = null;
    this.domElement = null;

    // Internal state
    this.isDragging = false;
    this.dragStart = new THREE.Vector2();

    // Spherical representation of camera position relative to target
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical(); // Used to accumulate changes per frame
    this.targetSpherical = new THREE.Spherical(); // Target spherical coords for smooth damping

    // Target point the camera orbits around
    this.target = new THREE.Vector3(0, 0, 0); // Default target is the origin

    // Configuration parameters
    this.rotateSpeed = 0.5; // Sensitivity for mouse rotation
    this.zoomSpeed = 1.0; // Sensitivity for mouse wheel zoom

    // Limits
    this.minPolarAngle = 0; // radians, default 0 (north pole)
    this.maxPolarAngle = Math.PI; // radians, default Math.PI (south pole)

    // this.minAzimuthAngle = -Infinity; // radians - leaving for future use
    // this.maxAzimuthAngle = Infinity; // radians - leaving for future use

    this.minDistance = 0.1; // Affects spherical.radius - minimum distance from target
    this.maxDistance = 1000; // Affects spherical.radius - maximum distance from target

    // Damping (smooth interpolation for movement/rotation)
    this.enableDamping = true;
    this.dampingFactor = 0.25; // How much to "slow down" the movement

    // Event listeners binding (important to bind 'this' context)
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this); // Prevent default right click menu

    // Optional: Store previous state for checking if update is needed (performance)
    this._lastPosition = new THREE.Vector3();
    this._lastQuaternion = new THREE.Quaternion();
  }

  /**
   * Initializes the controls, sets up the initial state, and adds event listeners.
   * @param {THREE.Camera} camera - The camera to control.
   * @param {HTMLElement} domElement - The DOM element to attach event listeners to (e.g., the canvas).
   */
  init(camera, domElement) {
    console.log(
      "NavigationControls init called with camera:",
      camera,
      "domElement:",
      domElement,
    ); // For debugging
    this.camera = camera;
    this.domElement = domElement;

    if (!this.camera || !this.domElement) {
      console.error(
        "NavigationControls: Camera and DOM element must be provided.",
      );
      return;
    }

    // Calculate initial spherical coordinates from camera position relative to target
    // Assuming the camera is initially positioned correctly relative to the desired target
    const offset = new THREE.Vector3().subVectors(camera.position, this.target);
    this.spherical.setFromVector3(offset);
    this.targetSpherical.copy(this.spherical); // Target starts same as current

    // Clamp the initial spherical angles within limits
    this.spherical.theta = Math.max(
      this.minAzimuthAngle,
      Math.min(this.maxAzimuthAngle, this.spherical.theta),
    );
    this.spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.spherical.phi),
    );
    this.spherical.makeSafe(); // Ensure polar angle is not exactly 0 or PI

    this.targetSpherical.copy(this.spherical); // Update target after clamping/safing

    // Add event listeners
    this.domElement.addEventListener("mousedown", this.onMouseDown, false);
    this.domElement.addEventListener("mouseup", this.onMouseUp, false);
    this.domElement.addEventListener("mousemove", this.onMouseMove, false);
    this.domElement.addEventListener("wheel", this.onWheel, false);
    this.domElement.addEventListener("contextmenu", this.onContextMenu, false); // Prevent default right click menu

    // Set initial cursor style
    this.domElement.style.cursor = "grab";
  }

  /**
   * Event handler for mouse down.
   * @param {MouseEvent} event
   */
  onMouseDown(event) {
    if (this.enabled === false) return;
    // Only handle left mouse button for rotation
    if (event.button === 0) {
      this.isDragging = true;
      this.dragStart.set(event.clientX, event.clientY);
      this.domElement.style.cursor = "grabbing"; // Optional: change cursor style
    }
  }

  /**
   * Event handler for mouse up.
   * @param {MouseEvent} event
   */
  onMouseUp(event) {
    if (this.enabled === false) return;
    this.isDragging = false;
    this.domElement.style.cursor = "grab"; // Optional: restore cursor style
  }

  /**
   * Event handler for mouse move.
   * @param {MouseEvent} event
   */
  onMouseMove(event) {
    if (this.enabled === false) return;
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragStart.x;
      const deltaY = event.clientY - this.dragStart.y;

      // Apply mouse movement delta to spherical delta (for rotation)
      // Horizontal movement affects theta (azimuthal angle)
      this.sphericalDelta.theta -=
        ((2 * Math.PI * deltaX) / this.domElement.clientWidth) *
        this.rotateSpeed;
      // Vertical movement affects phi (polar angle)
      this.sphericalDelta.phi -=
        ((2 * Math.PI * deltaY) / this.domElement.clientHeight) *
        this.rotateSpeed;

      // Update drag start position for the next move event
      this.dragStart.set(event.clientX, event.clientY);
    }
  }

  /**
   * Event handler for mouse wheel (zoom).
   * @param {WheelEvent} event
   */
  onWheel(event) {
    if (this.enabled === false) return;
    event.preventDefault(); // Prevent default scrolling behavior

    // Calculate zoom delta from wheel event
    // Scrolling down (positive deltaY) zooms out (increases radius)
    // Scrolling up (negative deltaY) zooms in (decreases radius)
    // Using a factor based on the current radius for more natural zooming speed
    const zoomFactor = 1 + this.zoomSpeed * 0.05; // Adjust sensitivity

    if (event.deltaY > 0) {
      this.sphericalDelta.radius = this.targetSpherical.radius * zoomFactor; // Zoom out target
    } else if (event.deltaY < 0) {
      this.sphericalDelta.radius = this.targetSpherical.radius / zoomFactor; // Zoom in target
    }
  }

  /**
   * Event handler to prevent default context menu on right click.
   * @param {MouseEvent} event
   */
  onContextMenu(event) {
    if (this.enabled === false) return;
    event.preventDefault();
  }

  /**
   * Updates the camera position and rotation based on accumulated user input.
   * This method should be called in the application's animation loop.
   */
  update() {
    if (this.enabled === false) return;
    if (this.camera === null) return;

    // Accumulate spherical delta into target spherical
    this.targetSpherical.theta += this.sphericalDelta.theta;
    this.targetSpherical.phi += this.sphericalDelta.phi;

    // Apply radius change directly from the wheel event
    // This avoids compounding the delta radius over multiple frames if damping is high
    if (this.sphericalDelta.radius !== 0) {
      this.targetSpherical.radius = this.sphericalDelta.radius;
    }

    // Clamp polar angle (phi) to prevent camera from flipping over the poles
    this.targetSpherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.targetSpherical.phi),
    );

    // Clamp radius to enforce min/max distance from target
    this.targetSpherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetSpherical.radius),
    );

    // --- Apply Smoothing / Damping ---
    // Smoothly interpolate current spherical towards target spherical

    if (this.enableDamping) {
      // Lerp angles (with wrapping consideration for theta if needed, though not implemented here)
      this.spherical.theta = THREE.MathUtils.lerp(
        this.spherical.theta,
        this.targetSpherical.theta,
        this.dampingFactor,
      );
      this.spherical.phi = THREE.MathUtils.lerp(
        this.spherical.phi,
        this.targetSpherical.phi,
        this.dampingFactor,
      );

      // Lerp radius
      this.spherical.radius = THREE.MathUtils.lerp(
        this.spherical.radius,
        this.targetSpherical.radius,
        this.dampingFactor,
      );
    } else {
      // If no damping, just snap to target
      this.spherical.copy(this.targetSpherical);
    }

    // Ensure spherical angles stay within practical range after interpolation
    this.spherical.makeSafe();

    // --- Update Camera Transformation ---
    // Calculate camera's new position in Cartesian coordinates relative to the target
    const cameraPosition = new THREE.Vector3().setFromSpherical(this.spherical);

    // Set camera's world position by adding the calculated offset to the target point
    this.camera.position.copy(this.target).add(cameraPosition);

    // Make the camera look at the target point
    this.camera.lookAt(this.target);

    // --- Reset Deltas for Next Frame ---
    this.sphericalDelta.set(0, 0, 0); // Reset deltas accumulated from input

    // Optional: Check if update actually happened (for performance monitoring or specific logic)
    // if ( this._lastPosition.distanceToSquared( this.camera.position ) > EPS ||
    // 	 0 !== this._lastQuaternion.dot( this.camera.quaternion ) ) {

    // 	this.dispatchEvent( _changeEvent );

    // 	this._lastPosition.copy( this.camera.position );
    // 	this._lastQuaternion.copy( this.camera.quaternion );

    // }
  }

  /**
   * Sets the target point that the camera orbits around.
   * @param {THREE.Vector3} target - The new target point.
   */
  setTarget(target) {
    this.target.copy(target);
    // Re-calculate spherical coordinates relative to the new target
    const offset = new THREE.Vector3().subVectors(
      this.camera.position,
      this.target,
    );
    this.spherical.setFromVector3(offset);
    this.targetSpherical.copy(this.spherical);
    this.spherical.makeSafe(); // Ensure angles are valid after setting target
    this.targetSpherical.copy(this.spherical);
    this.update(); // Immediately update camera position
  }

  /**
   * Disposes of the controls by removing event listeners.
   */
  dispose() {
    console.log("NavigationControls dispose called.");
    if (this.domElement) {
      this.domElement.removeEventListener("mousedown", this.onMouseDown, false);
      this.domElement.removeEventListener("mouseup", this.onMouseUp, false);
      this.domElement.removeEventListener("mousemove", this.onMouseMove, false);
      this.domElement.removeEventListener("wheel", this.onWheel, false);
      this.domElement.removeEventListener(
        "contextmenu",
        this.onContextMenu,
        false,
      );
      this.domElement.style.cursor = ""; // Restore default cursor
    }
  }
}

// This is the critical line that makes NavigationControls available for import
export { NavigationControls };
