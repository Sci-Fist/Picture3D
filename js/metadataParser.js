import * as ExifReader from './lib/exifreader.js'; // Adjust path if necessary

class MetadataParser {
    async parseMetadata(file) {
        try {
            const buffer = await file.arrayBuffer();
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
            return null;
        }
    }

    extractDate(tags) {
        if (tags && tags.DateTimeOriginal && tags.DateTimeOriginal.value) {
            return tags.DateTimeOriginal.value;
        }
        return null;
    }

    extractMake(tags) {
        if (tags && tags.Make && tags.Make.value) {
            return tags.Make.value;
        }
        return null;
    }

    extractModel(tags) {
        if (tags && tags.Model && tags.Model.value) {
            return tags.Model.value;
        }
        return null;
    }
}

export { MetadataParser };
