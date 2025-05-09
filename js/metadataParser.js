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
        "MetadataParser: exifr was not imported or its parse method is missing. Metadata parsing will be limited.",
      );
    }
    console.log("--- End Debugging Logs ---");
  }

  async parseMetadata(file) {
    const name = file.webkitRelativePath || file.name; // Use relative path if available

    // Basic metadata object - will be populated regardless of exifr success
    const metadata = {
      name: name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified), // File object provides this
      src: null, // Initialize src to null
      date: null, // Initialize date to null
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
      // Flag to track if the URL has been revoked
      _objectUrlRevoked: false,
      // Add a method to create and revoke the temporary URL
      createObjectURL: () => {
        // Create only if not already created and file exists
        // Check if src is currently null or undefined before creating a new one
        if (!metadata.src && file) {
          metadata.src = URL.createObjectURL(file);
          metadata._objectUrlRevoked = false; // Reset flag
          // console.log(`MetadataParser: Created Object URL for ${name}`); // Log creation
        }
      },
      revokeObjectURL: () => {
        // Revoke only if src exists and hasn't been revoked yet
        if (metadata.src && !metadata._objectUrlRevoked) {
          URL.revokeObjectURL(metadata.src);
          metadata.src = null; // Clear the reference
          metadata._objectUrlRevoked = true; // Set flag
          // console.log(`MetadataParser: Revoked Object URL for ${name}`); // Log revocation
        }
      },
    };

    // Create the object URL immediately so it's available for texture loading and preview
    metadata.createObjectURL();

    // If exifr is not available or it's not an image file, return basic metadata
    if (!this.isExifrAvailable || !file.type.startsWith("image/")) {
      if (!this.isExifrAvailable) {
        console.error(
          `MetadataParser: exifr not available. Returning basic metadata for ${name}.`,
        );
      } else if (!file.type.startsWith("image/")) {
        // Check specifically if it's a non-image type
        console.warn(
          `MetadataParser: Skipping non-image file type: ${name} (${file.type})`,
        );
      }
      // Set fallback date
      metadata.date = metadata.lastModified;
      return metadata; // Return metadata object with basic info and object URL
    }

    try {
      // Use exifr.parse() with the File object directly.
      // Request specific segments to parse for better performance/control.
      const tags = await exifr.parse(file, {
        exif: true,
        gps: true,
        xmp: true,
        iptc: true,
        png: true, // Include PNG-specific metadata segments
        parse: true, // Parse known tags into friendly names/formats (like dateOriginal, make, model etc.)
        // Add other segments if needed, e.g., icc: true, photoshop: true
      });

      // exifr.parse() returns undefined if no metadata is found or if file type isn't supported by segments
      if (!tags) {
        console.warn(
          `MetadataParser: No parsable metadata found for ${name} using exifr.`,
        );
        // Set fallback date
        metadata.date = metadata.lastModified;
        return metadata; // Return metadata object with fallback date and object URL
      }

      // Helper to safely get a tag value from the exifr tags object
      // Returns undefined if the path doesn't exist
      const getExifrTag = (tagsObj, ...path) => {
        let current = tagsObj;
        for (const key of path) {
          if (
            current === null || // Ensure current is not null or undefined
            current === undefined ||
            typeof current !== "object" ||
            !(key in current)
          ) {
            return undefined; // Path doesn't exist or current is not an object
          }
          current = current[key];
        }
        return current;
      };

      // --- Extracting data from exifr's output structure ---
      // exifr often puts common tags at the top level when parse: true is used.
      // We'll check top level first, then specific segments like exif if needed, although parse:true usually flattens useful ones.

      // Basic camera info
      metadata.make = getExifrTag(tags, "Make");
      metadata.model = getExifrTag(tags, "Model");

      // Image dimensions (prefer parsed dimensions if available)
      // Note: exifr.parse({ parse: true }) often puts these directly on the main tags object.
      metadata.imageWidth =
        getExifrTag(tags, "ExifImageWidth") ||
        getExifrTag(tags, "ImageWidth") ||
        getExifrTag(tags, "PixelXDimension");
      metadata.imageHeight =
        getExifrTag(tags, "ExifImageHeight") ||
        getExifrTag(tags, "ImageHeight") ||
        getExifrTag(tags, "PixelYDimension");

      // Orientation
      metadata.orientation = getExifrTag(tags, "Orientation");

      // Photo settings
      metadata.exposureTime = getExifrTag(tags, "ExposureTime");
      metadata.fNumber = getExifrTag(tags, "FNumber"); // exifr parses this to a number
      metadata.isoSpeedRatings = getExifrTag(tags, "ISOSpeedRatings");
      metadata.focalLength = getExifrTag(tags, "FocalLength"); // exifr parses this to a number (e.g., 50 for 50mm)
      metadata.lensModel = getExifrTag(tags, "LensModel");

      // Date/Time - Check common tags parsed by exifr (often Date objects)
      // exifr's parse:true usually returns a Date object directly for these if found
      metadata.date =
        getExifrTag(tags, "DateTimeOriginal") ||
        getExifrTag(tags, "CreateDate") || // Alias for DateTimeOriginal
        getExifrTag(tags, "DateTimeDigitized") ||
        getExifrTag(tags, "ModifyDate") || // DateTime tag (less preferred for photo taken time)
        getExifrTag(tags, "OriginalDate") || // XMP alias
        getExifrTag(tags, "DateCreated"); // IPTC alias

      // Fallback to file modified date if no valid date was found from EXIF/XMP/IPTC
      if (
        !metadata.date ||
        !(metadata.date instanceof Date) ||
        isNaN(metadata.date.getTime())
      ) {
        // Only warn if exifr found *some* tags but none were usable dates
        if (Object.keys(tags).length > 0) {
          console.warn(
            `MetadataParser: Could not find/parse standard EXIF/XMP/IPTC date tags for ${name}. Using file modification date.`,
          );
        } else {
          // This case is already logged by !tags check, but good for clarity
          console.warn(
            `MetadataParser: No parsable metadata found for ${name}. Using file modification date.`,
          );
        }
        metadata.date = metadata.lastModified; // Use the file's last modified date
      }

      // GPS data
      // exifr puts parsed lat/lon directly on tags.latitude and tags.longitude with parse: true
      if (
        typeof getExifrTag(tags, "latitude") === "number" && // Check for number type
        typeof getExifrTag(tags, "longitude") === "number"
      ) {
        metadata.gps = {
          latitude: getExifrTag(tags, "latitude"),
          longitude: getExifrTag(tags, "longitude"),
          altitude: getExifrTag(tags, "altitude") || null, // Altitude might be null or undefined
        };
      }

      // Return the compiled metadata object with the created object URL
      return metadata;
    } catch (error) {
      // Catch any errors during exifr.parse or subsequent extraction
      console.error(
        `MetadataParser: Failed to process metadata for ${name} using exifr:`,
        error,
      );
      // Set fallback date on error
      metadata.date = metadata.lastModified;
      // Return the metadata object with basic info and the object URL
      return metadata;
    }
  }
}
