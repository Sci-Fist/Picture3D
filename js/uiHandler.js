// js/uiHandler.js
// This file correctly binds the visible button to trigger the hidden file input.

export class UIHandler {
  constructor() {
    console.log("UIHandler constructor called");
    // Get references to all necessary UI elements
    // Get the hidden file input - its 'change' event is still needed
    this.folderSelector = document.getElementById("folder-selector");
    // Get the visible button that will trigger the file input
    this.selectFolderButton = document.getElementById("select-folder-button");

    this.clearButton = document.getElementById("clear-selection");
    this.showControlsButton = document.getElementById("show-controls");
    this.showSettingsButton = document.getElementById("show-settings");
    this.loadingIndicator = document.getElementById("loading-indicator");
    this.toggleControlsButton = document.getElementById("toggle-controls");

    this.photoPreview = document.getElementById("photo-preview");
    this.previewImage = document.getElementById("preview-image");
    this.metadataDisplay = document.getElementById("metadata-display");
    this.closePreviewButton = document.getElementById("close-preview");

    this.controlsInfoModal = document.getElementById("controls-info");
    this.controlsInfoTextDiv = document.getElementById("controls-info-text");
    this.closeControlsButton = document.getElementById("close-controls");

    this.settingsModal = document.getElementById("settings-modal");
    this.settingsContentDiv = document.getElementById("settings-content");
    this.closeSettingsButton = document.getElementById("close-settings");
    this.visualizationModeOptionsDiv = document.getElementById(
      "visualization-mode-options",
    );

    this.threeDContainer = document.getElementById("3d-container");
    this.controlsContainer = document.getElementById("controls-container");

    this.controlsVisible = true; // Start visible

    // Perform initial checks to ensure elements were found
    if (!this.folderSelector)
      console.error("UIHandler: #folder-selector (hidden input) not found.");
    if (!this.selectFolderButton)
      console.error("UIHandler: #select-folder-button not found.");

    if (!this.clearButton)
      console.error("UIHandler: #clear-selection not found.");
    if (!this.showControlsButton)
      console.error("UIHandler: #show-controls not found.");
    if (!this.showSettingsButton)
      console.error("UIHandler: #show-settings not found.");
    if (!this.loadingIndicator)
      console.warn("UIHandler: #loading-indicator not found.");
    if (!this.toggleControlsButton)
      console.error("UIHandler: #toggle-controls not found.");
    if (!this.controlsContainer)
      console.error("UIHandler: #controls-container not found.");

    if (!this.photoPreview)
      console.error("UIHandler: #photo-preview not found.");
    if (!this.previewImage)
      console.error("UIHandler: #preview-image not found.");
    if (!this.metadataDisplay)
      console.error("UIHandler: #metadata-display not found.");
    if (!this.controlsInfoModal)
      console.error("UIHandler: #controls-info not found.");
    if (!this.controlsInfoTextDiv)
      console.error("UIHandler: #controls-info-text not found.");
    if (!this.closeControlsButton)
      console.error("UIHandler: #close-controls not found.");
    if (!this.settingsModal)
      console.error("UIHandler: #settings-modal not found.");
    if (!this.settingsContentDiv)
      console.error("UIHandler: #settings-content not found.");
    if (!this.visualizationModeOptionsDiv)
      console.error("UIHandler: #visualization-mode-options not found.");
    if (!this.closeSettingsButton)
      console.error("UIHandler: #close-settings not found.");
    if (!this.threeDContainer)
      console.error("UIHandler: #3d-container not found.");
  }

  init() {
    console.log("UIHandler initialized.");

    // Bind close buttons for modals
    if (this.closePreviewButton) {
      this.closePreviewButton.addEventListener(
        "click",
        this.hidePreview.bind(this),
      );
    }

    if (this.closeControlsButton) {
      this.closeControlsButton.addEventListener(
        "click",
        this.hideControlsInfo.bind(this),
      );
    }

    if (this.closeSettingsButton) {
      this.closeSettingsButton.addEventListener(
        "click",
        this.hideSettings.bind(this),
      );
    }

    // Listen for photo click event from the 3D scene
    window.addEventListener("photoClicked", (event) => {
      if (event.detail) {
        this.showPreview(event.detail);
      } else {
        console.warn(
          "UIHandler: Received photoClicked event but detail is missing.",
        );
      }
    });

    this.hidePreview();
    this.hideControlsInfo();
    this.hideSettings();

    this.showControlsOverlay(); // Ensure controls are visible initially
  }

  // This method binds the 'change' event to the hidden input
  // AND binds the 'click' event to the visible button that triggers the input.
  bindFileSelector(callback) {
    // We bind the 'change' event to the hidden input (#folder-selector)
    // This is the event that fires when the user selects files via the browser's dialog
    if (this.folderSelector) {
      this.folderSelector.addEventListener("change", (event) => {
        console.log("UIHandler: Hidden file input 'change' event detected.");
        if (event && event.target && event.target.files) {
          if (event.target.files.length > 0) {
            // Call the provided callback in main.js with the selected files
            callback(event.target.files);
            // Clear the file input value so the same folder can be selected again
            // Done AFTER calling the callback, as the callback might use event.target.files
            event.target.value = null;
          } else {
            console.log(
              "UIHandler: File input change detected, but no files selected (user cancelled or empty folder).",
            );
            callback([]); // Call with empty array to signal cancellation/empty
          }
        } else {
          console.error(
            "UIHandler: File input change event structure unexpected.",
          );
          callback([]); // Call with empty array on error
        }
      });
      console.log("Hidden file input 'change' listener bound.");
    } else {
      console.error(
        "UIHandler: #folder-selector (hidden input) not found. File selection will not work.",
      );
    }

    // We bind the 'click' event to the visible button (#select-folder-button)
    // Clicking this button will programmatically open the file selection dialog
    if (this.selectFolderButton && this.folderSelector) {
      this.selectFolderButton.addEventListener("click", () => {
        console.log(
          "Select Folder button clicked. Triggering hidden input click.",
        );
        // Programmatically trigger the click event on the hidden input
        // This opens the native browser file/folder dialog
        this.folderSelector.click();
      });
      console.log("Select Folder button bound.");
    } else {
      console.error(
        "UIHandler: Select Folder button or hidden input not found during binding. Button will not work.",
      );
    }
  }

  // Binds the click event for the "Clear Selection" button
  bindClearButton(callback) {
    if (this.clearButton) {
      this.clearButton.addEventListener("click", () => {
        console.log("Clear selection button clicked.");
        callback(); // Call callback in main.js to clear data/scene
        // Hide modals on clear
        this.hidePreview();
        this.hideControlsInfo();
        this.hideSettings();
      });
      console.log("Clear button bound.");
    } else {
      console.error(
        "UIHandler: Clear button element not found during binding.",
      );
    }
  }

  // Binds the click event for the "Show Controls Info" button
  bindShowControlsButton(callback) {
    if (this.showControlsButton) {
      this.showControlsButton.addEventListener("click", () => {
        console.log("Show controls button clicked.");
        callback(); // Call callback in main.js to get and show info
      });
      console.log("Show controls button bound.");
    } else {
      console.error(
        "UIHandler: Show controls button element not found during binding.",
      );
    }
  }

  // Binds the click event for the "Settings" button
  bindShowSettingsButton(callback) {
    if (this.showSettingsButton) {
      this.showSettingsButton.addEventListener("click", () => {
        console.log("Show settings button clicked.");
        callback(); // Call callback in main.js to show settings modal
      });
      console.log("Show settings button bound.");
    } else {
      console.error(
        "UIHandler: Show settings button element not found during binding.",
      );
    }
  }

  // Binds the change event for visualization mode radio buttons
  bindVisualizationModeChange(callback) {
    if (this.visualizationModeOptionsDiv) {
      this.visualizationModeOptionsDiv.addEventListener("change", (event) => {
        if (
          event.target &&
          event.target.name === "visualization-mode" &&
          event.target.checked
        ) {
          console.log(
            `UIHandler: Visualization mode changed to ${event.target.value}`,
          );
          callback(event.target.value); // Call callback in main.js with the selected mode
        }
      });
      console.log("Visualization mode change listener bound.");
    } else {
      console.error(
        "UIHandler: Visualization mode options div (#visualization-mode-options) not found during binding.",
      );
    }
  }

  // Binds the click event for the toggle controls button
  bindToggleControlsButton(callback) {
    if (this.toggleControlsButton) {
      this.toggleControlsButton.addEventListener("click", () => {
        console.log("Toggle controls button clicked.");
        this.controlsVisible = !this.controlsVisible; // Toggle internal state
        this.updateControlsOverlayVisibility(); // Update UI based on state
        if (callback) {
          callback(this.controlsVisible); // Optional callback to main.js
        }
      });
      console.log("Toggle controls button bound.");
    } else {
      console.error(
        "UIHandler: Toggle controls button element (#toggle-controls) not found during binding.",
      );
    }
  }

  // Updates the CSS class on the controls container to show/hide it
  updateControlsOverlayVisibility() {
    if (this.controlsContainer) {
      if (this.controlsVisible) {
        // Remove the hiding class to show the controls
        this.controlsContainer.classList.remove("hidden-controls");
        // Update toggle button appearance/text
        this.toggleControlsButton.textContent = "☰"; // Hamburger icon
        this.toggleControlsButton.style.left = "10px"; // Position on left
        this.toggleControlsButton.style.top = "10px"; // Keep at the top
      } else {
        // Add the hiding class to hide the controls
        this.controlsContainer.classList.add("hidden-controls");
        // Update toggle button appearance/text
        this.toggleControlsButton.textContent = "X"; // Close icon
        // Position button on the right when controls are hidden (relative to viewport)
        const buttonWidth = this.toggleControlsButton.offsetWidth || 40; // Estimate width if needed
        const containerWidth = window.innerWidth; // Get viewport width
        this.toggleControlsButton.style.left = `${containerWidth - buttonWidth - 20}px`; // Position 20px from right edge
        this.toggleControlsButton.style.top = "10px"; // Keep at the top

        // Ensure modals are hidden if controls are hidden (prevents clicking issues)
        this.hidePreview();
        this.hideControlsInfo();
        this.hideSettings();
      }
    } else {
      console.error(
        "UIHandler: Controls container element (#controls-container) not found for visibility update.",
      );
    }
  }

  // Alias method to explicitly show the controls overlay
  showControlsOverlay() {
    this.controlsVisible = true;
    this.updateControlsOverlayVisibility();
  }

  // Alias method to explicitly hide the controls overlay
  hideControlsOverlay() {
    this.controlsVisible = false;
    this.updateControlsOverlayVisibility();
  }

  // Shows the loading indicator with an optional message
  showLoading(message = "Loading...") {
    if (this.loadingIndicator) {
      // Find the paragraph element or use the container itself
      const pElement = this.loadingIndicator.querySelector("p");
      if (pElement) {
        pElement.textContent = message;
      } else {
        this.loadingIndicator.textContent = message;
      }
      this.loadingIndicator.style.display = "flex"; // Use flex for centering

      // Change 3D container cursor while loading
      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "wait";
      }
      // Hide any open modals when loading starts
      this.hidePreview();
      this.hideControlsInfo();
      this.hideSettings();
      // Note: We do NOT hide the main controls overlay here, only modals.
    } else {
      console.warn(
        "UIHandler: Loading indicator element (#loading-indicator) not found.",
      );
    }
  }

  // Hides the loading indicator
  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = "none";
    } else {
      console.warn(
        "UIHandler: Loading indicator element (#loading-indicator) not found.",
      );
    }
    // Restore 3D container cursor after loading IF no modals are open
    // Note: OrbitControls itself manages the grab cursor when active and enabled.
    // Setting to 'default' here is mostly for states where controls might be disabled
    // or a modal is open.
    if (!this.isAnyModalOpen()) {
      // Let OrbitControls handle the cursor when no modals are open
      // We don't need to explicitly set 'grab' here if OrbitControls is active
      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "default";
      }
    }
  }

  // Shows the photo preview modal
  showPreview(photoMetadata) {
    if (this.photoPreview && this.previewImage && this.metadataDisplay) {
      if (photoMetadata && photoMetadata.src) {
        this.previewImage.src = photoMetadata.src;
        this.previewImage.alt = `Preview of ${photoMetadata.name}`;
        this.previewImage.onerror = () => {
          console.error(
            `UIHandler: Failed to load preview image for ${photoMetadata.name} from ${photoMetadata.src}`,
          );
          this.previewImage.src = "";
          this.previewImage.alt = "Image failed to load";
        };
      } else {
        this.previewImage.src = "";
        this.previewImage.alt = "Image source unavailable";
        console.warn(
          `UIHandler: Cannot show preview for ${photoMetadata ? photoMetadata.name : "unknown photo"}, src is missing.`,
        );
      }

      let metadataHtml = `<h2>${photoMetadata.name || "Unknown Photo"}</h2>`;
      metadataHtml += `<p><strong>Date:</strong> ${photoMetadata.date ? photoMetadata.date.toLocaleString() : "N/A"}</p>`;
      if (photoMetadata.make || photoMetadata.model) {
        metadataHtml += `<p><strong>Camera:</strong> ${photoMetadata.make || ""} ${photoMetadata.model || ""}</p>`;
      }
      if (
        photoMetadata.gps &&
        typeof photoMetadata.gps.latitude === "number" &&
        typeof photoMetadata.gps.longitude === "number"
      ) {
        metadataHtml += `<p><strong>GPS:</strong> Lat ${photoMetadata.gps.latitude.toFixed(4)}, Lon ${photoMetadata.gps.longitude.toFixed(4)}</p>`;
        metadataHtml += `<p><a href="https://www.google.com/maps/search/?api=1&query=${photoMetadata.gps.latitude},${photoMetadata.gps.longitude}" target="_blank">View on Map</a></p>`;
      }
      if (photoMetadata.imageWidth && photoMetadata.imageHeight) {
        metadataHtml += `<p><strong>Dimensions:</strong> ${photoMetadata.imageWidth}x${photoMetadata.imageHeight}</p>`;
      }
      if (photoMetadata && photoMetadata.exposureTime)
        metadataHtml += `<p><strong>Exposure Time:</strong> ${photoMetadata.exposureTime}</p>`;
      if (photoMetadata && typeof photoMetadata.fNumber === "number")
        metadataHtml += `<p><strong>F-Number:</strong> f/${photoMetadata.fNumber}</p>`;
      if (photoMetadata && photoMetadata.isoSpeedRatings)
        metadataHtml += `<p><strong>ISO:</strong> ${photoMetadata.isoSpeedRatings}</p>`;
      if (photoMetadata && typeof photoMetadata.focalLength === "number")
        metadataHtml += `<p><strong>Focal Length:</strong> ${photoMetadata.focalLength} mm</p>`;
      if (photoMetadata && photoMetadata.lensModel)
        metadataHtml += `<p><strong>Lens:</strong> ${photoMetadata.lensModel}</p>`;

      metadataHtml += `<p><strong>File Size:</strong> ${(photoMetadata.size / 1024).toFixed(2)} KB</p>`;
      if (photoMetadata && photoMetadata.type)
        metadataHtml += `<p><strong>File Type:</strong> ${photoMetadata.type}</p>`;

      this.metadataDisplay.innerHTML = metadataHtml;
      this.photoPreview.style.display = "block";

      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "default";
      }
      this.hideControlsInfo();
      this.hideSettings();
    } else {
      console.error(
        "UIHandler: Preview elements not found or photo metadata is missing.",
      );
    }
  }

  // Hides the photo preview modal
  hidePreview() {
    if (this.photoPreview && this.previewImage && this.metadataDisplay) {
      this.photoPreview.style.display = "none";
      this.previewImage.src = "";
      this.previewImage.alt = "Photo Preview";
      this.previewImage.onerror = null;
      this.metadataDisplay.innerHTML = "";

      if (!this.isAnyModalOpen()) {
        if (this.threeDContainer) {
          this.threeDContainer.style.cursor = "default";
        }
      }
    }
  }

  // Shows the controls information modal
  showControlsInfo(infoText) {
    if (this.controlsInfoModal && this.controlsInfoTextDiv) {
      this.controlsInfoTextDiv.innerHTML =
        infoText || "No controls information provided.";
      this.controlsInfoModal.style.display = "block";

      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "default";
      }
      this.hidePreview();
      this.hideSettings();
    } else {
      console.error("UIHandler: Controls info modal elements not found.");
    }
  }

  // Hides the controls information modal
  hideControlsInfo() {
    if (this.controlsInfoModal) {
      this.controlsInfoModal.style.display = "none";
      if (!this.isAnyModalOpen()) {
        if (this.threeDContainer) {
          this.threeDContainer.style.cursor = "default";
        }
      }
    }
  }

  // Shows the settings modal
  showSettings() {
    if (this.settingsModal) {
      this.settingsModal.style.display = "block";

      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "default";
      }
      this.hidePreview();
      this.hideControlsInfo();
    } else {
      console.error("UIHandler: Settings modal element not found.");
    }
  }

  // Hides the settings modal
  hideSettings() {
    if (this.settingsModal) {
      this.settingsModal.style.display = "none";
      if (!this.isAnyModalOpen()) {
        if (this.threeDContainer) {
          this.threeDContainer.style.cursor = "default";
        }
      }
    }
  }

  // Helper to check if any modal is currently visible
  isAnyModalOpen() {
    const previewOpen =
      this.photoPreview && this.photoPreview.style.display !== "none";
    const controlsOpen =
      this.controlsInfoModal && this.controlsInfoModal.style.display !== "none";
    const settingsOpen =
      this.settingsModal && this.settingsModal.style.display !== "none";
    return previewOpen || controlsOpen || settingsOpen;
  }
}
