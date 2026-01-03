# Project Structure

```
├── module.json              # FoundryVTT module manifest
├── lang/                    # Localization files
│   ├── en.json
│   ├── fr.json
│   └── zh-Hans.json
├── scripts/
│   ├── swade-babele-translation-files-generator.mjs  # Entry point, hooks registration
│   ├── app/
│   │   └── compendium-exporter-app.mjs               # Main UI application (ApplicationV2)
│   ├── exporters/
│   │   ├── _index.mjs                                # Barrel export
│   │   ├── abstract-exporter.mjs                     # Base exporter class
│   │   ├── exporter-instanciator.mjs                 # Factory for creating exporters
│   │   ├── actor-exporter.mjs                        # SWADE Actor document exporter
│   │   ├── item-exporter.mjs                         # SWADE Item document exporter
│   │   ├── scene-exporter.mjs                        # Scene document exporter
│   │   ├── journal-entry-exporter.mjs                # JournalEntry document exporter (with Headquarters support)
│   │   ├── adventure-exporter.mjs                    # Adventure document exporter
│   │   ├── cards-exporter.mjs                        # Cards document exporter
│   │   ├── macro-exporter.mjs                        # Macro document exporter
│   │   ├── playlist-exporter.mjs                     # Playlist document exporter
│   │   └── rolltable-exporter.mjs                    # RollTable document exporter
│   └── lib/                                          # Third-party libraries
│       ├── jszip.min.js
│       └── FileSaver.js
├── styles/
│   └── swade-babele-translation-files-generator.css  # Module styles
└── templates/
    ├── export.hbs                                    # Export options panel
    └── sidebar.hbs                                   # Compendium selection sidebar
```

## Architecture Patterns

### Exporter Pattern
- `AbstractExporter` defines the export workflow template
- Concrete exporters (e.g., `ItemExporter`) implement `_processDataset()` for SWADE document-specific logic
- `ExporterInstanciator` factory creates appropriate exporter based on compendium type

### Application Structure
- Single `CompendiumExporterApp` handles all UI interactions
- Uses FoundryVTT's ApplicationV2 with form handling
- Data models (`MappingModel`, `OptionsModel`) manage form state

### Hooks
- `init`: Register Handlebars helpers and game settings
- `renderCompendiumDirectory`: Inject sidebar button for GM users
