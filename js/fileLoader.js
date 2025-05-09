// js/fileLoader.js
import { MetadataParser } from "./metadataParser.js"; // Assuming metadataParser is in the same directory

export class FileLoader {
  constructor() {
    console.log("FileLoader constructor called");
    this.metadataParser = new MetadataParser();
  }

  async readFiles(fileList, dataManager, uiHandler, onComplete) {
    console.log("FileLoader: Starting to process files.");
    uiHandler.showLoading("Scanning files...");

    const imageFiles = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Basic check for image files (you might want a more robust check)
      if (file.type.startsWith("image/")) {
        imageFiles.push(file);
      } else {
        console.log(
          `FileLoader: Skipping non-image file: ${file.name} (${file.type})`,
        );
      }
    }

    const totalImages = imageFiles.length;
    let processedCount = 0;

    for (const file of imageFiles) {
      processedCount++;
      uiHandler.showLoading(
        `Processing ${processedCount} of ${totalImages}: ${file.name}`,
      );
      console.log(
        `FileLoader: Processing file ${processedCount} of ${totalImages}: ${file.name}`,
      );

      try {
        const metadata = await this.metadataParser.parseMetadata(file);
        if (metadata) {
          dataManager.addPhoto(metadata);
          console.log(`FileLoader: Metadata parsed and added for ${file.name}`);
        } else {
          console.warn(
            `FileLoader: Could not parse metadata for ${file.name}. Skipping.`,
          );
        }
      } catch (error) {
        console.error(`FileLoader: Error processing file ${file.name}:`, error);
      }
    }

    console.log(
      `FileLoader: File processing complete. Processed ${processedCount} of ${totalImages} files. Found ${dataManager.getTotalPhotos()} images.`,
    );
    uiHandler.hideLoading();

    // Call the callback function provided by main.js
    if (onComplete) {
      onComplete();
    }
  }
}
