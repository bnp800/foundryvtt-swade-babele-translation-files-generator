import { MappingPreservationEngine } from '../core/mapping-preservation-engine.mjs';
import { SmartContentFilter } from '../core/smart-content-filter.mjs';
import { TemplateManager } from '../core/template-manager.mjs';

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
        const mappingTypes = { Actor, Item, Scene, JournalEntry };

        if (this.pack.metadata.type === "Adventure") {
            if (this.options.asZip) {
                this.dataset.mapping = { Actor: {}, Item: {}, Scene: {}, JournalEntry: {} };
            } else {
                this.dataset.mapping = { actors: {}, items: {}, scenes: {}, journals: {} };
            }
        } else {
            if (mappingTypes[this.pack.metadata.type]) {
                if (this.options.asZip) {
                    if (this.pack.metadata.type === "Actor") {
                        this.dataset.mapping = { Actor: {}, Item: {} };
                    } else {
                        this.dataset.mapping[this.pack.metadata.type] = {};
                    }
                }
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
        const mappingAdded = {};
        Object.values(customMapping).forEach(({ key, value }) => {
            if (keysToIgnore.includes(value)) return;
            const documentValue = this._getValueFromMapping(indexDocument, value);
            if (documentValue) {
                documentData[key] = documentValue;
                mappingAdded[key] = value;
            }
        });
        return mappingAdded;
    }

    static _hasContent(dataset) {
        if (!dataset) return false;
        return Array.isArray(dataset) ? dataset.length : dataset.size;
    }

    static _reorderMapping(mapping) {
        const stringMapping = [];
        const objectMapping = [];

        for (const [key, value] of Object.entries(mapping)) {
            if (typeof value === "string") {
                stringMapping.push([key, value]);
            } else {
                objectMapping.push([key, value]);
            }
        }

        for (const key of Object.keys(mapping)) {
            delete mapping[key];
        }

        for (const [key, value] of [...stringMapping, ...objectMapping]) {
            mapping[key] = value;
        }
    }

    static _parseJson(str) {
        try {
            const parsed = JSON.parse(str);
            return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && Object.keys(parsed).length > 0 ? parsed : null;
        } catch {
            return null;
        }
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

/**
 * Enhanced Abstract Exporter with mapping preservation and smart filtering capabilities
 * Extends the base AbstractExporter with advanced features for translation file generation
 */
export class EnhancedAbstractExporter extends AbstractExporter {
    constructor(pack, options, existingFile) {
        super(pack, options, existingFile);
        
        // Initialize core components
        this.mappingEngine = MappingPreservationEngine;
        this.contentFilter = new SmartContentFilter(this.getTranslationDatabase());
        this.templateManager = TemplateManager;
        
        // Enhanced options with defaults
        this.enhancedOptions = {
            preserveExistingMappings: options.preserveExistingMappings ?? true,
            enableSmartFiltering: options.enableSmartFiltering ?? true,
            includeAllEmbeddedItems: options.includeAllEmbeddedItems ?? false,
            validateMappingCompleteness: options.validateMappingCompleteness ?? true,
            ...options
        };
    }

    /**
     * Get translation database interface
     * Override this method in subclasses if needed
     * @returns {Object} Translation database interface
     */
    getTranslationDatabase() {
        // Return a simple mock database for now
        // This would be replaced with actual database implementation
        return {
            getTranslationStatus: async (id, compendiumId) => ({ isTranslated: false }),
            getTranslation: async (id, compendiumId) => null
        };
    }

    /**
     * Enhanced custom mapping processing with preservation and validation
     * Overrides the base implementation to support mapping preservation
     */
    async _processCustomMapping() {
        try {
            // 1. Load standard template for this document type
            const documentType = this.pack.metadata.type;
            const standardTemplate = this.templateManager.loadStandardTemplates()[documentType] || {};
            
            // 2. Load existing mapping from current translation file
            const existingMapping = await this.loadExistingMapping();
            
            // 3. Get user-provided custom mapping
            const userMapping = this.options.mapping?.[documentType] || {};
            
            // 4. Preserve existing mappings by deep merging
            if (this.enhancedOptions.preserveExistingMappings) {
                // First merge standard template with existing mapping
                let mergedMapping = this.mappingEngine.preserveExistingMappings(
                    standardTemplate,
                    existingMapping,
                    { conflictResolution: 'preserve' }
                );
                
                // Then merge with user mapping (user mapping takes precedence)
                this.dataset.mapping = this.mappingEngine.preserveExistingMappings(
                    mergedMapping,
                    userMapping,
                    { conflictResolution: 'override' }
                );
            } else {
                // Standard behavior: merge standard template with user mapping
                this.dataset.mapping = this.mappingEngine.preserveExistingMappings(
                    standardTemplate,
                    userMapping
                );
            }
            
            // 5. Handle special cases for Adventure and Actor types
            await this._handleSpecialMappingCases();
            
            // 6. Validate mapping completeness if requested
            if (this.enhancedOptions.validateMappingCompleteness) {
                await this._validateAndReportMappingIssues();
            }
            
        } catch (error) {
            console.error('Enhanced mapping processing failed:', error);
            this.reportMappingIssues([{
                severity: 'error',
                type: 'processing_error',
                message: `Mapping processing failed: ${error.message}`,
                field: null
            }]);
            
            // Fallback to original implementation
            await super._processCustomMapping();
        }
    }

    /**
     * Load existing mapping configuration from translation file
     * Enhanced version with backward compatibility and error handling
     * @returns {Object} Existing mapping configuration
     */
    async loadExistingMapping() {
        if (!this.existingFile) {
            return {};
        }

        try {
            const jsonString = await foundry.utils.readTextFromFile(this.existingFile);
            const json = JSON.parse(jsonString);
            
            // Extract mapping based on document type
            const documentType = this.pack.metadata.type;
            
            if (json.mapping) {
                // Handle different mapping structures
                if (json.mapping[documentType]) {
                    return json.mapping[documentType];
                } else if (documentType === 'Item' && json.mapping.Item) {
                    return json.mapping.Item;
                } else if (documentType === 'Actor' && json.mapping.Actor) {
                    return json.mapping.Actor;
                } else {
                    // Return the entire mapping object for backward compatibility
                    return json.mapping;
                }
            }
            
            return {};
            
        } catch (error) {
            console.warn('Failed to load existing mapping:', error);
            return {};
        }
    }

    /**
     * Load existing translation entries with metadata
     * Enhanced version that preserves additional metadata from existing files
     * @returns {Object} Object containing entries, metadata, and version info
     */
    async loadExistingTranslationData() {
        if (!this.existingFile) {
            return {
                entries: {},
                folders: {},
                metadata: {},
                version: null,
                label: this.dataset.label
            };
        }

        try {
            const jsonString = await foundry.utils.readTextFromFile(this.existingFile);
            const json = JSON.parse(jsonString);

            // Validate basic structure
            if (!json?.entries) {
                throw new Error('Invalid translation file structure: missing entries');
            }

            return {
                entries: json.entries || {},
                folders: json.folders || {},
                mapping: json.mapping || {},
                metadata: json.metadata || {},
                version: json.version || null,
                label: json.label || this.dataset.label,
                generatedAt: json.generatedAt || null,
                // Preserve any additional fields for backward compatibility
                ...this._extractAdditionalFields(json)
            };

        } catch (error) {
            console.warn(`Failed to load existing translation data from ${this.existingFile.name}:`, error);
            
            // Return empty structure on error
            return {
                entries: {},
                folders: {},
                metadata: {},
                version: null,
                label: this.dataset.label
            };
        }
    }

    /**
     * Detect and handle different translation file formats
     * Provides backward compatibility for various file format versions
     * @param {Object} json - Parsed JSON data
     * @returns {Object} Normalized translation data
     */
    _normalizeTranslationFileFormat(json) {
        const normalized = {
            entries: {},
            folders: {},
            mapping: {},
            metadata: {},
            version: null,
            label: this.dataset.label
        };

        // Handle different format versions
        if (json.version) {
            // Modern format with version info
            normalized.version = json.version;
            normalized.entries = json.entries || {};
            normalized.folders = json.folders || {};
            normalized.mapping = json.mapping || {};
            normalized.metadata = json.metadata || {};
            normalized.label = json.label || this.dataset.label;
        } else if (json.entries) {
            // Legacy format without version
            normalized.entries = json.entries;
            normalized.folders = json.folders || {};
            normalized.mapping = json.mapping || {};
            normalized.label = json.label || this.dataset.label;
            normalized.metadata.legacy = true;
        } else {
            // Very old format - entries might be at root level
            const possibleEntries = this._extractEntriesFromLegacyFormat(json);
            if (possibleEntries) {
                normalized.entries = possibleEntries;
                normalized.metadata.veryLegacy = true;
            }
        }

        return normalized;
    }

    /**
     * Extract entries from very old legacy formats
     * @param {Object} json - Raw JSON data
     * @returns {Object|null} Extracted entries or null if not found
     * @private
     */
    _extractEntriesFromLegacyFormat(json) {
        // Check if the JSON structure looks like direct entries
        if (typeof json === 'object' && json !== null) {
            // Look for patterns that suggest this is an entries object
            const keys = Object.keys(json);
            if (keys.length > 0) {
                const firstValue = json[keys[0]];
                if (typeof firstValue === 'object' && firstValue !== null) {
                    // Check if it has translation-like properties
                    if (firstValue.name || firstValue.description || firstValue.notes) {
                        return json;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Extract additional fields from JSON for backward compatibility
     * @param {Object} json - Parsed JSON data
     * @returns {Object} Additional fields
     * @private
     */
    _extractAdditionalFields(json) {
        const knownFields = new Set([
            'entries', 'folders', 'mapping', 'metadata', 'version', 
            'label', 'generatedAt'
        ]);
        
        const additional = {};
        for (const [key, value] of Object.entries(json)) {
            if (!knownFields.has(key)) {
                additional[key] = value;
            }
        }
        
        return additional;
    }

    /**
     * Migrate old translation file format to current format
     * @param {Object} oldData - Old format translation data
     * @returns {Object} Migrated translation data
     */
    async migrateTranslationFileFormat(oldData) {
        const migrated = this._normalizeTranslationFileFormat(oldData);
        
        // Add migration metadata
        migrated.metadata.migrated = true;
        migrated.metadata.migrationDate = new Date().toISOString();
        migrated.metadata.originalFormat = this._detectOriginalFormat(oldData);
        
        // Migrate mapping format if needed
        if (migrated.mapping && typeof migrated.mapping === 'object') {
            migrated.mapping = await this._migrateMappingFormat(migrated.mapping);
        }
        
        // Set current version
        migrated.version = "1.0.0";
        
        return migrated;
    }

    /**
     * Detect the original format of translation data
     * @param {Object} data - Original data
     * @returns {string} Format identifier
     * @private
     */
    _detectOriginalFormat(data) {
        if (data.version) {
            return `versioned-${data.version}`;
        } else if (data.entries) {
            return 'legacy-with-entries';
        } else if (this._extractEntriesFromLegacyFormat(data)) {
            return 'very-legacy-direct';
        } else {
            return 'unknown';
        }
    }

    /**
     * Migrate mapping format to current standard
     * @param {Object} oldMapping - Old mapping format
     * @returns {Object} Migrated mapping
     * @private
     */
    async _migrateMappingFormat(oldMapping) {
        // For now, return as-is since we don't have specific migration rules
        // This can be enhanced as needed for specific format changes
        return oldMapping;
    }

    /**
     * Enhanced existing entries processing with migration support
     * Overrides the base implementation to support format migration
     */
    async _processExistingEntries() {
        if (!this.existingFile) return;

        try {
            const translationData = await this.loadExistingTranslationData();
            
            // Check if migration is needed
            if (translationData.metadata?.legacy || translationData.metadata?.veryLegacy) {
                console.log(`Migrating translation file format for ${this.existingFile.name}`);
                const migratedData = await this.migrateTranslationFileFormat(translationData);
                
                // Use migrated data
                this.existingContent = migratedData.entries;
                this.existingFolders = migratedData.folders;
                this.dataset.label = migratedData.label;
                
                // Store migration info for reporting
                this._migrationInfo = {
                    migrated: true,
                    originalFormat: migratedData.metadata.originalFormat,
                    migrationDate: migratedData.metadata.migrationDate
                };
            } else {
                // Use data as-is
                this.existingContent = translationData.entries;
                this.existingFolders = translationData.folders;
                this.dataset.label = translationData.label;
            }

        } catch (error) {
            console.error(`Failed to process existing entries from ${this.existingFile.name}:`, error);
            ui.notifications.error(game.i18n.format('BTFG.Errors.CanNotReadFile', {
                name: this.existingFile.name,
            }));
        }
    }

    /**
     * Get migration information if file was migrated
     * @returns {Object|null} Migration info or null if no migration occurred
     */
    getMigrationInfo() {
        return this._migrationInfo || null;
    }

    /**
     * Handle special mapping cases for Adventure and Actor types
     * @private
     */
    async _handleSpecialMappingCases() {
        const documentType = this.pack.metadata.type;
        
        if (documentType === "Adventure") {
            if (this.options.asZip) {
                // Ensure all document types have mapping sections
                const requiredTypes = ['Actor', 'Item', 'Scene', 'JournalEntry'];
                for (const type of requiredTypes) {
                    if (!this.dataset.mapping[type]) {
                        this.dataset.mapping[type] = this.templateManager.loadStandardTemplates()[type] || {};
                    }
                }
            } else {
                // Legacy format for non-zip exports
                this.dataset.mapping = { 
                    actors: this.dataset.mapping.Actor || {}, 
                    items: this.dataset.mapping.Item || {}, 
                    scenes: this.dataset.mapping.Scene || {}, 
                    journals: this.dataset.mapping.JournalEntry || {} 
                };
            }
        } else if (documentType === "Actor") {
            // Actors may contain embedded Items, ensure Item mapping is available
            if (this.options.asZip && !this.dataset.mapping.Item) {
                this.dataset.mapping.Item = this.templateManager.loadStandardTemplates().Item || {};
            }
        }
    }

    /**
     * Validate mapping completeness and report issues
     * @private
     */
    async _validateAndReportMappingIssues() {
        const documentType = this.pack.metadata.type;
        let mappingToValidate;
        
        if (documentType === "Adventure") {
            // Validate each document type mapping for Adventures
            const types = this.options.asZip ? ['Actor', 'Item', 'Scene', 'JournalEntry'] : ['actors', 'items', 'scenes', 'journals'];
            for (const type of types) {
                if (this.dataset.mapping[type]) {
                    const actualType = this.options.asZip ? type : this._mapLegacyTypeToActual(type);
                    const validation = this.mappingEngine.validateMappingCompleteness(
                        this.dataset.mapping[type],
                        actualType
                    );
                    if (!validation.isValid) {
                        this.reportMappingIssues(validation.issues, `${type} mapping`);
                    }
                }
            }
        } else {
            // Validate single document type mapping
            mappingToValidate = this.dataset.mapping[documentType] || this.dataset.mapping;
            const validation = this.mappingEngine.validateMappingCompleteness(
                mappingToValidate,
                documentType
            );
            
            if (!validation.isValid) {
                this.reportMappingIssues(validation.issues);
            }
        }
    }

    /**
     * Map legacy type names to actual document types
     * @param {string} legacyType - Legacy type name
     * @returns {string} Actual document type
     * @private
     */
    _mapLegacyTypeToActual(legacyType) {
        const mapping = {
            'actors': 'Actor',
            'items': 'Item',
            'scenes': 'Scene',
            'journals': 'JournalEntry'
        };
        return mapping[legacyType] || legacyType;
    }

    /**
     * Filter embedded content using smart content filter
     * @param {Object} document - Parent document
     * @param {Array} embeddedItems - Embedded items to filter
     * @returns {Promise<Array>} Filtered embedded items
     */
    async filterEmbeddedContent(document, embeddedItems) {
        if (!this.enhancedOptions.enableSmartFiltering) {
            return embeddedItems;
        }

        try {
            const filterResult = await this.contentFilter.filterEmbeddedItems(embeddedItems, {
                includeAllEmbeddedItems: this.enhancedOptions.includeAllEmbeddedItems,
                enableSmartFiltering: this.enhancedOptions.enableSmartFiltering
            });

            // Log filtering statistics if not in zip mode
            if (!this.options.asZip && filterResult.statistics.total > 0) {
                const stats = filterResult.statistics;
                console.log(`Smart filtering results for ${document.name}:`, {
                    total: stats.total,
                    included: stats.included,
                    excluded: stats.excluded,
                    alreadyTranslated: stats.alreadyTranslated,
                    contentChanged: stats.contentChanged,
                    newItems: stats.newItems
                });
            }

            return filterResult.filteredItems;
        } catch (error) {
            console.warn('Smart content filtering failed, including all items:', error);
            return embeddedItems;
        }
    }

    /**
     * Report mapping issues to the user
     * @param {Array} issues - Array of validation issues
     * @param {string} context - Context description for the issues
     */
    reportMappingIssues(issues, context = 'mapping') {
        if (!issues || issues.length === 0) {
            return;
        }

        const errors = issues.filter(issue => issue.severity === 'error');
        const warnings = issues.filter(issue => issue.severity === 'warning');

        if (errors.length > 0) {
            const errorMessage = `${context} validation errors: ${errors.map(e => e.message).join(', ')}`;
            ui.notifications.error(errorMessage);
            console.error('Mapping validation errors:', errors);
        }

        if (warnings.length > 0) {
            const warningMessage = `${context} validation warnings: ${warnings.length} issues found`;
            ui.notifications.warn(warningMessage);
            console.warn('Mapping validation warnings:', warnings);
        }
    }

    /**
     * Enhanced dataset processing with mapping preservation
     * This method should be overridden by subclasses
     */
    async _processDataset() {
        throw new Error('Enhanced subclasses must implement _processDataset method');
    }

    /**
     * Get enhanced dataset with validation
     * @returns {Object} Enhanced dataset
     */
    _getDataset() {
        const dataset = super._getDataset();
        
        // Add metadata about enhancement features used
        if (!dataset.metadata) {
            dataset.metadata = {};
        }
        
        dataset.metadata.enhanced = true;
        dataset.metadata.preservedMappings = this.enhancedOptions.preserveExistingMappings;
        dataset.metadata.smartFiltering = this.enhancedOptions.enableSmartFiltering;
        dataset.metadata.generatedAt = new Date().toISOString();
        
        return dataset;
    }
}