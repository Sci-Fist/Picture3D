/**
 * Handles UI interactions and updates.
 */
class UIHandler {
    /**
     * Initializes the UIHandler, getting references to key elements.
     */
    init() {
        this.folderSelector = document.getElementById('folder-selector');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.photoPreview = document.getElementById('photo-preview');
        this.previewImage = document.getElementById('preview-image');
        this.metadataDisplay = document.getElementById('metadata-display');
        this.closePreviewBtn = document.getElementById('close-preview');
    }

    /**
     * Binds a callback function to the file selector's change event.
     * @param {function} callback - The function to call when files are selected.
     */
    bindFileSelector(callback) {
        if (this.folderSelector) {
            this.folderSelector.addEventListener('change', (event) => {
                callback(event.target.files);
            });
        } else {
            console.error('UIHandler: folder-selector element not found.');
        }
    }

    /**
     * Shows the loading indicator with an optional message.
     * @param {string} message - The message to display.
     */
    showLoading(message) {
        if (this.loadingIndicator) {
            this.loadingIndicator.textContent = message || 'Loading...';
            this.loadingIndicator.style.display = 'block';
        } else {
            console.warn('UIHandler: loading-indicator element not found.');
        }
    }

    /**
     * Hides the loading indicator.
     */
    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Shows the photo preview with the image and metadata.
     * @param {string} imageUrl - The URL of the image.
     * @param {object} metadata - The metadata object.
     */
    showPreview(imageUrl, metadata) {
        if (this.photoPreview && this.previewImage && this.metadataDisplay) {
            this.previewImage.src = imageUrl;
            this.metadataDisplay.innerHTML = this.formatMetadata(metadata); // Use a helper method
            this.photoPreview.style.display = 'block';
        }
    }

    /**
     * Hides the photo preview.
     */
    hidePreview() {
        if (this.photoPreview) {
            this.photoPreview.style.display = 'none';
        }
    }

    /**
     * Formats the metadata object into HTML for display.
     * @param {object} metadata - The metadata object.
     * @returns {string} The HTML string.
     */
    formatMetadata(metadata) {
        if (!metadata) return '<p>No metadata available.</p>';

        let html = '';
        for (const key in metadata) {
            if (metadata.hasOwnProperty(key) && metadata[key] !== null && metadata[key] !== undefined) {
                html += `<p><b>${key}:</b> ${metadata[key]}</p>`;
            }
        }
        if (html === '') {
            return '<p>No metadata available.</p>';
        }
        return html;
    }

    /**
     * Binds a callback function to the close preview button's click event.
     * @param {function} callback - The function to call when the button is clicked.
     */
    bindClosePreview(callback) {
        if (this.closePreviewBtn) {
            this.closePreviewBtn.addEventListener('click', callback);
        }
    }
}

export { UIHandler };
