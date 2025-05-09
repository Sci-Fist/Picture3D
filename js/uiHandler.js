// js/uiHandler.js

export class UIHandler {
  constructor() {
    console.log("UIHandler constructor called");
    // Get references to all necessary UI elements
    this.folderSelector = document.getElementById("folder-selector");
    this.clearButton = document.getElementById("clear-selection");
    this.showControlsButton = document.getElementById("show-controls");
    this.showSettingsButton = document.getElementById("show-settings");
    this.loadingIndicator = document.getElementById("loading-indicator");

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

    // Perform initial checks to ensure elements were found
    if (!this.folderSelector)
      console.error("UIHandler: #folder-selector not found.");
    if (!this.clearButton)
      console.error("UIHandler: #clear-selection not found.");
    if (!this.showControlsButton)
      console.error("UIHandler: #show-controls not found.");
    if (!this.showSettingsButton)
      console.error("UIHandler: #show-settings not found.");
    if (!this.loadingIndicator)
      console.warn("UIHandler: #loading-indicator not found.");
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
  }

  bindFileSelector(callback) {
    if (this.folderSelector) {
      this.folderSelector.addEventListener("change", (event) => {
        if (event && event.target && event.target.files) {
          if (event.target.files.length > 0) {
            callback(event.target.files);
            event.target.value = null;
          } else {
            console.log(
              "UIHandler: File input change detected, but no files selected.",
            );
            callback([]);
          }
        } else {
          console.error(
            "UIHandler: File input change event structure unexpected.",
          );
          callback([]);
        }
      });
      console.log("File selector bound.");
    } else {
      console.error(
        "UIHandler: File selector element not found during binding.",
      );
    }
  }

  bindClearButton(callback) {
    if (this.clearButton) {
      this.clearButton.addEventListener("click", () => {
        console.log("Clear selection button clicked.");
        callback();
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

  bindShowControlsButton(callback) {
    if (this.showControlsButton) {
      this.showControlsButton.addEventListener("click", () => {
        console.log("Show controls button clicked.");
        callback();
      });
      console.log("Show controls button bound.");
    } else {
      console.error(
        "UIHandler: Show controls button element not found during binding.",
      );
    }
  }

  bindShowSettingsButton(callback) {
    if (this.showSettingsButton) {
      this.showSettingsButton.addEventListener("click", () => {
        console.log("Show settings button clicked.");
        callback();
      });
      console.log("Show settings button bound.");
    } else {
      console.error(
        "UIHandler: Show settings button element not found during binding.",
      );
    }
  }

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
          callback(event.target.value);
        }
      });
      console.log("Visualization mode change listener bound.");
    } else {
      console.error(
        "UIHandler: Visualization mode options div not found during binding.",
      );
    }
  }

  showLoading(message = "Loading...") {
    if (this.loadingIndicator) {
      const pElement = this.loadingIndicator.querySelector("p");
      if (pElement) {
        pElement.textContent = message;
      } else {
        this.loadingIndicator.textContent = message;
      }
      this.loadingIndicator.style.display = "flex";

      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "wait";
      }
      this.hidePreview();
      this.hideControlsInfo();
      this.hideSettings();
    }
  }

  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = "none";
    }
    if (!this.isAnyModalOpen()) {
      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "default";
      }
    }
  }

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
