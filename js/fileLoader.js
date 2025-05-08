// Picture3D/js/fileLoader.js

import { MetadataParser } from "./metadataParser.js";

/**
 * Handles loading files from the user's file system via browser input.
 * Reads image files and extracts metadata.
 */
class FileLoader {
  constructor() {
    // We will create a new MetadataParser instance for each parsing operation
    // This keeps the FileLoader focused on file system interaction and coordination.
  }

  /**
   * Reads the selected files from a FileList, filters image files,
   * parses their metadata, and adds it to the DataManager.
   * Displays loading progress via UIHandler.
   * @param {FileList} fileList - The list of files selected by the user.
   * @param {DataManager} dataManager - The instance of DataManager to store metadata.
   * @param {UIHandler} uiHandler - The instance of UIHandler to update the UI.
   */
  async readFiles(fileList, dataManager, uiHandler) {
    console.log(`FileLoader: Starting to read ${fileList.length} files.`);
    const metadataParser = new MetadataParser(); // Instantiate MetadataParser

    const imageFiles = [];
    // First pass: Filter for potential image files
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Simple check: starts with 'image/' MIME type or has a common image extension
      if (
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|tif|tiff|heic|heif)$/i.test(file.name)
      ) {
        imageFiles.push(file);
      } else {
        console.log(
          `FileLoader: Skipping non-image file: ${file.name} (${file.type})`,
        );
      }
    }

    console.log(
      `FileLoader: Found ${imageFiles.length} potential image files.`,
    );

    if (imageFiles.length === 0) {
      uiHandler.showLoading("No image files found.");
      // Optionally hide loading after a delay or wait for user action
      setTimeout(() => uiHandler.hideLoading(), 2000);
      console.log("FileLoader: No image files to process.");
      return; // Exit if no images
    }

    uiHandler.showLoading(`Scanning ${imageFiles.length} photos...`);

    // Second pass: Parse metadata for image files
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      uiHandler.showLoading(
        `Scanning photo ${i + 1} of ${imageFiles.length}: ${file.name}`,
      ); // Update progress

      try {
        const metadata = await metadataParser.parseMetadata(file);

        // Add original file properties to metadata for later access
        if (metadata) {
          metadata.originalFile = file; // Store the File object
          metadata.filePath = file.webkitRelativePath || file.name; // Store the path/name
          dataManager.addPhoto(metadata);
          console.log(
            `FileLoader: Successfully parsed metadata for ${file.name}`,
          );
        } else {
          console.warn(
            `FileLoader: Could not parse meaningful metadata for ${file.name}. Skipping.`,
          );
          // Optionally add placeholder metadata or skip
        }
      } catch (error) {
        console.error(`FileLoader: Error processing file ${file.name}:`, error);
        // Continue with the next file even if one fails
      }
    }

    console.log(
      `FileLoader: Finished reading and parsing files. Total photos indexed: ${dataManager.getTotalPhotos()}`,
    );
    uiHandler.hideLoading(); // Hide loading indicator when done
  }
}

export { FileLoader };
