// Picture3D/js/metadataParser.js

// Assuming exifreader.js (or exifreader.min.js) is in the js/lib/ directory
// We import the library here using the relative path.
// If you downloaded 'exifreader.min.js', change the import path accordingly.
import ExifReader from './lib/exifreader.js'; // Import the library

/**
 * Parses metadata from an image file.
 */
export class MetadataParser {
    /**
     * Parses the metadata from a given file.
     * @param {File} file - The image file to parse.
     * @returns {Promise<object|null>} - A promise that resolves with the metadata object, or null if an error occurred.
     */
    async parseMetadata(file) {
        try {
            const buffer = await file.arrayBuffer();
            const tags = await ExifReader.load(buffer);

            if (!tags) {
                console.warn('No EXIF data found in the image.');
                return null;
            }

            // Extract relevant metadata
            const metadata = {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                dateTimeOriginal: tags['DateTimeOriginal'] ? tags['DateTimeOriginal'].value : null,
                make: tags['Make'] ? tags['Make'].description : null,
                model: tags['Model'] ? tags['Model'].description : null,
                lensModel: tags['LensModel'] ? tags['LensModel'].description : null,
                focalLength: tags['FocalLength'] ? tags['FocalLength'].description : null,
                fNumber: tags['FNumber'] ? tags['FNumber'].description : null,
                exposureTime: tags['ExposureTime'] ? tags['ExposureTime'].description : null,
                iso: tags['ISO'] ? tags['ISO'].description : null,

                // Example: GPS Data
                // exifreader provides lat/lon/altitude directly if available
                latitude: tags['GPSLatitude'] ? tags['GPSLatitude'].description : null,
                longitude: tags['GPSLongitude'] ? tags['GPSLongitude'].description : null,
                altitude: tags['GPSAltitude'] ? tags['GPSAltitude'].description : null,

                // You can add more metadata fields here based on your needs and what the library provides.
                // Refer to exifreader documentation for a full list of possible tags:
            };

            return metadata;

        } catch (error) {
            console.error('Error parsing metadata:', error);
            return null;
        }
    }
}
