import { AbstractExporter } from './abstract-exporter.mjs';

export class ItemExporter extends AbstractExporter {
    static getDocumentData(document, customMapping, datasetMapping) {
        const { name, type, system } = document;
        const documentData = { name };

        // SWADE: Extract system.description (all items have it)
        if (system?.description) documentData.description = system.description;

        // SWADE: Extract system.notes (all items have it since itemDescription() is shared)
        if (system?.notes) documentData.notes = system.notes;

        // SWADE: Extract system.source (all items have it since itemDescription() is shared)
        if (system?.source) documentData.source = system.source;

        // SWADE Edge: Extract requirements field (ArrayField → name list string)
        if (type === "edge" && Array.isArray(system?.requirements) && system.requirements.length) {
            documentData.requirements = system.requirements
                .map(req => req.value ?? '')
                .filter(Boolean)
                .join(', ');
        }

        // SWADE Power: Extract power-specific fields
        if (type === "power") {
            if (system?.trapping) documentData.trapping = system.trapping;
            if (system?.arcane) documentData.arcane = system.arcane;
            if (system?.rank) documentData.rank = system.rank;
            if (system?.damage) documentData.damage = system.damage;
            if (system?.range) documentData.range = system.range;
            if (system?.duration) documentData.duration = system.duration;
        }

        // SWADE Weapon: Extract weapon-specific text fields
        if (type === "weapon") {
            if (system?.ammo) documentData.ammo = system.ammo;
            if (system?.minStr) documentData.minStr = system.minStr;
        }

        const mappingAdded = this._addCustomMapping(customMapping, document, documentData);
        datasetMapping = foundry.utils.mergeObject(datasetMapping, mappingAdded);

        // Active Effects processing (retained for SWADE)
        if (this._hasContent(document.effects)) {
            documentData.effects = {};
            document.effects.forEach(effect => {
                const { _id, name, description } = effect;
                const effectData = { name, ...(description && { description }) };

                const key = documentData.effects[name] && !foundry.utils.objectsEqual(documentData.effects[name], effectData) ? _id : name;
                documentData.effects[key] = effectData;
            });
        }

        return documentData;
    }

    static addBaseMapping(mapping, document, documentData) {
        // SWADE: Simplified mapping - only effects
        if (documentData.effects && !mapping.effects) {
            mapping.effects = { path: 'effects', converter: 'effects' };
        }

        return mapping;
    }

    async _processDataset() {
        const documents = await this.pack.getIndex();

        for (const indexDocument of documents) {
            const document = foundry.utils.duplicate(await this.pack.getDocument(indexDocument._id));
            const documentData = ItemExporter.getDocumentData(document, this.options.mapping.Item, this.dataset.mapping.Item ?? this.dataset.mapping);

            ItemExporter.addBaseMapping(this.dataset.mapping.Item ?? this.dataset.mapping, document, documentData);

            let key = this._getExportKey(document);
            key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? document._id : key;

            this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

            if (!this.options.asZip) this._stepProgressBar();
        }

        ItemExporter._reorderMapping(this.dataset.mapping.Item ?? this.dataset.mapping);
    }
}