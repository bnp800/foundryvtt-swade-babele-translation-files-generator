import { AbstractExporter } from './abstract-exporter.mjs';

export class RollTableExporter extends AbstractExporter {
  static getDocumentData(document) {
    const { name, description } = document;
    const documentData = { name, ...(description && { description }) };

    if (this._hasContent(document.results)) {
        const rangeCount = new Map();
        
        document.results.forEach(res => {
            const range = `${res.range[0]}-${res.range[1]}`;
            rangeCount.set(range, (rangeCount.get(range) || 0) + 1);
        });
        
        documentData.results = Object.fromEntries(
            document.results.map(({ _id, type, range, description  }) => {
                const rangeStr = `${range[0]}-${range[1]}`;
                return type !== "document" ? [rangeCount.get(rangeStr) > 1 ? _id : rangeStr, description] : undefined;
            }).filter(Boolean)
        );
    }

    if (Object.keys(documentData.results).length === 0) delete documentData.results;

    return documentData;
  }

  async _processDataset() {
    const documents = await this.pack.getIndex();

    for (const indexDocument of documents) {
      const documentData = RollTableExporter.getDocumentData(await this.pack.getDocument(indexDocument._id));

      let key = this._getExportKey(indexDocument);
      key = this.dataset.entries[key] && !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) ? indexDocument._id : key;
      
      this.dataset.entries[key] = foundry.utils.mergeObject(documentData, this.existingContent[key] ?? {});

      if (!this.options.asZip) this._stepProgressBar();
    }
  }
}