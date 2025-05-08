/**
 * Manages the collection of photo metadata.
 */
class DataManager {
    /**
     * Initializes the data manager with an empty collection of photos.
     */
    constructor() {
        this.photos = []; // Or use a Map if you need to key by filename or similar
    }

    addPhoto(metadata) {
        this.photos.push(metadata);
    }

    getPhotos() {
        return this.photos;
    }

    getTotalPhotos() {
        return this.photos.length;
    }
}

export { DataManager };
