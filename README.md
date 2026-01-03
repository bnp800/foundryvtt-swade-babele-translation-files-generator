# SWADE - BTFG Module

SWADE - Translation files generator for Babele

![Foundry v13](https://img.shields.io/badge/foundry-v13-green)

_(English version below)_

---

Ce module permet de générer le fichier de traduction JSON d'un compendium SWADE (Savage Worlds Adventure Edition) afin de faciliter la mise en place de traductions pour le système et ses modules.

Il est possible de traiter n'importe quel type de compendium et de personnaliser le fichier exporté grâce à la définition de mapping pour Babele (pour les compendiums `Actor`, `Item`, `Scene`, `JournalEntry` et `Adventure`).

## Types de documents SWADE supportés

### Items
- Edges, Hindrances, Powers, Skills
- Weapons, Armor, Shields, Gear
- Abilities, Actions, Consumables, Ancestry

### Actors
- Characters, NPCs
- Vehicles, Groups

### Autres
- JournalEntries (incluant les pages Headquarters)
- Scenes, Adventures, RollTables, Macros, Cards, Playlists

## Installation

Le module est installable directement depuis Foundry en recherchant son nom : `SWADE - Translation files generator for Babele`.
Vous aurez alors la dernière version et profiterez des mises à jour automatiques.

Sinon, il est possible de l'ajouter en utilisant le lien de son manifest :
`https://github.com/bnp800/foundryvtt-swade-babele-translation-files-generator/releases/latest/download/module.json`

## Utilisation

Ouvrez l'exporteur de compendium dans l'onglet Compendium. Une application apparaîtra et permettra de lancer l'export du fichier de traduction d'un compendium sélectionné dans la liste ou les fichiers de traduction pour un export massif.

Si vous possédez déjà un fichier de traduction, vous pourrez le sélectionner afin d'en obtenir un nouveau à jour qui contiendra les traductions que vous avez déjà effectuées ainsi que les nouvelles non présentes dans votre fichier.

---

_(English version)_

This module allows you to generate the JSON translation file of a SWADE (Savage Worlds Adventure Edition) compendium in order to facilitate the implementation of translations for the system and its modules.

It is possible to process any type of compendium and personalize the exported file using the mapping definition for Babele (for `Actor`, `Item`, `Scene`, `JournalEntry` and `Adventure` compendiums).

## Supported SWADE Document Types

### Items
- Edges, Hindrances, Powers, Skills
- Weapons, Armor, Shields, Gear
- Abilities, Actions, Consumables, Ancestry

### Actors
- Characters, NPCs
- Vehicles, Groups

### Others
- JournalEntries (including Headquarters pages)
- Scenes, Adventures, RollTables, Macros, Cards, Playlists

## Installation

The module can be installed directly from Foundry by searching for its name: `SWADE - Translation files generator for Babele`.
You'll then have the latest version and benefit from automatic updates.

Alternatively, you can add it using its manifest link:
`https://github.com/bnp800/foundryvtt-swade-babele-translation-files-generator/releases/latest/download/module.json`

## Usage

Open the compendium exporter in the Compendium Packs tab. An application will then appear, allowing you to export the translation file of a compendium selected from the list, or the translation files for bulk export.

If you already have a translation file, you can select it to obtain a new, up-to-date one which will contain the translations you have already made as well as any new ones not present in your file.
