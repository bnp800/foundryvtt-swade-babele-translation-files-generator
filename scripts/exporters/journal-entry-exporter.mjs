import { AbstractExporter } from './abstract-exporter.mjs';

export class JournalEntryExporter extends AbstractExporter {
  static getDocumentData(document, customMapping, datasetMapping, srcToInclude) {
    const documentData = { name: document.name };

    const mappingAdded = this._addCustomMapping(customMapping, document, documentData);

    datasetMapping = foundry.utils.mergeObject(datasetMapping, mappingAdded);

    if (this._hasContent(document.categories)) {
      documentData.categories = Object.fromEntries(
        document.categories.map(cat => [cat.name, cat.name])
      );
    }

    if (this._hasContent(document.pages)) {
        const pageTracker = new Set();

        documentData.pages = Object.fromEntries(
            document.pages.map(({ 
                id, 
                name,
                type,
                image: { caption } = {}, 
                src, 
                video: { width, height } = {}, 
                text: { content: text } = {}, 
                system
            }) => {
                const uniqueName = pageTracker.has(name) ? id : name;
                pageTracker.add(name);
                const srcIncluded = (srcToInclude.includes(name) || srcToInclude.includes(id));
                
                const pageData = {
                    name,
                    ...(caption && { caption }),
                    ...(srcIncluded && src && { src }),
                    ...(width && { width }),
                    ...(height && { height }),
                    ...(text && { text })
                };

                // SWADE Headquarters page type support
                if (type === "headquarters" && system) {
                    if (system.advantage) pageData.advantage = system.advantage;
                    if (system.complication) pageData.complication = system.complication;
                    if (system.form?.description) pageData.formDescription = system.form.description;
                    if (system.form?.acquisition) pageData.formAcquisition = system.form.acquisition;
                    if (system.form?.maintenance) pageData.formMaintenance = system.form.maintenance;
                    if (system.upgrades) pageData.upgrades = system.upgrades;
                }

                return [uniqueName, pageData];
            })
        );
    }

    return documentData;
}

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const documentData = JournalEntryExporter.getDocumentData(
        await this.pack.getDocument(indexDocument._id),
        this.options.mapping.JournalEntry,
        this.dataset.mapping.JournalEntry ?? this.dataset.mapping,
        this.options.pillsByType.JournalEntry.srcToInclude
      );

      let key = this._getExportKey(indexDocument);
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? indexDocument._id : key;
      
      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      if (!this.options.asZip) this._stepProgressBar();
    }
  }
}