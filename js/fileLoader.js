import { MetadataParser } from './metadataParser.js';

class FileLoader {
    async readFiles(fileList, dataManager, uiHandler, onCompleteCallback) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tif', '.tiff', '.heic', '.heif'];
        const metadataParser = new MetadataParser();
        let processedCount = 0;
        const totalFiles = fileList.length;
        let imageCount = 0; // Count of image files

        uiHandler.showLoading(`Scanning ${totalFiles} files...`);
        console.log('FileLoader: Starting to process files.');

        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                console.log(`FileLoader: Processing file ${i + 1} of ${totalFiles}: ${file.name}`);

                if (file.type.startsWith('image/') || imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
                    imageCount++; // Increment image count
                    try {
                        const metadata = await metadataParser.parseMetadata(file);

                        if (metadata) {
                            dataManager.addPhoto(metadata);
                            console.log(`FileLoader: Metadata parsed and added for ${file.name}`);
                        } else {
                            console.warn(`FileLoader: Error parsing metadata for ${file.name}`);
                        }
                    } catch (error) {
                        console.error(`FileLoader: Error processing ${file.name}:`, error);
                    }
                } else {
                    console.log(`FileLoader: Skipping ${file.name} - not an image`);
                }
                processedCount++;
            }
        } catch (error) {
            console.error('FileLoader: An unexpected error occurred during file processing:', error);
        } finally {
            uiHandler.hideLoading();
            console.log(`FileLoader: File processing complete. Processed ${processedCount} of ${totalFiles} files.  Found ${imageCount} images.`);
            if (onCompleteCallback) {
                onCompleteCallback();
            }
        }
    }
}

export { FileLoader };
