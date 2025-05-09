// js/uiHandler.js

export class UIHandler {
  constructor() {
    this.folderSelector = document.getElementById("folder-selector");
    this.clearButton = document.getElementById("clear-selection");
    this.loadingIndicator = document.getElementById("loading-indicator");
    this.photoPreview = document.getElementById("photo-preview");
    this.previewImage = document.getElementById("preview-image");
    this.metadataDisplay = document.getElementById("metadata-display");
    this.closePreviewButton = document.getElementById("close-preview");
    this.threeDContainer = document.getElementById("3d-container"); // Need this for cursor control

    console.log("UIHandler constructor called");
  }

  init() {
    // Add initial event listeners here if needed, but binding is done in main.js
    console.log("UIHandler initialized.");

    // Add listener to close preview button
    this.closePreviewButton.addEventListener(
      "click",
      this.hidePreview.bind(this),
    );

    // Listen for the custom event dispatched by ThreeSceneManager on photo click
    window.addEventListener("photoClicked", (event) => {
      this.showPreview(event.detail);
    });
  }

  bindFileSelector(callback) {
    if (this.folderSelector) {
      this.folderSelector.addEventListener("change", (event) => {
        if (event.target.files.length > 0) {
          // Call the provided callback with the selected files
          callback(event.target.files);
          // Clear the file input value so the same folder can be selected again
          event.target.value = null;
        }
      });
      console.log("File selector bound.");
    } else {
      console.error("File selector element not found.");
    }
  }

  bindClearButton(callback) {
    if (this.clearButton) {
      this.clearButton.addEventListener("click", () => {
        console.log("Clear selection button clicked.");
        // Call the provided callback
        callback();
        // Optional: Reset UI states if necessary
        this.hidePreview();
      });
      console.log("Clear button bound.");
    } else {
      console.error("Clear button element not found.");
    }
  }

  showLoading(message = "Loading...") {
    if (this.loadingIndicator) {
      this.loadingIndicator.querySelector("p").textContent = message;
      this.loadingIndicator.style.display = "flex"; // Use flex for centering
    }
  }

  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = "none";
    }
  }

  showPreview(photoMetadata) {
    if (this.photoPreview && this.previewImage && this.metadataDisplay) {
      this.previewImage.src = photoMetadata.src;
      this.previewImage.alt = `Preview of ${photoMetadata.name}`;

      // Format and display metadata
      let metadataHtml = `<h2>${photoMetadata.name}</h2>`;
      metadataHtml += `<p><strong>Date:</strong> ${photoMetadata.date ? photoMetadata.date.toLocaleString() : "N/A"}</p>`;
      if (photoMetadata.make || photoMetadata.model) {
        metadataHtml += `<p><strong>Camera:</strong> ${photoMetadata.make || ""} ${photoMetadata.model || ""}</p>`;
      }
      if (
        photoMetadata.gps &&
        photoMetadata.gps.latitudeValue !== null &&
        photoMetadata.gps.longitudeValue !== null
      ) {
        metadataHtml += `<p><strong>GPS:</strong> Lat ${photoMetadata.gps.latitudeValue.toFixed(4)}, Lon ${photoMetadata.gps.longitudeValue.toFixed(4)}</p>`;
        // Optional: Link to a map
        metadataHtml += `<p><a href="https://www.google.com/maps/search/?api=1&query=${photoMetadata.gps.latitudeValue},${photoMetadata.gps.longitudeValue}" target="_blank">View on Map</a></p>`;
      }
      if (photoMetadata.imageWidth && photoMetadata.imageHeight) {
        metadataHtml += `<p><strong>Dimensions:</strong> ${photoMetadata.imageWidth}x${photoMetadata.imageHeight}</p>`;
      }
      // Add more metadata fields as needed
      metadataHtml += `<p><strong>File Size:</strong> ${(photoMetadata.size / 1024).toFixed(2)} KB</p>`;

      this.metadataDisplay.innerHTML = metadataHtml;
      this.photoPreview.style.display = "block"; // Show the preview

      // Hide the 3D container's grab cursor when preview is open
      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "default";
      }
    }
  }

  hidePreview() {
    if (this.photoPreview && this.previewImage && this.metadataDisplay) {
      this.photoPreview.style.display = "none";
      this.previewImage.src = ""; // Clear image source
      this.metadataDisplay.innerHTML = ""; // Clear metadata display

      // Restore the 3D container's grab cursor
      if (this.threeDContainer) {
        this.threeDContainer.style.cursor = "grab";
      }
    }
  }
}
