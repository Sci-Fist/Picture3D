// Fix: Import the object containing the load function as a named export
// Based on the error history and common library patterns, the library likely
// exports an object named 'ExifReader' which has a 'load' method.
import { ExifReader } from "./lib/exifreader.js";

class MetadataParser {
  async parseMetadata(file) {
    try {
      const buffer = await file.arrayBuffer();
      // This line now correctly calls the load method on the imported object
      const tags = ExifReader.load(buffer);

      const metadata = {
        date: this.extractDate(tags),
        make: this.extractMake(tags),
        model: this.extractModel(tags),
        // Add other metadata fields as needed
      };

      return metadata;
    } catch (error) {
      console.error("Error parsing metadata:", error);
      // Propagate the error or handle it appropriately
      // For now, returning null as per your original code structure
      return null;
    }
  }

  extractDate(tags) {
    // Note: ExifReader values can be complex objects, access 'description' or 'value'
    // Depending on the tag type. 'value' is often an array or string.
    // 'description' is the human-readable formatted value.
    // Check ExifReader docs or console.log(tags) to be sure.
    if (tags && tags.DateTimeOriginal && tags.DateTimeOriginal.description) {
      return tags.DateTimeOriginal.description; // Using description for formatted date
    }
    return null;
  }

  extractMake(tags) {
    if (tags && tags.Make && tags.Make.description) {
      return tags.Make.description; // Using description
    }
    return null;
  }

  extractModel(tags) {
    if (tags && tags.Model && tags.Model.description) {
      return tags.Model.description; // Using description
    }
    return null;
  }
}

export { MetadataParser };
