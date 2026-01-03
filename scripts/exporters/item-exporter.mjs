import { AbstractExporter } from './abstract-exporter.mjs';

export class ItemExporter extends AbstractExporter {
    static getDocumentData(document, customMapping, datasetMapping) {
        const { name, type, system } = document;
        const documentData = { name };

        // SWADE: Extract system.description field
        if (system?.description) documentData.description = system.description;

        // SWADE Edge: Extract requirements field
        if (type === "edge" && system?.requirements) {
            documentData.requirements = system.requirements;
        }

        // SWADE Power: Extract trapping field
        if (type === "power" && system?.trapping) {
            documentData.trapping = system.trapping;
        }

        // SWADE Weapon/Gear: Extract notes field
        if ((type === "weapon" || type === "gear") && system?.notes) {
            documentData.notes = system.notes;
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