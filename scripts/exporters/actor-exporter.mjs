import { AbstractExporter } from './abstract-exporter.mjs';
import { ItemExporter } from './item-exporter.mjs';

export class ActorExporter extends AbstractExporter {
  static getDocumentData(document, customMapping, datasetMapping = {}) {
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

    // Process embedded Items
    if (this._hasContent(document.items)) {
      documentData.items = {};
      document.items.filter(item => !item._tombstone).forEach(item => {
        const itemDoc = foundry.utils.duplicate(item);
        const itemData = ItemExporter.getDocumentData(itemDoc, customMapping.Item ?? {}, datasetMapping.Item ?? (datasetMapping.actors ? datasetMapping.items : {}));
        if (datasetMapping.Item) ItemExporter.addBaseMapping(datasetMapping.Item, itemDoc, itemData);
        const key = documentData.items[item.name] && !foundry.utils.objectsEqual(documentData.items[item.name], itemData) ? item._id : item.name;
        documentData.items[key] = itemData;
      });

      ItemExporter._reorderMapping(datasetMapping.Item ?? (datasetMapping.actors ? datasetMapping.items : {}));
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

      const documentData = ActorExporter.getDocumentData(document, this.options.mapping, this.dataset.mapping);

      ActorExporter.addBaseMapping(this.dataset.mapping.Actor ?? this.dataset.mapping, document, documentData);

      let key = this._getExportKey(document);
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? document._id : key;

      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      if (!this.options.asZip) this._stepProgressBar();
    }

    ActorExporter._reorderMapping(this.dataset.mapping.Actor ?? this.dataset.mapping);
  }
}