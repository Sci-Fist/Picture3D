```markdown
# Photo Voyager: 3D Photo Management & Gallery Creator

## Project Overview

Photo Voyager is a novel web application aimed at transforming the way photographers manage, sort, and explore their digital photo collections. Moving beyond traditional 2D grid or list interfaces, this project visualizes photos in immersive 3D environments, leveraging embedded metadata for dynamic organization and offering tools for creating personalized virtual galleries.

## Project Goal

The core goal is to develop a user-friendly application that allows photographers to navigate large archives more intuitively and engagingly, using the inherent data within their photos to create meaningful spatial arrangements and providing creative freedom to curate and showcase their work in 3D spaces.

## Current Status (MVP)

The project is currently focused on developing the **Minimum Viable Product (MVP)**. The MVP aims to deliver the foundational 3D browsing experience.

**MVP Features Include:**

*   **Photo Collection Loading:** Select local folder(s) via a browser interface to load photo files and read their metadata.
*   **Metadata Indexing:** Efficiently extract and index key metadata (Date/Time, etc.) from up to approximately 10,000 photos for quick access.
*   **Spherical 3D View (Date/Time):** Visualize the photo collection within a navigable 3D sphere, with photos automatically positioned based on their Date/Time.
*   **3D Navigation:** Intuitive camera controls (mouse/keyboard) to explore the spherical environment.
*   **Dynamic Loading:** Photos/textures are loaded and unloaded based on camera view/proximity to maintain smooth performance.
*   **Basic Photo Interaction:** Click on a photo in the 3D view to see a larger preview and basic metadata.

## Technologies Used

*   **Frontend:** HTML, CSS, JavaScript
*   **3D Rendering:** [Three.js](https://threejs.org/) (WebGL Library)
*   **Metadata Parsing:** A JavaScript library for reading EXIF/XMP data (e.g., `exifreader`, `piexifjs` - *specific library to be determined/integrated*).

## Project Structure

```
Picture3D/
├── index.html          # Main application HTML file
├── style.css           # Global styles
├── main.js             # Application entry point and main loop
├── js/                 # Directory for JavaScript modules
│   ├── fileLoader.js       # Handles file system interaction and reading
│   ├── metadataParser.js   # Handles photo metadata extraction
│   ├── dataManager.js      # Manages the in-memory photo metadata index
│   ├── threeSceneManager.js # Sets up and manages the Three.js scene, camera, renderer
│   ├── visualizationManager.js # Contains logic for different 3D layouts (MVP: Spherical)
│   ├── uiHandler.js        # Manages interactions with HTML UI elements
│   ├── navigationControls.js # Handles mouse/keyboard/touch input for 3D navigation
│   └── lib/             # External libraries (Three.js, metadata parser)
└── Planning/           # Project planning documents
    ├── PROJECT_OUTLINE.md
    ├── BRAINSTORMING_LOG.md
    ├── FEATURES.md
    └── ARCHITECTURE.md
```

## Getting Started (Running Locally)

Since this is a web application that needs to access local files/folders using `webkitdirectory`, it requires being served from a web server due to browser security restrictions (simply opening `index.html` from your file system might not work as expected for file access).

1.  **Clone or Download:** Get the project files onto your computer.
2.  **Install a Local Web Server:** If you don't have one, a simple way is to use Python's built-in server or Node.js's `serve` package.
    *   **Python:** Open your terminal or command prompt, navigate to the `Picture3D/` directory, and run: `python -m http.server 8000` (for Python 3) or `python -m SimpleHTTPServer 8000` (for Python 2).
    *   **Node.js:** If you have Node.js installed, run `npm install -g serve`, then navigate to the `Picture3D/` directory in your terminal and run `serve`.
3.  **Access in Browser:** Open your web browser and go to `http://localhost:8000` (or the address provided by your chosen server).
4.  **Select Photos:** Use the "Select Photo Folder(s)" input to choose the directories containing your photos.

## Planning & Documentation

More detailed information about the project's vision, decisions, feature breakdown, and technical architecture can be found in the `Planning/` directory:

*   [`Planning/PROJECT_OUTLINE.md`](./Planning/PROJECT_OUTLINE.md): High-level project goals and scope.
*   [`Planning/BRAINSTORMING_LOG.md`](./Planning/BRAINSTORMING_LOG.md): A chronological log of brainstorming sessions and key decisions.
*   [`Planning/FEATURES.md`](./Planning/FEATURES.md): Detailed breakdown of MVP and future features.
*   [`Planning/ARCHITECTURE.md`](./Planning/ARCHITECTURE.md): Technical architecture plan for the MVP.

## Future Plans

Following the MVP, future development phases are planned to introduce additional automatic visualization modes, the full **Gallery Builder** for creating custom 3D exhibits, advanced filtering/searching, and potentially photo editing capabilities and cloud integration. See [`Planning/FEATURES.md`](./Planning/FEATURES.md) for more details.

## Contributing

(Section to be added later if the project is open-sourced and contributions are welcomed.)

## License

(Section to be added later - specifies how the code can be used.)

```
