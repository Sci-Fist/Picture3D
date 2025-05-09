// js/metadataParser.js

// Assumes exifreader.js is loaded globally in index.html and provides a global 'ExifReader' object

export class MetadataParser {
  constructor() {
    console.log("MetadataParser constructor called");
    // Check if ExifReader is available
    this.isExifReaderAvailable = typeof window.ExifReader !== "undefined";

    console.log("Debugging ExifReader availability:");
    console.log("typeof window.ExifReader:", typeof window.ExifReader);
    if (this.isExifReaderAvailable) {
      console.log("window.ExifReader exists. Type:", typeof window.ExifReader);
      console.log("window.ExifReader:", window.ExifReader);
      console.log(
        "typeof window.ExifReader.load:",
        typeof window.ExifReader.load,
      );
    } else {
      console.error(
        "ExifReader is not available globally. Metadata parsing will fail.",
      );
    }
    console.log("--- End Debugging Logs ---");
  }

  async parseMetadata(file) {
    if (!this.isExifReaderAvailable) {
      console.error(
        "MetadataParser: ExifReader not loaded. Cannot parse metadata.",
      );
      return null;
    }

    try {
      // ExifReader.load accepts a File object directly
      const tags = await ExifReader.load(file);

      // Extract relevant information
      const metadata = {
        name: file.webkitRelativePath || file.name, // Use path if available, otherwise name
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        src: URL.createObjectURL(file), // Create a temporary URL for display/texture loading

        // --- Extracting specific metadata ---
        // Date/Time (Prioritize DateTimeOriginal, then DateTime)
        date: null,
        // GPS Location
        gps: null,
        // Camera Make/Model
        make: tags["Make"] ? tags["Make"].description : null,
        model: tags["Model"] ? tags["Model"].description : null,
        // Dimensions (from image itself or metadata)
        imageWidth: tags["Image Width"]
          ? tags["Image Width"].value
          : tags["PixelXDimension"]
            ? tags["PixelXDimension"].value
            : null,
        imageHeight: tags["Image Height"]
          ? tags["Image Height"].value
          : tags["PixelYDimension"]
            ? tags["PixelYDimension"].value
            : null,
        // Other potentially useful tags
        orientation: tags["Orientation"] ? tags["Orientation"].value : null, // For image rotation correction
        exposureTime: tags["ExposureTime"]
          ? tags["ExposureTime"].description
          : null,
        fNumber: tags["FNumber"] ? tags["FNumber"].description : null,
        isoSpeedRatings: tags["ISOSpeedRatings"]
          ? tags["ISOSpeedRatings"].value
          : null,
        focalLength: tags["FocalLength"]
          ? tags["FocalLength"].description
          : null,
        lensModel: tags["LensModel"] ? tags["LensModel"].description : null,
      };

      // Parse Date/Time
      if (tags["DateTimeOriginal"] && tags["DateTimeOriginal"].description) {
        // Attempt to parse date string like "YYYY:MM:DD HH:MM:SS"
        const dateStr = tags["DateTimeOriginal"].description
          .replace(/:/g, "-")
          .replace(" ", "T");
        metadata.date = new Date(dateStr);
        if (isNaN(metadata.date.getTime())) {
          // If parsing failed, try DateTime
          if (tags["DateTime"] && tags["DateTime"].description) {
            const dateStr2 = tags["DateTime"].description
              .replace(/:/g, "-")
              .replace(" ", "T");
            metadata.date = new Date(dateStr2);
          } else {
            metadata.date = new Date(file.lastModified); // Fallback to file modified date
            console.warn(
              `MetadataParser: Could not parse DateTimeOriginal or DateTime for ${file.name}, using file modification date.`,
            );
          }
        }
      } else if (tags["DateTime"] && tags["DateTime"].description) {
        const dateStr = tags["DateTime"].description
          .replace(/:/g, "-")
          .replace(" ", "T");
        metadata.date = new Date(dateStr);
        if (isNaN(metadata.date.getTime())) {
          metadata.date = new Date(file.lastModified); // Fallback to file modified date
          console.warn(
            `MetadataParser: Could not parse DateTime for ${file.name}, using file modification date.`,
          );
        }
      } else {
        metadata.date = new Date(file.lastModified); // Fallback to file modified date
        console.warn(
          `MetadataParser: No Date/Time metadata found for ${file.name}, using file modification date.`,
        );
      }

      // Parse GPS data
      if (tags["GPSLatitude"] && tags["GPSLongitude"]) {
        // ExifReader provides parsed GPS values directly
        metadata.gps = {
          latitude: tags["GPSLatitude"].description, // This might be a string, or the parsed value
          longitude: tags["GPSLongitude"].description, // This might be a string, or the parsed value
          // ExifReader often provides numerical values in .value
          latitudeValue: tags["GPSLatitude"].value,
          longitudeValue: tags["GPSLongitude"].value,
          altitude: tags["GPSAltitude"] ? tags["GPSAltitude"].value : null,
        };
        // Need to handle GPS reference (N, S, E, W) if .description isn't the final value
        if (tags["GPSLatitudeRef"] && tags["GPSLatitudeRef"].value === "S")
          metadata.gps.latitudeValue *= -1;
        if (tags["GPSLongitudeRef"] && tags["GPSLongitudeRef"].value === "W")
          metadata.gps.longitudeValue *= -1;
      }

      // Clean up object URL when the metadata is no longer needed or the photo is removed
      // This is important for memory management with large numbers of files
      // Need a mechanism in visualizationManager to call this when a photo is removed
      metadata.revokeObjectURL = () => {
        if (metadata.src) {
          URL.revokeObjectURL(metadata.src);
          metadata.src = null; // Prevent revoking multiple times
        }
      };

      return metadata;
    } catch (error) {
      console.error(
        `MetadataParser: Failed to parse metadata for ${file.name}:`,
        error,
      );
      // Even if metadata parsing fails, we might still want to include the photo
      // Return basic info so at least the image can be loaded
      return {
        name: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        src: URL.createObjectURL(file),
        date: new Date(file.lastModified), // Fallback date
        gps: null,
        make: null,
        model: null,
        imageWidth: null, // Will need to load image to get dimensions if not in metadata
        imageHeight: null,
        orientation: null,
        revokeObjectURL: () => {
          if (metadata.src) {
            URL.revokeObjectURL(metadata.src);
            metadata.src = null;
          }
        },
      };
    }
  }
}
