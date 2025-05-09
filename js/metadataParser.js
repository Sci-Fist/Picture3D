// js/metadataParser.js

// Import ExifReader as a module from the 'exif-reader' package installed via npm
// Use the correct package name 'exif-reader' and the default export style
import ExifReader from "exif-reader";

export class MetadataParser {
  constructor() {
    console.log("MetadataParser constructor called");

    // Check if ExifReader was imported successfully and is a function
    this.isExifReaderAvailable = typeof ExifReader === "function";

    console.log("Debugging ExifReader availability:");
    console.log("typeof ExifReader:", typeof ExifReader); // Log the imported variable itself
    // Now we check if the imported variable itself is the expected function
    if (this.isExifReaderAvailable) {
      console.log("ExifReader is available and is a function.");
    } else {
      // This error should ideally not happen if the import succeeded
      console.error(
        "MetadataParser: ExifReader was not imported as a function. Metadata parsing will fail.",
      );
    }
    console.log("--- End Debugging Logs ---");
  }

  async parseMetadata(file) {
    // Check before attempting to use ExifReader
    if (!this.isExifReaderAvailable) {
      console.error(
        "MetadataParser: ExifReader is not available or not a function. Cannot parse metadata.",
      );
      // Return basic info even if metadata parsing library is missing
      const basicMetadataUnavailable = {
        name: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        src: URL.createObjectURL(file),
        date: new Date(file.lastModified), // Fallback date
        gps: null,
        make: null,
        model: null,
        imageWidth: null,
        imageHeight: null,
        orientation: null,
        revokeObjectURL: () => {
          if (basicMetadataUnavailable.src) {
            URL.revokeObjectURL(basicMetadataUnavailable.src);
            basicMetadataUnavailable.src = null;
          }
        },
      };
      return basicMetadataUnavailable;
    }

    // For safety, ensure we are only trying to parse image files
    // exif-reader itself will error on non-image data anyway, but this is a good check
    if (!file.type.startsWith("image/")) {
      console.warn(`MetadataParser: Skipping non-image file: ${file.name}`);
      // Return basic info for non-image files too
      const basicMetadataNonImage = {
        name: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        src: URL.createObjectURL(file), // Still create URL for preview/display if needed
        date: new Date(file.lastModified), // Fallback date
        gps: null,
        make: null,
        model: null,
        imageWidth: null,
        imageHeight: null,
        orientation: null,
        revokeObjectURL: () => {
          if (basicMetadataNonImage.src) {
            URL.revokeObjectURL(basicMetadataNonImage.src);
            basicMetadataNonImage.src = null;
          }
        },
      };
      return basicMetadataNonImage;
    }

    // Read the file content as an ArrayBuffer (raw binary data)
    return new Promise((resolve) => {
      // Wrap the file reading in a Promise
      const reader = new FileReader();

      reader.onload = async (event) => {
        // Use async here because ExifReader might return a Promise
        try {
          const arrayBuffer = event.target.result;
          // Create a DataView from the ArrayBuffer
          const dataView = new DataView(arrayBuffer);

          // Pass the DataView (raw bytes) to the ExifReader function
          // Await the result, as exif-reader can sometimes return a Promise
          const tags = await ExifReader(dataView);

          // --- Extracting specific metadata ---
          // (Keep the extraction logic as it was, it seems correct for the tags structure)
          const metadata = {
            name: file.webkitRelativePath || file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            src: URL.createObjectURL(file),

            date: null,
            gps: null,
            make: null,
            model: null,
            imageWidth: null,
            imageHeight: null,
            orientation: null,
            exposureTime: null,
            fNumber: null,
            isoSpeedRatings: null,
            focalLength: null,
            lensModel: null,

            revokeObjectURL: () => {
              if (metadata.src) {
                URL.revokeObjectURL(metadata.src);
                metadata.src = null;
              }
            },
          };

          const getTagDescription = (tagsGroup, tagName) =>
            tagsGroup?.[tagName]?.description ?? null;
          const getTagRawValue = (tagsGroup, tagName) =>
            tagsGroup?.[tagName]?.value ?? null;

          metadata.make =
            getTagDescription(tags.Image, "Make") ||
            getTagDescription(tags.Photo, "LensMake");
          metadata.model =
            getTagDescription(tags.Image, "Model") ||
            getTagDescription(tags.Photo, "LensModel");

          metadata.imageWidth =
            getTagRawValue(tags.Photo, "PixelXDimension") ||
            getTagRawValue(tags.Image, "ImageWidth");
          metadata.imageHeight =
            getTagRawValue(tags.Photo, "PixelYDimension") ||
            getTagRawValue(tags.Image, "ImageLength");

          metadata.orientation = getTagRawValue(tags.Image, "Orientation");

          metadata.exposureTime = getTagDescription(tags.Photo, "ExposureTime");
          metadata.fNumber = getTagDescription(tags.Photo, "FNumber");
          metadata.isoSpeedRatings = getTagRawValue(
            tags.Photo,
            "ISOSpeedRatings",
          );
          metadata.focalLength = getTagDescription(tags.Photo, "FocalLength");
          metadata.lensModel = getTagDescription(tags.Photo, "LensModel");

          metadata.date =
            getTagRawValue(tags.Photo, "DateTimeOriginal") ||
            getTagRawValue(tags.Photo, "DateTimeDigitized") ||
            getTagRawValue(tags.Image, "DateTime");

          if (
            !metadata.date ||
            !(metadata.date instanceof Date) ||
            isNaN(metadata.date.getTime())
          ) {
            metadata.date = new Date(file.lastModified);
            // Only warn if there was EXIF data but no valid date tags
            if (Object.keys(tags).length > 0) {
              console.warn(
                `MetadataParser: Could not find/parse EXIF date tags for ${file.name}. Using file modification date.`,
              );
            } else {
              // No EXIF data at all
              console.warn(
                `MetadataParser: No EXIF data found for ${file.name}. Using file modification date.`,
              );
            }
          }

          if (
            tags.gps &&
            typeof tags.gps.Latitude === "number" &&
            typeof tags.gps.Longitude === "number"
          ) {
            metadata.gps = {
              latitude: tags.gps.Latitude,
              longitude: tags.gps.Longitude,
              altitude: getTagRawValue(tags.gps, "GPSAltitude"),
              latitudeDescription: getTagDescription(
                tags.GPSInfo,
                "GPSLatitude",
              ),
              longitudeDescription: getTagDescription(
                tags.GPSInfo,
                "GPSLongitude",
              ),
              altitudeDescription: getTagDescription(
                tags.GPSInfo,
                "GPSAltitude",
              ),
            };
          }

          // Resolve the promise with the complete metadata object
          resolve(metadata);
        } catch (error) {
          // Catch errors during ExifReader call or metadata extraction
          console.error(
            `MetadataParser: Failed to process metadata for ${file.name}:`,
            error,
          );
          // Return basic info even if detailed metadata parsing fails
          const basicMetadataError = {
            name: file.webkitRelativePath || file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            src: URL.createObjectURL(file),
            date: new Date(file.lastModified), // Fallback date
            gps: null,
            make: null,
            model: null,
            imageWidth: null,
            imageHeight: null,
            orientation: null,
            revokeObjectURL: () => {
              if (basicMetadataError.src) {
                URL.revokeObjectURL(basicMetadataError.src);
                basicMetadataError.src = null;
              }
            },
          };
          // Resolve the promise with the basic metadata
          resolve(basicMetadataError);
        }
      };

      reader.onerror = (event) => {
        console.error(
          `MetadataParser: Error reading file ${file.name} with FileReader:`,
          event.target.error,
        );
        // Return basic info if FileReader fails
        const basicMetadataFileReaderError = {
          name: file.webkitRelativePath || file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified),
          src: URL.createObjectURL(file),
          date: new Date(file.lastModified), // Fallback date
          gps: null,
          make: null,
          model: null,
          imageWidth: null,
          imageHeight: null,
          orientation: null,
          revokeObjectURL: () => {
            if (basicMetadataFileReaderError.src) {
              URL.revokeObjectURL(basicMetadataFileReaderError.src);
              basicMetadataFileReaderError.src = null;
            }
          },
        };
        // Resolve the promise with the basic metadata
        resolve(basicMetadataFileReaderError);
      };

      // Start reading the file content as an ArrayBuffer
      reader.readAsArrayBuffer(file);
    });
  }
}
