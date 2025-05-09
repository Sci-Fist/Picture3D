// js/metadataParser.js

// Import ExifReader as a module from node_modules
import ExifReader from "exifreader"; // Import the default export

export class MetadataParser {
  constructor() {
    console.log("MetadataParser constructor called");
    // Check if ExifReader is available (now checked via the import)
    this.isExifReaderAvailable = typeof ExifReader !== "undefined"; // Check the imported variable

    console.log("Debugging ExifReader availability:");
    console.log("typeof ExifReader:", typeof ExifReader); // Log the imported variable
    if (this.isExifReaderAvailable) {
      // You can inspect properties of the imported module if needed
      console.log("ExifReader is available.");
      console.log("typeof ExifReader.load:", typeof ExifReader.load);
    } else {
      // This else block should ideally not be reached if the import succeeds
      console.error("ExifReader import failed. Metadata parsing will fail.");
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
      // Use the imported ExifReader object
      const tags = await ExifReader.load(file);

      // ... rest of your parseMetadata logic remains the same ...
      const metadata = {
        name: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        src: URL.createObjectURL(file),

        // --- Extracting specific metadata ---
        date: null,
        gps: null,
        make: tags["Make"] ? tags["Make"].description : null,
        model: tags["Model"] ? tags["Model"].description : null,
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
        orientation: tags["Orientation"] ? tags["Orientation"].value : null,
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

      // Parse Date/Time (This part uses the extracted 'tags', not the ExifReader object directly)
      if (tags["DateTimeOriginal"] && tags["DateTimeOriginal"].description) {
        const dateStr = tags["DateTimeOriginal"].description
          .replace(/:/g, "-")
          .replace(" ", "T");
        metadata.date = new Date(dateStr);
        if (isNaN(metadata.date.getTime())) {
          if (tags["DateTime"] && tags["DateTime"].description) {
            const dateStr2 = tags["DateTime"].description
              .replace(/:/g, "-")
              .replace(" ", "T");
            metadata.date = new Date(dateStr2);
          } else {
            metadata.date = new Date(file.lastModified);
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
          metadata.date = new Date(file.lastModified);
          console.warn(
            `MetadataParser: Could not parse DateTime for ${file.name}, using file modification date.`,
          );
        }
      } else {
        metadata.date = new Date(file.lastModified);
        console.warn(
          `MetadataParser: No Date/Time metadata found for ${file.name}, using file modification date.`,
        );
      }

      // Parse GPS data (This part uses the extracted 'tags')
      if (tags["GPSLatitude"] && tags["GPSLongitude"]) {
        metadata.gps = {
          latitude: tags["GPSLatitude"].description,
          longitude: tags["GPSLongitude"].description,
          latitudeValue: tags["GPSLatitude"].value,
          longitudeValue: tags["GPSLongitude"].value,
          altitude: tags["GPSAltitude"] ? tags["GPSAltitude"].value : null,
        };
        if (tags["GPSLatitudeRef"] && tags["GPSLatitudeRef"].value === "S")
          metadata.gps.latitudeValue *= -1;
        if (tags["GPSLongitudeRef"] && tags["GPSLongitudeRef"].value === "W")
          metadata.gps.longitudeValue *= -1;
      }

      // Clean up object URL
      metadata.revokeObjectURL = () => {
        if (metadata.src) {
          URL.revokeObjectURL(metadata.src);
          metadata.src = null;
        }
      };

      return metadata;
    } catch (error) {
      console.error(
        `MetadataParser: Failed to parse metadata for ${file.name}:`,
        error,
      );
      // Return basic info even if metadata parsing fails
      const basicMetadata = {
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
