# textfile.me

An ultra-simple, offline-first, browser-based text editor that supports real-time synchronization and prioritizes privacy. The entire application acts as a single distraction-free text area with a custom right-click context menu for actions. Your data is stored in your browser's local storage (IndexedDB) and is available offline. Each file has a unique link that can be shared for end-to-end encrypted collaborative editing (users must be online together).

## Features

- **Offline First**: All your documents are saved locally in your browser.
- **Distraction-Free UI**: No visible toolbars, just text.
- **Custom Context Menu**: Right-click for actions like creating a new document, copying text, downloading the file, changing themes, and accessing previous documents.
- **Real-Time Sync**: Uses Yjs and WebRTC for peer-to-peer real-time collaborative editing.
- **Dark/Light Mode**: Easily toggleable themes.

## Getting Started

To run textfile.me locally, you'll need Node.js and npm installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AnantVijaySingh/textfile.me.git
   cd textfile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The app will be available at `http://localhost:5173/`.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## Testing

The project includes a simple Vanilla JS test suite to verify core functionality without heavy testing frameworks.

To run the tests:

1. Ensure the development server is running (`npm start`).
2. Navigate to `http://localhost:5173/tests.html` in your web browser.
3. The test runner will automatically execute the end-to-end tests and display a live pass/fail report on the screen.

## Contributing

Merge Requests (MRs) and Pull Requests (PRs) are very welcome! Whether it's bug fixes, design tweaks, or new features that align with the "ultra-simple" aesthetic, feel free to open an issue or submit a pull request.

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

## Attributions

Icons used in this project are from [Iconoir](https://iconoir.com/) under the MIT License. See the [Iconoir License](https://github.com/iconoir-icons/iconoir/blob/main/LICENSE) for more details.
