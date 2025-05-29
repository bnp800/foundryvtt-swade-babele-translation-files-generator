export class AbstractExporter {
    options;
    dataset = {
        label: '',
        mapping: {},
        folders: {},
        entries: {}
    };
    /**
     * @typedef {CompendiumCollection}
     */
    pack;

    progressNbImported;
    progressTotalElements;
    progressBar;

    constructor(pack, options, existingFile) {
        if (this.constructor === AbstractExporter) {
            throw new TypeError('Abstract class "AbstractExporter" cannot be instantiated directly');
        }

        this.options = options;
        this.pack = pack;
        this.existingFile = existingFile;
        this.existingContent = {};
        this.existingFolders = {};
        this.dataset.label = pack.metadata.label;
        this.progressNbImported = 0;
        this.progressTotalElements = pack.index.size;
        if (!this.options.asZip) this.progressBar = ui.notifications.info("BTFG.Exporter.ExportRunning", { localize: true, progress: true });
    }

    async export() {
        ui.notifications.info(game.i18n.format('BTFG.Exporter.PleaseWait', { label: this.pack.metadata.label }));

        await this._processExistingEntries();
        await this._processCustomMapping();
        await this._processDataset();
        await this._processFolders();

        if (this.options.sortEntries) {
            this.dataset.entries = this._sortItems(this.dataset.entries);
            this.dataset.folders = this._sortItems(this.dataset.folders);
        }

        if (!this.options.asZip) this._downloadFile();
    }

    async _processExistingEntries() {
        if (!this.existingFile) return;

        try {
            const jsonString = await foundry.utils.readTextFromFile(this.existingFile);
            const json = JSON.parse(jsonString);

            if (!json?.entries) {
                return ui.notifications.error(game.i18n.format('BTFG.Errors.CanNotGenerateModule', {
                    name: this.existingFile.name,
                }));
            }

            this.existingContent = json.entries;
            this.existingFolders = json.folders ?? {};
            this.dataset.label = json.label ?? this.dataset.label;
        } catch (err) {
            return ui.notifications.error(game.i18n.format('BTFG.Errors.CanNotReadFile', {
                name: this.existingFile.name,
            }));
        }
    }

    async _processCustomMapping() {
        const mappingTypes = { Actor: "actors", Item: "items", Scene: "scenes", JournalEntry: "journals" };

        if (this.pack.metadata.type === "Adventure") {
            this.dataset.mapping = Object.fromEntries(Object.values(mappingTypes).map(type => [type, {}]));

            Object.entries(mappingTypes).forEach(([packType, key]) => {
                Object.values(this.options.mapping[packType] ?? {}).forEach(({ key: k, value: v }) => {
                    this.dataset.mapping[key][k] = v;
                });

                if (!Object.keys(this.dataset.mapping[key]).length) delete this.dataset.mapping[key];
            });
        } else {
            if (mappingTypes[this.pack.metadata.type]) {
                Object.values(this.options.mapping[this.pack.metadata.type] ?? {}).forEach(({ key, value }) => {
                    this.dataset.mapping[key] = value;
                });
            }
        }
    }

    async _processDataset() {
        throw new Error('You must implement this function');
    }

    async _processFolders() {
        this.pack.folders.forEach((folder) => {
            const name = folder.name;
            this.dataset.folders[name] = this.existingFolders[name] ?? name;
        });
    }

    static _getValueFromMapping(obj, mapping) {
        return mapping.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    static _addCustomMapping(customMapping, indexDocument, documentData, keysToIgnore = []) {
        Object.values(customMapping).forEach(({ key, value }) => {
            if (keysToIgnore.includes(value)) return;
            const documentValue = this._getValueFromMapping(indexDocument, value);
            if (documentValue) documentData[key] = documentValue;
        });
    }

    static _hasContent(dataset) {
        if (!dataset) return false;
        return Array.isArray(dataset) ? dataset.length : dataset.size;
    }

    _removeEmptyObjects(obj) {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, value]) =>
                !(typeof value === "object" && value !== null && Object.keys(value).length === 0)
            )
        );
    }

    _getDataset() {
        return this._removeEmptyObjects(this.dataset);
    }

    _getStringifiedDataset() {
        return JSON.stringify(this._removeEmptyObjects(this.dataset), null, 2);
    }

    _downloadFile() {
        ui.notifications.info(game.i18n.localize('BTFG.Exporter.ExportFinished'));

        foundry.utils.saveDataToFile(this._getStringifiedDataset(), 'text/json', `${this.pack.metadata.id}.json`);
    }

    _sortItems(items) {
        return Object.keys(items)
            .sort()
            .reduce((acc, key) => ({
                ...acc,
                [key]: items[key],
            }), {});
    }

    _stepProgressBar() {
        ++this.progressNbImported;
        this.progressBar.update({ pct: this.progressNbImported / this.progressTotalElements });
    }

    _getExportKey(document) {
        return this.options.useIdAsKey ? document._id : document.name;
    }
}