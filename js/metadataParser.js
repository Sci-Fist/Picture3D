// js/metadataParser.js

// Import ExifReader as a module from the 'exif-reader' package installed via npm
// Use the correct package name 'exif-reader' and the default export style
import ExifReader from "exif-reader";

export class MetadataParser {
  constructor() {
    console.log("MetadataParser constructor called");

    // Check if ExifReader was imported successfully and has the 'load' method
    // This is the standard check when importing the default export
    this.isExifReaderAvailable =
      typeof ExifReader !== "undefined" &&
      typeof ExifReader.load === "function";

    console.log("Debugging ExifReader availability:");
    console.log("typeof ExifReader:", typeof ExifReader); // Log the imported variable itself
    console.log("typeof ExifReader.load:", typeof ExifReader.load); // Log the type of the load method
    if (this.isExifReaderAvailable) {
      console.log("ExifReader is available and its load method is present.");
    } else {
      // This error message helps debug if the import worked but the expected method is missing
      console.error(
        "ExifReader import seems to have succeeded, but the .load method is missing on the imported object. Check import statement or library structure.",
      );
    }
    console.log("--- End Debugging Logs ---");
  }

  async parseMetadata(file) {
    // Check again before attempting to use ExifReader.load
    if (!this.isExifReaderAvailable) {
      console.error(
        "MetadataParser: ExifReader or its load method not available. Cannot parse metadata.",
      );
      return null; // Return null or throw an error if parsing cannot proceed
    }

    // For safety, ensure we are only trying to parse image files
    if (!file.type.startsWith("image/")) {
      console.warn(`MetadataParser: Skipping non-image file: ${file.name}`);
      return null;
    }

    try {
      // The 'exif-reader' library expects a File object or a Buffer/DataView
      // The browser's File API gives us File objects, which the library handles.
      const tags = await ExifReader.load(file); // Use the imported ExifReader object

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
      const getTagValue = (tagsGroup, tagName, property = "description") =>
        tagsGroup?.[tagName]?.[property] ?? null;

      const getTagRawValue = (tagsGroup, tagName) =>
        tagsGroup?.[tagName]?.["value"] ?? null;

      // Extract common EXIF tags
      metadata.make =
        getTagValue(tags.Image, "Make") || getTagValue(tags.Photo, "LensMake"); // Check both possible locations
      metadata.model =
        getTagValue(tags.Image, "Model") ||
        getTagValue(tags.Photo, "LensModel"); // Check both possible locations

      // Image dimensions from EXIF (often more reliable than image.width/height before loading)
      // Check both possible locations and prioritize Pixel dimensions
      metadata.imageWidth =
        getTagRawValue(tags.Photo, "PixelXDimension") ||
        getTagRawValue(tags.Image, "ImageWidth");
      metadata.imageHeight =
        getTagRawValue(tags.Photo, "PixelYDimension") ||
        getTagRawValue(tags.Image, "ImageLength");

      // Orientation (crucial for correctly displaying images rotated by the camera)
      metadata.orientation = getTagRawValue(tags.Image, "Orientation"); // Integer value (1, 6, 8, etc.)

      // Common photo settings
      metadata.exposureTime = getTagValue(tags.Photo, "ExposureTime");
      metadata.fNumber = getTagValue(tags.Photo, "FNumber");
      metadata.isoSpeedRatings = getTagRawValue(tags.Photo, "ISOSpeedRatings"); // Often raw value
      metadata.focalLength = getTagValue(tags.Photo, "FocalLength");
      metadata.lensModel = getTagValue(tags.Photo, "LensModel"); // Specific lens model tag

      // Parse Date/Time (This often requires custom parsing as Date objects are not standard in EXIF)
      // Prefer DateTimeOriginal, then DateTimeDigitized, then DateTime, fallback to file.lastModified
      let dateStr = getTagValue(tags.Photo, "DateTimeOriginal"); // This is a string like "YYYY:MM:DD HH:MM:SS" or might already be a Date depending on the library version/parsing
      if (!dateStr && dateStr !== null) {
        // If DateTimeOriginal wasn't found or was null
        dateStr = getTagValue(tags.Photo, "DateTimeDigitized");
      }
      if (!dateStr && dateStr !== null) {
        // If DateTimeDigitized wasn't found or was null
        dateStr = getTagValue(tags.Image, "DateTime"); // DateTime in the Image group
      }

      if (dateStr && typeof dateStr === "string") {
        // Attempt to parse the EXIF string format "YYYY:MM:DD HH:MM:SS"
        // Need to convert "YYYY:MM:DD" to "YYYY-MM-DD" for Date constructor
        const formattedDateStr = dateStr.replace(/:/g, "-").replace(" ", "T"); // Replace first two : with - and space with T
        const parsedDate = new Date(formattedDateStr);

        if (!isNaN(parsedDate.getTime())) {
          metadata.date = parsedDate;
        } else {
          // If string parsing failed, fall back
          metadata.date = new Date(file.lastModified);
          console.warn(
            `MetadataParser: Could not parse EXIF date string "${dateStr}" for ${file.name}. Using file modification date.`,
          );
        }
      } else if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
        // If the library returned a Date object directly
        metadata.date = dateStr;
      } else {
        // If no EXIF date tags were found, fall back to the file's modification date
        metadata.date = new Date(file.lastModified);
        console.warn(
          `MetadataParser: No valid EXIF date metadata found for ${file.name}. Using file modification date.`,
        );
      }

      // Parse GPS data
      // exif-reader provides parsed GPS latitude and longitude as numbers under tags.gps.Latitude and tags.gps.Longitude
      // It also provides raw values and descriptions under tags.GPSInfo
      if (
        tags.gps &&
        typeof tags.gps.Latitude === "number" &&
        typeof tags.gps.Longitude === "number"
      ) {
        metadata.gps = {
          latitude: tags.gps.Latitude, // Already a number from exif-reader's parsing
          longitude: tags.gps.Longitude, // Already a number from exif-reader's parsing
          altitude: getTagRawValue(tags.gps, "GPSAltitude"), // Raw value
          // Keep original descriptions if needed, though less useful than the number values
          latitudeDescription: getTagValue(tags.GPSInfo, "GPSLatitude"),
          longitudeDescription: getTagValue(tags.GPSInfo, "GPSLongitude"),
          altitudeDescription: getTagValue(tags.GPSInfo, "GPSAltitude"),
        };
        // exif-reader handles N/S/E/W in its numerical parsing, so we don't need to check LatitudeRef/LongitudeRef here.
        // AltitudeRef is also typically handled if provided as a number.
      }

      // Return the compiled metadata object
      return metadata;
    } catch (error) {
      // Catch any errors during ExifReader.load or subsequent processing
      console.error(
        `MetadataParser: Failed to parse metadata for ${file.name}:`,
        error,
      );
      // Return basic info even if detailed metadata parsing fails
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
