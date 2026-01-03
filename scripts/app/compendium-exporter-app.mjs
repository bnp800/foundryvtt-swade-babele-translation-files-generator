const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { ArrayField, SchemaField, StringField, BooleanField } = foundry.data.fields;
import { ExporterInstanciator } from "../exporters/exporter-instanciator.mjs";

export class CompendiumExporterApp extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(...args) {
        super(...args);

        this._loadPackMapping();
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        id: "compendium-exporter-{id}",
        classes: ["compendium-exporter"],
        tag: "form",
        window: {
            title: "BTFG.CompendiumExporter.Title",
            minimizable: true,
            resizable: true
        },
        actions: {
            toggleCollapse: CompendiumExporterApp.#onToggleCollapse,
            openPack: CompendiumExporterApp.#onOpenPack,
            addMapping: CompendiumExporterApp.#addMapping,
            deleteMapping: CompendiumExporterApp.#deleteMapping,
            editPills: CompendiumExporterApp.#editPills,
            validatePills: CompendiumExporterApp.#validatePills,
            removePill: CompendiumExporterApp.#removePill,
            exportMapping: CompendiumExporterApp.#exportMapping,
            importMapping: CompendiumExporterApp.#importMapping,
            unselectFile: CompendiumExporterApp.#unselectFile,
            previewExport: CompendiumExporterApp.#previewExport
        },
        form: {
            handler: CompendiumExporterApp.#onHandleSubmit,
            submitOnChange: true,
            closeOnSubmit: false
        },
        position: {
            width: 1100,
            height: 800
        }
    };

    /** @override */
    static PARTS = {
        sidebar: {
            id: "sidebar",
            classes: ["sidebar"],
            template: "modules/swade-babele-translation-files-generator/templates/sidebar.hbs"
        },
        export: {
            id: "export",
            classes: ["export-options"],
            template: "modules/swade-babele-translation-files-generator/templates/export.hbs",
            templates: ["templates/generic/tab-navigation.hbs"],
            scrollable: [""]
        },
        footer: {
            classes: ["flexrow"],
            template: "templates/generic/form-footer.hbs",
        }
    };

    /** @override */
    static TABS = [
        { id: "Actor", icon: "fa-solid fa-user", condition: this.IsActorPack.bind(this) },
        { id: "Item", icon: "fa-solid fa-suitcase", condition: this.IsItemPack.bind(this) },
        { id: "Scene", icon: "fa-solid fa-map", condition: this.IsScenePack.bind(this) },
        { id: "JournalEntry", icon: "fa-solid fa-book-open", condition: this.IsJournalEntryPack.bind(this) }
    ];

    /**
    * Data Model.
    * @type {MappingModel}
    */
    #mappings = new MappingModel();

    /**
    * Data Model.
    * @type {MappingModel}
    */
    #options = new OptionsModel();

    /**
    * Currently selected tab.
    */
    #activeTab;

    /**
    * Currently selected pack.
    */
    #packId;

    /**
    * Currently packs ids.
    */
    #packsIds;

    /**
    * Currently selected packs.
    */
    #selectedPacks = [];

    /**
    * Currently selected file.
    */
    #selectedFile;

    #pillsByType = {
        RollTable: { rangeToInclude: [] },
        JournalEntry: { srcToInclude: [] }
    };

    #pillsEditModeByType = {
        RollTable: false,
        JournalEntry: false
    };

    #collapseAdvanced = true;

    /**
     * Export preview data
     */
    #exportPreview = null;

    /**
     * Whether preview is currently being generated
     */
    #previewLoading = false;

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Pack
        const pack = this._getPack();
        context.pack = pack;
        context.packName = pack ? pack.metadata.label : game.i18n.localize("BTFG.CompendiumExporter.BulkExport");
        context.packIcon = pack ? CONFIG[pack.metadata.type].sidebarIcon : "fa-solid fa-book-atlas";
        context.packType = pack ? pack.metadata.type : null;

        const babele = game?.babele;
        context.translatedPack = babele?.initialized && pack
            ? babele.packs.find(p => p.metadata.id === pack.metadata.id)?.translated
            : false;

        // Packs
        this.#packsIds = [];
        var packs = {};
        game.packs.forEach(pack => {
            this.#packsIds.push(pack.metadata.id);

            const packageName = pack.metadata.packageName;
            if (!packs[packageName]) packs[packageName] = {
                icon: foundry.packages.PACKAGE_TYPES[pack.metadata.packageType]?.icon
            };

            packs[packageName][pack.metadata.name] = {
                id: pack.metadata.id,
                label: pack.metadata.label,
                type: pack.metadata.type,
                icon: CONFIG[pack.metadata.type].sidebarIcon
            };
        });

        context.packs = packs;

        context.selectedPacks = this.#selectedPacks;

        // Tabs
        this.#activeTab = !this.#activeTab ? "Actor" : this.#activeTab;
        context.tabs = this.constructor.TABS.reduce((tabs, { id, icon, condition }) => {
            if (!condition || condition(context.pack)) tabs.push({
                id, icon,
                group: "mapping",
                active: this.#activeTab === id,
                label: `DOCUMENT.${id}`,
                cssClass: [this.#activeTab === id ? "active" : null].filterJoin(" ")
            });
            return tabs;
        }, []);

        // Mappings
        const mappings = (context.mappings = []);
        for (const [i, mapping] of this.#mappings[this.#activeTab].entries()) {
            mappings[this.#activeTab] ??= [];
            mappings[this.#activeTab].push({
                idx: i,
                key: {
                    field: this.#mappings.schema.getField(`${this.#activeTab}.element.key`),
                    value: mapping.key,
                    name: `${this.#activeTab}.${i}.key`,
                    placeholder: "customKey"
                },
                value: {
                    field: this.#mappings.schema.getField(`${this.#activeTab}.element.value`),
                    value: mapping.value,
                    name: `${this.#activeTab}.${i}.value`,
                    placeholder: "system.subData.customKey"
                }
            });
        }

        context.collapseAdvanced = this.#collapseAdvanced;

        context.pillsByType = this.#pillsByType;
        context.pillsEditModeByType = this.#pillsEditModeByType;
        context.pillsInputByType = Object.fromEntries(
            Object.entries(this.#pillsByType).map(([type, pillsObj]) => {
                const key = Object.keys(pillsObj)[0];
                return [type, pillsObj[key].join(";")];
            })
        );

        context.hasAdvanced = pack ? Object.keys(this.#pillsByType).includes(pack.metadata.type) || pack.metadata.type === "Adventure" : true;

        // Selected File
        context.selectedFileName = this.#selectedFile?.name;

        // Options
        context.includeCustomMappingInFiles = {
            field: this.#options.schema.getField("includeCustomMappingInFiles"),
            value: this.#options.includeCustomMappingInFiles,
        };

        context.exportMappingWithPacks = {
            field: this.#options.schema.getField("exportMappingWithPacks"),
            value: this.#options.exportMappingWithPacks,
        };

        context.sortEntries = {
            field: this.#options.schema.getField("sortEntries"),
            value: this.#options.sortEntries,
        };

        context.useIdAsKey = {
            field: this.#options.schema.getField("useIdAsKey"),
            value: this.#options.useIdAsKey,
        };

        // Mapping preservation options
        context.preserveExistingMappings = {
            field: this.#options.schema.getField("preserveExistingMappings"),
            value: this.#options.preserveExistingMappings,
        };

        context.validateMappingCompleteness = {
            field: this.#options.schema.getField("validateMappingCompleteness"),
            value: this.#options.validateMappingCompleteness,
        };

        // Smart filtering options
        context.enableSmartFiltering = {
            field: this.#options.schema.getField("enableSmartFiltering"),
            value: this.#options.enableSmartFiltering,
        };

        context.includeAllEmbeddedItems = {
            field: this.#options.schema.getField("includeAllEmbeddedItems"),
            value: this.#options.includeAllEmbeddedItems,
        };

        // Incremental export options
        context.enableIncrementalExport = {
            field: this.#options.schema.getField("enableIncrementalExport"),
            value: this.#options.enableIncrementalExport,
        };

        // Export preview
        context.exportPreview = this.#exportPreview;
        context.previewLoading = this.#previewLoading;

        // Buttons
        context.buttons = [
            {
                type: "button",
                action: "previewExport",
                icon: "fa-solid fa-eye",
                label: "BTFG.CompendiumExporter.PreviewExport",
            },
            {
                type: "submit",
                icon: "fa-solid fa-check",
                label: "BTFG.CompendiumExporter.GenerateFile",
            }
        ];

        return context;
    }

    /** @inheritDoc */
    changeTab(tab, group, options = {}) {
        super.changeTab(tab, group, options);
        this.#activeTab = tab;
        this.render({ parts: ["export"] });
    }

    /**
     * Handle toggling the collapsed state of a collapsible section.
     * @this {CompendiumBrowser}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
     */
    static async #onToggleCollapse(event, target) {
        this.#collapseAdvanced = target.closest(".collapsible")?.classList.toggle("collapsed");
    }

    /**
     * Handle opening a compendium.
     * @this {CompendiumExporterApp}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
     */
    static async #onOpenPack(event, target) {
        const dataPackId = target.getAttribute("data-pack-id");
        if (this.#packId === dataPackId) return;
        this.#packId = dataPackId;

        const pack = this._getPack();
        this.#activeTab = (!pack || !pack.metadata?.type)
            ? "Actor" : ["Actor", "Item", "Scene", "JournalEntry"].includes(pack.metadata.type)
                ? pack.metadata.type : "Actor";

        this._loadPackMapping();

        this.render({ parts: ["export"] });
    }

    /**
     * Add a custom mapping.
     * @this {CompendiumExporterApp}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
     */
    static async #addMapping(event, target) {
        const mappings = this.#mappings.toObject()[this.#activeTab];
        mappings.push({ key: "", value: "" });
        this.#mappings.updateSource({ [this.#activeTab]: mappings });
        this.render({ parts: ["export"] });
    }

    /**
     * Delete a custom mapping.
     * @this {CompendiumExporterApp}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
     */
    static async #deleteMapping(event, target) {
        const idx = parseInt(target.dataset.idx);
        const mappings = this.#mappings.toObject()[this.#activeTab];
        mappings.splice(idx, 1);
        this.#mappings.updateSource({ [this.#activeTab]: mappings });
        await this._savePackMapping();
        this.render({ parts: ["export"] });
    }

    /**
     * Edit pills.
     * @this {CompendiumExporterApp}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
     */
    static async #editPills(event, target) {
        const type = target.dataset.type;
        this.#pillsEditModeByType[type] = true;
        this.render({ parts: ["export"] });
    }

    /**
     * Validate pills.
     * @this {CompendiumExporterApp}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
    */
    static async #validatePills(event, target) {
        const type = target.dataset.type;
        this.#pillsEditModeByType[type] = false;
        this.render({ parts: ["export"] });
    }

    /**
     * Remove pill.
     * @this {CompendiumExporterApp}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
    */
    static async #removePill(event, target) {
        const idx = parseInt(target.dataset.idx);
        const type = target.dataset.type;
        const key = Object.keys(this.#pillsByType[type])[0];
        this.#pillsByType[type][key].splice(idx, 1);
        this.render({ parts: ["export"] });
    }

    /**
     * Export custom mapping.
     * @this {CompendiumExporterApp}
     * @param {PointerEvent} event  The originating click event.
     * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
     */
    static async #exportMapping(event, target) {
        event.preventDefault();

        const formattedData = this._formatExportMapping();

        if (formattedData) {
            const pack = this._getPack();
            const filename = pack ? `mapping-${pack.metadata.label}` : "mapping";
            foundry.utils.saveDataToFile(JSON.stringify(formattedData, null, 2), "text/json", `${filename}.json`);
        }
    }

    /**
    * Import custom mapping.
    * @this {CompendiumExporterApp}
    * @param {PointerEvent} event  The originating click event.
    * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
    */
    static async #importMapping(event, target) {
        event.preventDefault();

        const input = target.closest(".mapping-actions")?.querySelector('#import-custom-mapping-input');
        if (!input) return;

        input.value = "";
        input.addEventListener('change', (e) => this._overrideMappings(e));

        input.click();
    }

    /**
    * Import custom mapping.
    * @this {CompendiumExporterApp}
    * @param {PointerEvent} event  The originating click event.
    * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
    */
    static #unselectFile(event, target) {
        event.preventDefault();

        this.#selectedFile = null;

        this.render({ parts: ["export"] });
    }

    /**
    * Preview export content.
    * @this {CompendiumExporterApp}
    * @param {PointerEvent} event  The originating click event.
    * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
    */
    static async #previewExport(event, target) {
        event.preventDefault();

        if (this.#previewLoading) return;

        this.#previewLoading = true;
        this.render({ parts: ["export"] });

        try {
            const pack = this._getPack();
            
            if (!pack && this.#selectedPacks.length === 0) {
                ui.notifications.warn(game.i18n.localize("BTFG.CompendiumExporter.NoPackSelected"));
                return;
            }

            const preview = {
                totalItems: 0,
                mappingFields: [],
                contentSummary: {},
                smartFilteringResults: null,
                mappingPreview: null
            };

            if (pack) {
                // Single pack preview
                const documents = await pack.getIndex();
                preview.totalItems = documents.size;
                preview.contentSummary[pack.metadata.label] = {
                    type: pack.metadata.type,
                    count: documents.size
                };

                // Get mapping fields for this pack type
                const mappings = this.#mappings[pack.metadata.type] || [];
                preview.mappingFields = mappings.filter(m => m.key && m.value).map(m => ({
                    key: m.key,
                    value: m.value,
                    type: pack.metadata.type
                }));

                // Generate detailed mapping preview
                preview.mappingPreview = this._generateMappingPreview(pack.metadata.type, mappings);

                // Smart filtering preview for Actor packs
                if (pack.metadata.type === "Actor" && this.#options.enableSmartFiltering) {
                    preview.smartFilteringResults = {
                        enabled: true,
                        includeAllEmbedded: this.#options.includeAllEmbeddedItems,
                        message: this.#options.includeAllEmbeddedItems 
                            ? "All embedded items will be included"
                            : "Only untranslated or changed embedded items will be included"
                    };
                }
            } else {
                // Multi-pack preview
                const mappingsByType = {};
                for (const packId of this.#selectedPacks) {
                    const selectedPack = game.packs.get(packId);
                    if (selectedPack) {
                        const documents = await selectedPack.getIndex();
                        preview.totalItems += documents.size;
                        preview.contentSummary[selectedPack.metadata.label] = {
                            type: selectedPack.metadata.type,
                            count: documents.size
                        };

                        // Collect mapping fields from all selected packs
                        const mappings = this.#mappings[selectedPack.metadata.type] || [];
                        const packMappings = mappings.filter(m => m.key && m.value).map(m => ({
                            key: m.key,
                            value: m.value,
                            type: selectedPack.metadata.type,
                            pack: selectedPack.metadata.label
                        }));
                        preview.mappingFields.push(...packMappings);

                        // Group mappings by type for preview
                        if (!mappingsByType[selectedPack.metadata.type]) {
                            mappingsByType[selectedPack.metadata.type] = mappings;
                        }
                    }
                }

                // Generate combined mapping preview
                preview.mappingPreview = {};
                for (const [type, mappings] of Object.entries(mappingsByType)) {
                    preview.mappingPreview[type] = this._generateMappingPreview(type, mappings);
                }
            }

            this.#exportPreview = preview;
        } catch (error) {
            console.error("Error generating export preview:", error);
            ui.notifications.error("Failed to generate export preview");
            this.#exportPreview = null;
        } finally {
            this.#previewLoading = false;
            this.render({ parts: ["export"] });
        }
    }

    /**
     * Generate detailed mapping configuration preview
     * @param {string} documentType - The document type (Actor, Item, etc.)
     * @param {Array} customMappings - Custom mappings for this type
     * @returns {Object} Mapping preview data
     * @private
     */
    _generateMappingPreview(documentType, customMappings) {
        const preview = {
            documentType,
            customFields: customMappings.filter(m => m.key && m.value).length,
            standardFields: 0,
            totalFields: 0,
            preservationEnabled: this.#options.preserveExistingMappings,
            validationEnabled: this.#options.validateMappingCompleteness,
            fields: []
        };

        // Add custom mapping fields
        customMappings.filter(m => m.key && m.value).forEach(mapping => {
            preview.fields.push({
                key: mapping.key,
                value: mapping.value,
                source: 'custom'
            });
        });

        // Simulate standard fields that would be added (this would normally come from templates)
        const standardFieldsMap = {
            'Item': ['description', 'notes', 'source', 'category'],
            'Actor': ['biography', 'appearance', 'notes', 'goals'],
            'Scene': ['description', 'notes'],
            'JournalEntry': ['content', 'text']
        };

        const standardFields = standardFieldsMap[documentType] || [];
        preview.standardFields = standardFields.length;

        // Add standard fields to preview if they're not already custom mapped
        const customKeys = new Set(preview.fields.map(f => f.key));
        standardFields.forEach(field => {
            if (!customKeys.has(field)) {
                preview.fields.push({
                    key: field,
                    value: `system.${field}`,
                    source: 'standard'
                });
            }
        });

        preview.totalFields = preview.fields.length;

        return preview;
    }

    /**
    * Handle form submission with selection.
    * @this {CompendiumExporterApp}
    * @param {SubmitEvent} event          The form submission event.
    * @param {HTMLFormElement} form       The submitted form element.
    * @param {FormDataExtended} formData  The data from the submitted form.
    */
    static async #onHandleSubmit(event, form, formData) {
        switch (event.type) {
            case "change":
                if (event.target?.files && event.target.files[0] && 'existingFile' === event.target.id) {
                    this.#selectedFile = event.target.files[0];
                    await this._loadFileMapping();
                }

                const data = foundry.utils.duplicate(formData.object);

                this.#selectedPacks = Object.keys(data).filter(key => this.#packsIds.includes(key) && data[key] === true);

                const pillsInput = Object.entries(data)
                    .filter(([key]) => key.startsWith("pillsInput."))
                    .reduce((acc, [key, value]) => {
                        const type = key.split(".")[1];
                        acc[type] = value;
                        return acc;
                    }, {});

                for (const [type, value] of Object.entries(pillsInput)) {
                    const pills = value.split(";").map(t => t.trim()).filter(Boolean);
                    const key = Object.keys(this.#pillsByType[type])[0];
                    this.#pillsByType[type][key] = pills;
                    this.#pillsEditModeByType[type] = false;
                }

                this.#options.updateSource(foundry.utils.duplicate(data))

                this.#mappings.updateSource(foundry.utils.duplicate(data));
                await this._savePackMapping();

                this.render({ parts: ["export"] });
                break;
            case "submit":
                var pack = this._getPack();

                if (!pack && !this.#options.exportMappingWithPacks && this.#selectedPacks.length === 1) {
                    pack = this._getPack(this.#selectedPacks[0]);
                }

                const options = {
                    mapping: this.#mappings,
                    pillsByType: this.#pillsByType,
                    sortEntries: this.#options.sortEntries,
                    useIdAsKey: this.#options.useIdAsKey,
                    // Mapping preservation options
                    preserveExistingMappings: this.#options.preserveExistingMappings,
                    validateMappingCompleteness: this.#options.validateMappingCompleteness,
                    // Smart filtering options
                    enableSmartFiltering: this.#options.enableSmartFiltering,
                    includeAllEmbeddedItems: this.#options.includeAllEmbeddedItems,
                    // Incremental export options
                    enableIncrementalExport: this.#options.enableIncrementalExport
                };

                if (pack) {
                    await ExporterInstanciator.createForPack(pack, options, this.#selectedFile).export();
                }
                else if (this.#selectedPacks.length >= 1) {
                    await this._exportPacks();
                }
                break;
        }
    }

    /**
   * @returns {CompendiumCollection|null}
   * @private
   */
    _getPack(packId) {
        packId ??= this.#packId
        if (!packId) return null;

        const pack = game.packs.get(packId);
        if (!pack) {
            ui.notifications.error(game.i18n.format('BTFG.CompendiumExporter.CompendiumNotFound', { id: packId }));
            return null;
        }

        return pack;
    }

    _loadPackMapping() {
        const packsMappings = game.settings.get("swade-btfg", "packs-mappings");
        const pack = this.#packId ?? "massive-export";
        this.#mappings.updateSource(packsMappings[pack.replace('.', '-')] ?? {
            Actor: [], Item: [], Scene: [], JournalEntry: []
        });
    }

    async _savePackMapping() {
        const savedMapping = game.settings.get("swade-btfg", "packs-mappings");
        const pack = this.#packId ?? "massive-export";
        savedMapping[pack.replace('.', '-')] = this.#mappings;
        await game.settings.set("swade-btfg", "packs-mappings", savedMapping);
    }

    async _overrideMappings(e) {
        e.preventDefault();

        if (!e.target?.files || !e.target.files[0] || 'import-custom-mapping-input' !== e.target.id) return;

        await this._loadFileMapping(e.target.files[0]);
    }

    _formatExportMapping() {
        const pack = this._getPack();

        const filteredTypes = {
            Adventure: ["Actor", "Item", "Scene", "JournalEntry"],
            Actor: ["Actor", "Item"]
        };

        const allowedTypes = pack ? filteredTypes[pack.metadata.type] || [`${pack.metadata.type}`] : Object.keys(this.#mappings);

        const formattedData = Object.fromEntries(
            Object.entries(this.#mappings)
                .filter(([type]) => allowedTypes.includes(type))
                .map(([type, entries]) => [
                    type,
                    entries.reduce((acc, { key, value }) => {
                        acc[key] = value;
                        return acc;
                    }, {})
                ]).filter(([_, obj]) => Object.keys(obj).length > 0)
        );

        if (Object.keys(formattedData).length === 0) {
            ui.notifications.warn(game.i18n.format('BTFG.CompendiumExporter.NoExportCustomMapping', {
                pack: pack ? pack.metadata.label : game.i18n.localize("BTFG.CompendiumExporter.BulkExport")
            }));
            return null;
        }

        return formattedData;
    }

    _reorderMappingGlobal(mappingGlobal) {
        const typeOrder = ["Actor", "Item", "Scene", "JournalEntry"];
        const reorderedGlobal = {};

        for (const type of typeOrder) {
            const mapping = mappingGlobal[type];
            if (!mapping) continue;

            const stringMapping = [];
            const objectMapping = [];

            for (const [key, value] of Object.entries(mapping)) {
                if (typeof value === "string") {
                    stringMapping.push([key, value]);
                } else {
                    objectMapping.push([key, value]);
                }
            }

            reorderedGlobal[type] = Object.fromEntries([...stringMapping, ...objectMapping]);
        }

        for (const key of Object.keys(mappingGlobal)) {
            delete mappingGlobal[key];
        }

        for (const [type, value] of Object.entries(reorderedGlobal)) {
            mappingGlobal[type] = value;
        }
    }

    async _exportPacks() {
        const zip = new JSZip();
        const options = {
            mapping: this.#mappings,
            pillsByType: this.#pillsByType,
            sortEntries: this.#options.sortEntries,
            useIdAsKey: this.#options.useIdAsKey,
            asZip: true,
            // Mapping preservation options
            preserveExistingMappings: this.#options.preserveExistingMappings,
            validateMappingCompleteness: this.#options.validateMappingCompleteness,
            // Smart filtering options
            enableSmartFiltering: this.#options.enableSmartFiltering,
            includeAllEmbeddedItems: this.#options.includeAllEmbeddedItems,
            // Incremental export options
            enableIncrementalExport: this.#options.enableIncrementalExport
        };

        var mapping = {};

        const progressBar = ui.notifications.info("BTFG.Exporter.ExportRunning", { localize: true, progress: true });
        var progressNbImported = 0;

        for (const packId of this.#selectedPacks) {
            const pack = game.packs.get(packId);
            if (!pack) continue;

            const exporter = ExporterInstanciator.createForPack(pack, options);
            await exporter.export();

            var dataset = exporter._getDataset();

            mapping = foundry.utils.mergeObject(mapping, dataset.mapping);

            if (this.#options.includeCustomMappingInFiles) {
                const mappingTypes = { Actor: "actors", Item: "items", Scene: "scenes", JournalEntry: "journals" };
                if (pack.metadata.type === "Adventure") {
                    const remapped = {};
                    for (const [key, value] of Object.entries(dataset.mapping)) {
                        const newKey = mappingTypes[key] ?? key;
                        remapped[newKey] = value;
                    }

                    dataset.mapping = remapped;
                } else {
                    if (mappingTypes[pack.metadata.type]) {
                        dataset.mapping = dataset.mapping[pack.metadata.type];
                    }
                }
            } else {
                delete dataset.mapping;
            }

            zip.file(`${pack.metadata.id}.json`, JSON.stringify(dataset, null, 2));

            ++progressNbImported;
            progressBar.update({ pct: progressNbImported / this.#selectedPacks.length });
        }

        if (this.#options.exportMappingWithPacks) {
            for (const key in mapping) {
                if (Object.keys(mapping[key]).length === 0) delete mapping[key];
            }

            this._reorderMappingGlobal(mapping);

            zip.file("mapping.json", JSON.stringify(mapping, null, 2));
        }

        ui.notifications.info(game.i18n.localize('BTFG.Exporter.ExportFinished'));

        zip.generateAsync({ type: "blob" }).then((content) => {
            foundry.utils.saveDataToFile(content, "application/zip", "compendium-export.zip");
        });
    }

    async _loadFileMapping(file = null) {
        file ??= this.#selectedFile

        try {
            const jsonString = await foundry.utils.readTextFromFile(file);
            const json = JSON.parse(jsonString);

            const pack = this._getPack();

            const allMapping = ["Actor", "Item", "Scene", "JournalEntry"];

            if (pack && !allMapping.includes(pack.metadata.type)) return;

            const filteredTypes = {
                Adventure: allMapping,
                Actor: ["Actor", "Item"]
            };

            const allowedTypes = pack ? filteredTypes[pack.metadata.type] || [`${pack.metadata.type}`] : Object.keys(this.#mappings);

            const mapping = json.mapping ? { [pack.metadata.type]: json.mapping } : json;

            const formattedMappings = Object.fromEntries(
                allowedTypes.map(type => {
                    const entries = mapping[type] ?? {};
                    const formatted = Object.entries(entries)
                        .filter(([_, value]) => typeof value === "string")
                        .map(([key, value]) => ({ key, value }));
                    return [type, formatted];
                })
            );

            const hasContent = Object.values(formattedMappings).some(arr => arr.length > 0);
            if (!hasContent) {
                ui.notifications.warn(game.i18n.format('BTFG.CompendiumExporter.NoImportCustomMapping', {
                    pack: pack ? pack.metadata.label : game.i18n.localize("BTFG.CompendiumExporter.BulkExport"),
                    file: file.name
                }));
                return;
            }

            this.#mappings.updateSource(formattedMappings);
            await this._savePackMapping();

            this.render({ parts: ["export"] });
        } catch (error) {
            ui.notifications.error(game.i18n.format('BTFG.Errors.CanNotReadFile', {
                name: file.name
            }));

            console.error(error);
        }
    }

    /**
     * Check whether a pack matches a given type.
     * @param {Object} pack - Pack to check.
     * @param {Array<string>} validTypes - Accepted types.
     * @returns {boolean}
     */
    static IsPackType(pack, validTypes) {
        if (!pack) return true;
        return validTypes.includes(pack.metadata.type);
    }

    /** Determine whether an Pack is Actor type. */
    static IsActorPack(pack) {
        return this.IsPackType(pack, ["Actor", "Adventure"]);
    }

    /** Determine whether an Pack is Item type. */
    static IsItemPack(pack) {
        return this.IsPackType(pack, ["Item", "Actor", "Adventure"]);
    }

    /** Determine whether an Pack is Scene type. */
    static IsScenePack(pack) {
        return this.IsPackType(pack, ["Scene", "Adventure"]);
    }

    /** Determine whether an Pack is JournalEntry type. */
    static IsJournalEntryPack(pack) {
        return this.IsPackType(pack, ["JournalEntry", "Adventure"]);
    }

    /**
   * Inject the compendium exporter button into the compendium sidebar.
   * @param {HTMLElement} html  HTML of the sidebar being rendered.
   */
    static injectSidebarButton(html) {
        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("open-compendium-manager");
        button.innerHTML = `
            <i class="fa-solid fa-download" inert></i>
            ${game.i18n.localize("BTFG.CompendiumExporter.Open")}`;

        button.addEventListener("click", event => (new CompendiumExporterApp()).render({ force: true }));

        let headerActions = html.querySelector(".header-actions");
        if (!headerActions) {
            headerActions = document.createElement("div");
            headerActions.className = "header-actions action-buttons flexrow";
            html.querySelector(":scope > header").insertAdjacentElement("afterbegin", headerActions);
        }
        headerActions.append(button);
    }
}

class MappingModel extends foundry.abstract.DataModel {
    /** @inheritdoc */
    static defineSchema() {
        return {
            Actor: new ArrayField(
                new SchemaField({
                    key: new StringField({ required: true }),
                    value: new StringField({ required: true })
                })
            ),
            Item: new ArrayField(
                new SchemaField({
                    key: new StringField({ required: true }),
                    value: new StringField({ required: true })
                })
            ),
            Scene: new ArrayField(
                new SchemaField({
                    key: new StringField({ required: true }),
                    value: new StringField({ required: true })
                })
            ),
            JournalEntry: new ArrayField(
                new SchemaField({
                    key: new StringField({ required: true }),
                    value: new StringField({ required: true })
                })
            )
        };
    }
}

class OptionsModel extends foundry.abstract.DataModel {
    /** @inheritdoc */
    static defineSchema() {
        return {
            includeCustomMappingInFiles: new BooleanField({
                label: "BTFG.CompendiumExporter.IncludeCustomMappingInFiles",
            }),
            exportMappingWithPacks: new BooleanField({
                label: "BTFG.CompendiumExporter.ExportMappingWithPacks",
            }),
            sortEntries: new BooleanField({
                label: "BTFG.CompendiumExporter.SortEntriesAlpha",
            }),
            useIdAsKey: new BooleanField({
                label: "BTFG.CompendiumExporter.UseIdAsKey",
            }),
            // Mapping preservation options
            preserveExistingMappings: new BooleanField({
                initial: true,
                label: "BTFG.CompendiumExporter.PreserveExistingMappings",
            }),
            validateMappingCompleteness: new BooleanField({
                initial: true,
                label: "BTFG.CompendiumExporter.ValidateMappingCompleteness",
            }),
            // Smart filtering options
            enableSmartFiltering: new BooleanField({
                initial: true,
                label: "BTFG.CompendiumExporter.EnableSmartFiltering",
            }),
            includeAllEmbeddedItems: new BooleanField({
                initial: false,
                label: "BTFG.CompendiumExporter.IncludeAllEmbeddedItems",
            }),
            // Incremental export options
            enableIncrementalExport: new BooleanField({
                initial: false,
                label: "BTFG.CompendiumExporter.EnableIncrementalExport",
            })
        };
    }
}