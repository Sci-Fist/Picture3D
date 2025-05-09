// js/metadataParser.js

// Import exifr as a module from the 'exifr' package installed via npm
import exifr from "exifr";

export class MetadataParser {
  constructor() {
    console.log("MetadataParser constructor called");

    // Check if exifr was imported successfully and has the 'parse' method
    this.isExifrAvailable =
      typeof exifr !== "undefined" && typeof exifr.parse === "function";

    console.log("Debugging exifr availability:");
    console.log("typeof exifr:", typeof exifr); // Log the imported variable itself
    console.log("typeof exifr.parse:", typeof exifr.parse); // Log the type of the parse method

    if (this.isExifrAvailable) {
      console.log("exifr is available and its parse method is present.");
    } else {
      console.error(
        "MetadataParser: exifr was not imported or its parse method is missing. Metadata parsing will fail.",
      );
    }
    console.log("--- End Debugging Logs ---");
  }

  async parseMetadata(file) {
    // Check before attempting to use exifr
    if (!this.isExifrAvailable) {
      console.error(
        "MetadataParser: exifr is not available or not a function. Cannot parse metadata.",
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

    // For safety, ensure we are only trying to process image files (exifr handles this internally too)
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

    try {
      // Use exifr.parse() with the File object directly.
      // Request specific segments to parse for better performance/control.
      // parse: true tells exifr to parse known tags into friendly names/formats.
      const tags = await exifr.parse(file, {
        exif: true,
        gps: true,
        xmp: true,
        iptc: true,
        png: true, // Include PNG-specific metadata segments
        parse: true, // Parse known tags
        // Add other segments if needed, e.g., icc: true, photoshop: true
      });

      // exifr.parse() returns undefined if no metadata is found or if file type isn't supported
      if (!tags) {
        console.warn(
          `MetadataParser: No parsable metadata found for ${file.name}.`,
        );
        // Return basic info if no metadata is found
        const basicMetadataNoTags = {
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
            if (basicMetadataNoTags.src) {
              URL.revokeObjectURL(basicMetadataNoTags.src);
              basicMetadataNoTags.src = null;
            }
          },
        };
        return basicMetadataNoTags;
      }

      // --- Extracting specific metadata from exifr's output structure ---
      // exifr often returns a flat object or an object with segment names (exif, gps, xmp etc.)
      // Let's adapt the extraction to look in common places exifr puts data.

      // Helper to safely get a tag value from potentially nested structures
      const getExifrTag = (tagsObj, ...path) => {
        let current = tagsObj;
        for (const key of path) {
          if (
            current === null ||
            typeof current !== "object" ||
            !(key in current)
          ) {
            return null; // Path doesn't exist
          }
          current = current[key];
        }
        return current; // Return the value found at the end of the path
      };

      const metadata = {
        name: file.webkitRelativePath || file.name,
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

      // --- Extracting data using the getExifrTag helper ---

      // Basic camera info (often in Image or Exif segment)
      metadata.make =
        getExifrTag(tags, "make") || getExifrTag(tags, "exif", "Make"); // exifr often puts common tags at the top level
      metadata.model =
        getExifrTag(tags, "model") || getExifrTag(tags, "exif", "Model");

      // Image dimensions (often in Image or Exif segment)
      // exifr might put these at the top level or in the exif segment
      metadata.imageWidth =
        getExifrTag(tags, "imageWidth") ||
        getExifrTag(tags, "exif", "PixelXDimension") ||
        getExifrTag(tags, "exif", "ImageWidth");
      metadata.imageHeight =
        getExifrTag(tags, "imageHeight") ||
        getExifrTag(tags, "exif", "PixelYDimension") ||
        getExifrTag(tags, "exif", "ImageLength");

      // Orientation (often in Image segment)
      metadata.orientation =
        getExifrTag(tags, "orientation") ||
        getExifrTag(tags, "exif", "Orientation");

      // Photo settings (often in Photo or Exif segment)
      metadata.exposureTime =
        getExifrTag(tags, "exposureTime") ||
        getExifrTag(tags, "exif", "ExposureTime");
      metadata.fNumber =
        getExifrTag(tags, "fNumber") || getExifrTag(tags, "exif", "FNumber");
      metadata.isoSpeedRatings =
        getExifrTag(tags, "iso") ||
        getExifrTag(tags, "exif", "ISOSpeedRatings");
      metadata.focalLength =
        getExifrTag(tags, "focalLength") ||
        getExifrTag(tags, "exif", "FocalLength");
      metadata.lensModel =
        getExifrTag(tags, "lensModel") ||
        getExifrTag(tags, "exif", "LensModel");

      // Date/Time (often in Exif segment)
      // exifr parses these into Date objects automatically with parse: true
      metadata.date =
        getExifrTag(tags, "dateOriginal") ||
        getExifrTag(tags, "dateDigitized") ||
        getExifrTag(tags, "dateTimeOriginal") ||
        getExifrTag(tags, "dateTimeDigitized") ||
        getExifrTag(tags, "exif", "DateTimeOriginal") ||
        getExifrTag(tags, "exif", "DateTimeDigitized") ||
        getExifrTag(tags, "exif", "DateTime");

      // Fallback to file modified date if no EXIF date is found or if it's invalid
      if (
        !metadata.date ||
        !(metadata.date instanceof Date) ||
        isNaN(metadata.date.getTime())
      ) {
        metadata.date = new Date(file.lastModified);
        // Only warn if exifr returned tags but no valid date tags were found
        if (Object.keys(tags).length > 0) {
          console.warn(
            `MetadataParser: Could not find/parse EXIF date tags for ${file.name} using exifr. Using file modification date.`,
          );
        } else {
          // This case should be covered by the !tags check earlier, but kept for safety
          console.warn(
            `MetadataParser: No metadata found for ${file.name} using exifr. Using file modification date.`,
          );
        }
      }

      // GPS data (often in GPS segment)
      // exifr puts parsed lat/lon directly on the tags.gps object with parse: true
      if (
        tags.gps &&
        typeof tags.gps.latitude === "number" &&
        typeof tags.gps.longitude === "number"
      ) {
        metadata.gps = {
          latitude: tags.gps.latitude, // Already a number
          longitude: tags.gps.longitude, // Already a number
          altitude: tags.gps.altitude || null, // Should also be a number if present
          // Keep descriptions if exifr provides them and you need them for display
          latitudeDescription: tags.gps.GPSLatitude || null, // Raw/formatted string description might be here
          longitudeDescription: tags.gps.GPSLongitude || null, // Raw/formatted string description might be here
          altitudeDescription: tags.gps.GPSAltitude || null, // Raw/formatted string description might be here
        };
        // exifr handles refs (N/S/E/W) in its numerical parsing.
      }

      // Return the compiled metadata object
      return metadata;
    } catch (error) {
      // Catch any errors during exifr.parse or subsequent extraction
      console.error(
        `MetadataParser: Failed to process metadata for ${file.name} using exifr:`,
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
      return basicMetadataError; // Note: No need to wrap in Promise as catch in async fn returns a resolved Promise
    }
  }
}
