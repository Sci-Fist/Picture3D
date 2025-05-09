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
        "ExifReader was not imported as a function. Metadata parsing will fail.",
      );
    }
    console.log("--- End Debugging Logs ---");
  }

  async parseMetadata(file) {
    // Check again before attempting to use ExifReader
    if (!this.isExifReaderAvailable) {
      console.error(
        "MetadataParser: ExifReader is not available or not a function. Cannot parse metadata.",
      );
      return null; // Return null or throw an error if parsing cannot proceed
    }

    // For safety, ensure we are only trying to parse image files
    if (!file.type.startsWith("image/")) {
      console.warn(`MetadataParser: Skipping non-image file: ${file.name}`);
      return null;
    }

    try {
      // Use the imported ExifReader function directly with the File object
      const tags = await ExifReader(file); // <--- CORRECT USAGE HERE

      // --- Extracting specific metadata ---
      // The structure of the 'tags' object comes from the exif-reader library.
      // Based on the library's README, tags are grouped (e.g., tags.Image, tags.Photo, etc.)
      // We need to access the specific tags within these groups.

      const metadata = {
        name: file.webkitRelativePath || file.name, // Get the full path or just the name
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified), // File object provides this
        src: URL.createObjectURL(file), // Create a temporary URL for displaying

        // Initialize potential metadata fields
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

        // Add a method to revoke the temporary URL when done
        revokeObjectURL: () => {
          if (metadata.src) {
            URL.revokeObjectURL(metadata.src);
            metadata.src = null; // Clear the reference
          }
        },
      };

      // Helper to safely get a tag value and its description if they exist
      // Note: exif-reader often puts parsed numerical values directly on tags.gps
      // and formatted/raw values on tags.GPSInfo or in the tag object itself.
      // Adjust extraction based on the library's specific output structure.
      const getTagDescription = (tagsGroup, tagName) =>
        tagsGroup?.[tagName]?.description ?? null;

      const getTagRawValue = (tagsGroup, tagName) =>
        tagsGroup?.[tagName]?.value ?? null; // Assuming 'value' property holds raw or parsed data

      // Extract common EXIF tags - Check the library's tags.js and README for exact structure
      // Based on node_modules\exif-reader\tags.js and README.md, these are generally correct
      metadata.make =
        getTagDescription(tags.Image, "Make") ||
        getTagDescription(tags.Photo, "LensMake"); // Check both possible locations
      metadata.model =
        getTagDescription(tags.Image, "Model") ||
        getTagDescription(tags.Photo, "LensModel"); // Check both possible locations

      // Image dimensions from EXIF
      metadata.imageWidth =
        getTagRawValue(tags.Photo, "PixelXDimension") ||
        getTagRawValue(tags.Image, "ImageWidth");
      metadata.imageHeight =
        getTagRawValue(tags.Photo, "PixelYDimension") ||
        getTagRawValue(tags.Image, "ImageLength");

      // Orientation (crucial for correctly displaying images rotated by the camera)
      metadata.orientation = getTagRawValue(tags.Image, "Orientation"); // Integer value (1, 6, 8, etc.)

      // Common photo settings
      metadata.exposureTime = getTagDescription(tags.Photo, "ExposureTime");
      metadata.fNumber = getTagDescription(tags.Photo, "FNumber");
      metadata.isoSpeedRatings = getTagRawValue(tags.Photo, "ISOSpeedRatings"); // Often raw value
      metadata.focalLength = getTagDescription(tags.Photo, "FocalLength");
      metadata.lensModel = getTagDescription(tags.Photo, "LensModel"); // Specific lens model tag

      // Parse Date/Time
      // exif-reader returns Date objects for DateTimeOriginal/Digitized/DateTime if successful
      metadata.date =
        getTagRawValue(tags.Photo, "DateTimeOriginal") ||
        getTagRawValue(tags.Photo, "DateTimeDigitized") ||
        getTagRawValue(tags.Image, "DateTime"); // Prioritize these tags

      // Fallback to file modified date if no EXIF date is found or if it's invalid
      if (
        !metadata.date ||
        !(metadata.date instanceof Date) ||
        isNaN(metadata.date.getTime())
      ) {
        metadata.date = new Date(file.lastModified);
        console.warn(
          `MetadataParser: No valid EXIF date metadata found for ${file.name} or parsing failed. Using file modification date.`,
        );
      }

      // Parse GPS data
      // Based on exif-reader README, numerical lat/lon are on tags.gps
      if (
        tags.gps &&
        typeof tags.gps.Latitude === "number" &&
        typeof tags.gps.Longitude === "number"
      ) {
        metadata.gps = {
          latitude: tags.gps.Latitude, // Already a number
          longitude: tags.gps.Longitude, // Already a number
          altitude: getTagRawValue(tags.gps, "GPSAltitude"), // Use raw value if available
          // Keep original descriptions if needed, though less useful than the number values
          latitudeDescription: getTagDescription(tags.GPSInfo, "GPSLatitude"), // Description might be here
          longitudeDescription: getTagDescription(tags.GPSInfo, "GPSLongitude"), // Description might be here
          altitudeDescription: getTagDescription(tags.GPSInfo, "GPSAltitude"), // Description might be here
        };
        // AltitudeRef is also typically handled by exif-reader's numerical parsing.
      }

      // Return the compiled metadata object
      return metadata;
    } catch (error) {
      // Catch any errors during ExifReader call or subsequent processing
      console.error(
        `MetadataParser: Failed to process metadata for ${file.name}:`,
        error,
      );
      // Return basic info even if detailed metadata processing fails
      const basicMetadata = {
        name: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        src: URL.createObjectURL(file),
        date: new Date(file.lastModified), // Fallback date to file modification date
        gps: null,
        make: null,
        model: null,
        imageWidth: null,
        imageHeight: null,
        orientation: null, // Other fields are null
        revokeObjectURL: () => {
          // Still provide the revoke function for the basic URL
          if (basicMetadata.src) {
            URL.revokeObjectURL(basicMetadata.src);
            basicMetadata.src = null;
          }
        },
      };
      return basicMetadata;
    }
  }
}
