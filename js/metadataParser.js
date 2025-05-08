// js\metadataParser.js

// Fix: Removed import statement.
// Based on repeated SyntaxErrors and the library's source, the library './lib/exifreader.js'
// does not use standard ES Module exports. It is expected to be included
// via a <script> tag and exposes a global variable, most likely named 'ExifReader'.

class MetadataParser {
  async parseMetadata(file) {
    try {
      const buffer = await file.arrayBuffer();

      // --- Critical Check ---
      // Verify that the global 'ExifReader' variable exists and has a 'load' function.
      // This confirms the library script was loaded correctly via a <script> tag.
      // If this check fails, the issue is with loading the exifreader.js script.
      if (
        typeof ExifReader === "undefined" ||
        typeof ExifReader.load !== "function"
      ) {
        console.error(
          "ExifReader library not loaded or 'load' function not found.",
        );
        console.error(
          "Ensure './lib/exifreader.js' is loaded via a <script> tag BEFORE any script that uses MetadataParser.",
        );
        // Throw a specific error to indicate the dependency is missing
        throw new Error(
          "ExifReader library or load function not available globally.",
        );
      }
      // --- End Critical Check ---

      // Now call the global ExifReader.load function
      // Based on the source, ExifReader.load should be the correct function
      const tags = ExifReader.load(buffer);

      const metadata = {
        date: this.extractDate(tags),
        make: this.extractMake(tags),
        model: this.extractModel(tags),
        // Add other metadata fields as needed
      };

      return metadata;
    } catch (error) {
      // Log the specific error that occurred during parsing
      console.error(
        "Error parsing metadata for file:",
        file.name,
        ":",
        error.message || error,
      );
      // You might want to log the original error object for more details if needed
      // console.error("Original error object:", error);

      // Decide how to handle the failure - returning null means the file is processed
      // but no metadata is attached. Throwing the error would stop processing this file.
      // Returning null matches your original code structure and allows other files to load.
      return null;
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
        // Fallback to value, convert array of characters to string if necessary
        // ExifReader value for strings is often an array of numeric character codes
        return Array.isArray(tags.DateTimeOriginal.value)
          ? tags.DateTimeOriginal.value
              .map((code) => String.fromCharCode(code))
              .join("")
          : tags.DateTimeOriginal.value; // Should be a string or number otherwise
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
        // Join character codes into a string
        return Array.isArray(tags.Make.value)
          ? tags.Make.value.map((code) => String.fromCharCode(code)).join("")
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
        // Join character codes into a string
        return Array.isArray(tags.Model.value)
          ? tags.Model.value.map((code) => String.fromCharCode(code)).join("")
          : tags.Model.value;
      }
    }
    return null;
  }

  // Add other extraction methods here as needed for other tags
}

export { MetadataParser };
