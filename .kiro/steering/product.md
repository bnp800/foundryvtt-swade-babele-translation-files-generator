# Product Overview

A FoundryVTT module that generates Babele-compatible JSON translation files from SWADE (Savage Worlds Adventure Edition) compendium packs.

## Purpose
- Export SWADE compendium content (Actors, Items, Scenes, JournalEntries, Adventures, etc.) into translation-ready JSON files
- Support bulk export of multiple compendiums as a ZIP archive
- Merge existing translations with new content to preserve completed work
- Generate custom field mappings for Babele's translation system

## Target Users
- FoundryVTT translators working on SWADE system/module localization
- Community members creating language packs for Savage Worlds

## Key Features
- Single compendium or bulk export
- Custom mapping definitions per document type
- Existing translation file merging
- Progress tracking during export
- ZIP archive generation for bulk exports

## Supported SWADE Document Types

### Items
- Edges (with requirements field)
- Hindrances (major/minor)
- Powers (with trapping field)
- Skills, Weapons, Armor, Shields, Gear
- Abilities, Actions, Consumables, Ancestry

### Actors
- Characters and NPCs (biography, appearance, notes, goals)
- Vehicles and Groups (description)
- Embedded items and Active Effects

### JournalEntries
- Standard pages (text content)
- Headquarters pages (advantage, complication, form details, upgrades)
