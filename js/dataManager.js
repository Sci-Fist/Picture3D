// js/dataManager.js
export class DataManager {
  constructor() {
    this.photos = new Map(); // Using a Map for easy lookup by name
    console.log("DataManager constructor called");
  }

  // Adds parsed photo metadata to the index
  addPhoto(metadata) {
    // Assuming metadata includes a unique identifier like 'name' (the filename)
    if (metadata && metadata.name) {
      this.photos.set(metadata.name, metadata);
      // console.log(`DataManager: Added photo metadata for ${metadata.name}`); // Too verbose
    } else {
      console.warn(
        "DataManager: Attempted to add photo with missing metadata or name",
        metadata,
      );
    }
  }

  // Gets all photos in the index
  getAllPhotos() {
    return Array.from(this.photos.values());
  }

  // Gets a single photo by its unique identifier (name)
  getPhoto(photoName) {
    return this.photos.get(photoName);
  }

  // Get photos relevant to the current view (Placeholder for dynamic loading logic)
  // In MVP, this just returns all photos. Later, it would filter based on camera position/frustum
  getPhotosInView(cameraPosition, viewDistance) {
    // For MVP, let's simply return all photos.
    // In a real implementation, this would involve spatial querying.
    return this.getAllPhotos();
  }

  // Returns the total number of indexed photos
  getTotalPhotos() {
    return this.photos.size;
  }

  // Clear all photos
  clearPhotos() {
    this.photos.clear();
    console.log("DataManager: Cleared all photo data.");
  }
}
