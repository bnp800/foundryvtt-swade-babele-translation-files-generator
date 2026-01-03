# Tech Stack

## Platform
- FoundryVTT v13 module
- Configured for SWADE system (module ID: `swade-babele-translation-files-generator`)
- Works with Babele translation module

## Languages & Frameworks
- JavaScript ES Modules (`.mjs`)
- Handlebars templates (`.hbs`)
- CSS for styling
- FoundryVTT Application V2 API with `HandlebarsApplicationMixin`
- FoundryVTT Data Models (`foundry.abstract.DataModel`)

## Third-Party Libraries
- JSZip (`scripts/lib/jszip.min.js`) - ZIP file generation
- FileSaver (`scripts/lib/FileSaver.js`) - Client-side file downloads

## Localization
- English (`lang/en.json`)
- French (`lang/fr.json`)
- Simplified Chinese (`lang/zh-Hans.json`)

## Build & Development
No build step required - vanilla JavaScript modules loaded directly by FoundryVTT.

### Hot Reload
Enabled for development via `module.json` flags:
- Extensions: `css`, `hbs`, `json`
- Paths: `lang/`, `styles/`, `templates/`

### Testing
Manual testing within FoundryVTT environment. No automated test framework.

### Deployment
- Version and download URL auto-replaced during GitHub release
- Manifest: `module.json`
