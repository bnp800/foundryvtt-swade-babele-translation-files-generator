import { AbstractExporter } from './abstract-exporter.mjs';
import { ItemExporter } from './item-exporter.mjs';
import { SmartContentFilter } from '../core/smart-content-filter.mjs';

export class ActorExporter extends AbstractExporter {
  constructor(pack, options, existingFile) {
    super(pack, options, existingFile);
    this.contentFilter = new SmartContentFilter();
  }
  static async getDocumentData(document, customMapping, datasetMapping = {}, contentFilter = null, options = {}) {
    const { name, type, prototypeToken, system } = document;
    const documentData = { name };

    // Token name (if different from actor name)
    if (name?.toLowerCase() !== prototypeToken?.name?.toLowerCase()) {
      documentData.tokenName = prototypeToken.name;
    }

    // SWADE Character/NPC type fields
    if (type === "character" || type === "npc") {
      // Biography
      if (system?.details?.biography?.value) {
        documentData.description = system.details.biography.value;
      }
      // Appearance
      if (system?.details?.appearance) {
        documentData.appearance = system.details.appearance;
      }
      // Notes
      if (system?.details?.notes) {
        documentData.notes = system.details.notes;
      }
      // Goals
      if (system?.details?.goals) {
        documentData.goals = system.details.goals;
      }
    }

    // SWADE Vehicle/Group type fields
    if (type === "vehicle" || type === "group") {
      if (system?.description) {
        documentData.description = system.description;
      }
    }

    // Process custom mapping
    const localMapping = foundry.utils.deepClone(customMapping.Actor ?? []);
    const mappingAdded = this._addCustomMapping(localMapping, document, documentData);

    if (datasetMapping.Actor) {
      datasetMapping.Actor = foundry.utils.mergeObject(datasetMapping.Actor, mappingAdded);
    } else if (datasetMapping.actors) {
      datasetMapping.actors = foundry.utils.mergeObject(datasetMapping.actors, mappingAdded);
    } else {
      datasetMapping = foundry.utils.mergeObject(datasetMapping, mappingAdded);
    }

    // Process embedded Items with smart filtering
    if (this._hasContent(document.items)) {
      const embeddedItems = document.items.filter(item => !item._tombstone);
      
      let filteredItems = embeddedItems;
      
      // Apply smart filtering if contentFilter is provided
      if (contentFilter) {
        const filterOptions = {
          includeAllEmbeddedItems: options.includeAllEmbeddedItems || false,
          enableSmartFiltering: options.enableSmartFiltering !== false // default to true
        };
        
        const filterResult = await contentFilter.filterEmbeddedItems(embeddedItems, filterOptions);
        filteredItems = filterResult.filteredItems;
        
        // Log filtering statistics for debugging
        if (filterResult.statistics.excluded > 0) {
          console.log(`ActorExporter: Filtered ${filterResult.statistics.excluded} already translated items from ${document.name}`);
        }
      }
      
      if (filteredItems.length > 0) {
        documentData.items = {};
        filteredItems.forEach(item => {
          const itemDoc = foundry.utils.duplicate(item);
          const itemData = ItemExporter.getDocumentData(itemDoc, customMapping.Item ?? {}, datasetMapping.Item ?? (datasetMapping.actors ? datasetMapping.items : {}));
          
          // Ensure effects mapping is added if needed
          if (itemData.effects && !(datasetMapping.Item ?? (datasetMapping.actors ? datasetMapping.items : {})).effects) {
            const targetMapping = datasetMapping.Item ?? (datasetMapping.actors ? datasetMapping.items : {});
            targetMapping.effects = { path: 'effects', converter: 'effects' };
          }
          
          const key = documentData.items[item.name] && !foundry.utils.objectsEqual(documentData.items[item.name], itemData) ? item._id : item.name;
          documentData.items[key] = itemData;
        });

        ItemExporter._reorderMapping(datasetMapping.Item ?? (datasetMapping.actors ? datasetMapping.items : {}));
      }
    }

    // Process Active Effects (retained for SWADE)
    if (this._hasContent(document.effects)) {
      documentData.effects = {};
      document.effects.filter(effect => !effect._tombstone).forEach(effect => {
        const { _id, name, description } = effect;
        const effectData = { name, ...(description && { description }) };

        const key = documentData.effects[name] && !foundry.utils.objectsEqual(documentData.effects[name], effectData) ? _id : name;
        documentData.effects[key] = effectData;
      });
    }

    return documentData;
  }

  static addBaseMapping(mapping, document, documentData) {
    // SWADE: Simplified mapping - only items and effects
    if (documentData.items && !mapping.items) {
      mapping.items = { path: 'items', converter: 'items' };
    }
    if (documentData.effects && !mapping.effects) {
      mapping.effects = { path: 'effects', converter: 'effects' };
    }
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const document = await this.pack.getDocument(indexDocument._id);

      const documentData = await ActorExporter.getDocumentData(
        document, 
        this.options.mapping, 
        this.dataset.mapping,
        this.contentFilter,
        this.options
      );

      ActorExporter.addBaseMapping(this.dataset.mapping.Actor ?? this.dataset.mapping, document, documentData);

      let key = this._getExportKey(document);
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? document._id : key;

      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      if (!this.options.asZip) this._stepProgressBar();
    }

    ActorExporter._reorderMapping(this.dataset.mapping.Actor ?? this.dataset.mapping);
  }

  /**
   * Filter embedded items using smart content filtering
   * @param {Array} embeddedItems - Array of embedded items
   * @param {Object} options - Filtering options
   * @returns {Promise<Array>} Filtered items
   */
  async filterEmbeddedItems(embeddedItems, options = {}) {
    if (!this.contentFilter) {
      return embeddedItems;
    }

    const filterResult = await this.contentFilter.filterEmbeddedItems(embeddedItems, options);
    return filterResult.filteredItems;
  }

  /**
   * Check if an embedded item should be included in export
   * @param {Object} item - Item to check
   * @returns {Promise<boolean>} Whether to include the item
   */
  async shouldIncludeEmbeddedItem(item) {
    if (!this.contentFilter) {
      return true;
    }

    // If user wants all embedded items, include everything
    if (this.options.includeAllEmbeddedItems) {
      return true;
    }

    // If smart filtering is disabled, include everything
    if (this.options.enableSmartFiltering === false) {
      return true;
    }

    // Use smart filtering logic
    const compendiumId = this._getItemCompendiumId(item.type);
    if (!compendiumId) {
      return true; // Include if we can't determine compendium
    }

    const isTranslated = await this.contentFilter.isItemAlreadyTranslated(item, compendiumId);
    if (!isTranslated) {
      return true; // Include untranslated items
    }

    // Check if content has changed
    const existingTranslation = await this._getExistingTranslation(item, compendiumId);
    return await this.contentFilter.hasContentChanged(item, existingTranslation);
  }

  /**
   * Get the compendium ID for a given item type
   * @private
   * @param {string} itemType - Type of the item
   * @returns {string|null} Compendium ID or null if not found
   */
  _getItemCompendiumId(itemType) {
    // Map item types to their corresponding compendium IDs
    const typeToCompendiumMap = {
      'edge': 'swade-core-rules.swade-edges',
      'hindrance': 'swade-core-rules.swade-hindrances',
      'power': 'swade-core-rules.swade-powers',
      'weapon': 'swade-core-rules.swade-equipment',
      'armor': 'swade-core-rules.swade-equipment',
      'gear': 'swade-core-rules.swade-equipment',
      'skill': 'swade-core-rules.swade-skills',
      'ability': 'swade-core-rules.swade-abilities'
    };

    return typeToCompendiumMap[itemType] || null;
  }

  /**
   * Get existing translation for an item
   * @private
   * @param {Object} item - Item object
   * @param {string} compendiumId - Compendium ID
   * @returns {Promise<Object|null>} Existing translation or null
   */
  async _getExistingTranslation(item, compendiumId) {
    if (!this.contentFilter || !this.contentFilter.translationDatabase) {
      return null;
    }

    try {
      return await this.contentFilter.translationDatabase.getTranslation(
        item._id || item.name,
        compendiumId
      );
    } catch (error) {
      console.warn(`ActorExporter: Error getting existing translation for ${item.name}:`, error);
      return null;
    }
  }
}