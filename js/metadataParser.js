// js\metadataParser.js

// Attempt 5: Go back to namespace import, but try accessing the default export
// within the namespace object. This is a guess based on the observed behavior
// where 'import * as' works initially (no SyntaxError) but standard named/default
// imports fail with SyntaxErrors. The default export is a common place for
// the main functionality to be located on the namespace object.
import * as ExifReaderModule from "./lib/exifreader.js"; // Use a distinct name for the namespace object

class MetadataParser {
  async parseMetadata(file) {
    try {
      const buffer = await file.arrayBuffer();

      // --- Debugging Step: Inspect the imported module to understand its structure ---
      // console.log('--- Debugging ExifReader Import ---');
      // console.log('ExifReaderModule:', ExifReaderModule);
      // console.log('ExifReaderModule.default:', ExifReaderModule.default);
      // console.log('typeof ExifReaderModule.default:', typeof ExifReaderModule.default);
      // if (ExifReaderModule.default && typeof ExifReaderModule.default === 'object') {
      //    console.log('ExifReaderModule.default.load:', ExifReaderModule.default.load);
      //    console.log('typeof ExifReaderModule.default.load:', typeof ExifReaderModule.default.load);
      // }
      // console.log('-----------------------------------');
      // Remove or comment out these console logs after you understand the structure

      // Try accessing load on the default property of the namespace object.
      // This is a common place for the main function if a default export exists
      // or is simulated by the module bundling process, even if direct default
      // import failed with a SyntaxError.
      if (
        !ExifReaderModule.default ||
        typeof ExifReaderModule.default.load !== "function"
      ) {
        // If this path is still wrong, throw a more specific error or handle
        console.error(
          "ExifReader.load function not found on the default export of the imported module.",
        );
        console.error(
          "Check the file './lib/exifreader.js' and how it exports the load function.",
        );
        // Fallback or re-throw error if needed
        throw new Error("Could not find ExifReader.load function.");
      }

      const tags = ExifReaderModule.default.load(buffer);

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
      return null; // Returning null as per your original code structure
    }
  }

  extractDate(tags) {
    // ExifReader tags often have a 'description' property with a formatted string.
    // 'value' can be raw data (like an array). Prefer description if available.
    if (tags && tags.DateTimeOriginal) {
      if (tags.DateTimeOriginal.description) {
        return tags.DateTimeOriginal.description; // Formatted date string
      }
      if (tags.DateTimeOriginal.value) {
        // Fallback to value, convert array to string if necessary
        return Array.isArray(tags.DateTimeOriginal.value)
          ? tags.DateTimeOriginal.value.join(" ")
          : tags.DateTimeOriginal.value;
      }
    }
    return null;
  }

  extractMake(tags) {
    if (tags && tags.Make) {
      if (tags.Make.description) {
        return tags.Make.description;
      }
      if (tags.Make.value) {
        return Array.isArray(tags.Make.value)
          ? tags.Make.value.join(" ")
          : tags.Make.value;
      }
    }
    return null;
  }

  extractModel(tags) {
    if (tags && tags.Model) {
      if (tags.Model.description) {
        return tags.Model.description;
      }
      if (tags.Model.value) {
        return Array.isArray(tags.Model.value)
          ? tags.Model.value.join(" ")
          : tags.Model.value;
      }
    }
    return null;
  }
}

export { MetadataParser };
