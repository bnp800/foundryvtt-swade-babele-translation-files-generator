import { AbstractExporter } from './abstract-exporter.mjs';
import { TemplateManager } from '../core/template-manager.mjs';
import { MappingPreservationEngine } from '../core/mapping-preservation-engine.mjs';

export class ItemExporter extends AbstractExporter {
    static getDocumentData(document, customMapping, datasetMapping) {
        const { name, type, system } = document;
        const documentData = { name };

        // Get complete mapping template for this item type
        const fullMapping = TemplateManager.applyTemplate('Item', type, customMapping || {});

        // Use complete mapping configuration to extract all fields
        const mappingAdded = this.extractFieldsFromMapping(document, fullMapping, [
            'name' // Exclude already processed base fields
        ]);
        
        Object.assign(documentData, mappingAdded.data);
        Object.assign(datasetMapping, mappingAdded.mapping);

        // Process Active Effects
        if (this._hasContent(document.effects)) {
            documentData.effects = this.processActiveEffects(document.effects);
            if (!datasetMapping.effects) {
                datasetMapping.effects = { path: 'effects', converter: 'effects' };
            }
        }

        return documentData;
    }
    
    /**
     * Extract fields from document based on mapping configuration
     * @param {Object} document - Document object
     * @param {Object} mapping - Mapping configuration
     * @param {Array} excludeFields - Fields to exclude from extraction
     * @returns {Object} Extracted data and applied mapping
     */
    static extractFieldsFromMapping(document, mapping, excludeFields = []) {
        const extractedData = {};
        const appliedMapping = {};
        
        Object.entries(mapping).forEach(([key, value]) => {
            if (excludeFields.includes(key)) return;
            
            if (typeof value === 'string') {
                // Simple field mapping
                const fieldValue = this._getValueFromMapping(document, value);
                if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                    extractedData[key] = fieldValue;
                    appliedMapping[key] = value;
                }
            } else if (typeof value === 'object' && value.path) {
                // Complex field mapping (with converter)
                const fieldValue = this._getValueFromMapping(document, value.path);
                if (fieldValue !== undefined && fieldValue !== null) {
                    // For complex mappings, check if there's actual content
                    const hasContent = Array.isArray(fieldValue) ? fieldValue.length > 0 : 
                                     typeof fieldValue === 'object' ? Object.keys(fieldValue).length > 0 :
                                     fieldValue !== '';
                    
                    if (hasContent) {
                        extractedData[key] = fieldValue;
                        appliedMapping[key] = value;
                    }
                }
            }
        });
        
        return { data: extractedData, mapping: appliedMapping };
    }
    
    /**
     * Get value from document using mapping path
     * @param {Object} document - Document object
     * @param {string} path - Mapping path (e.g., 'system.description')
     * @returns {*} Field value or undefined
     * @private
     */
    static _getValueFromMapping(document, path) {
        if (!path || typeof path !== 'string') return undefined;
        
        // Handle direct field access
        if (!path.includes('.')) {
            return document[path];
        }
        
        // Handle nested path access
        const pathParts = path.split('.');
        let current = document;
        
        for (const part of pathParts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }
        
        return current;
    }
    
    /**
     * Process Active Effects into translation-ready format
     * @param {Array} effects - Array of effect objects
     * @returns {Object} Processed effects object
     */
    static processActiveEffects(effects) {
        const processedEffects = {};
        
        effects.filter(effect => !effect._tombstone).forEach(effect => {
            const { _id, name, description } = effect;
            const effectData = { name };
            
            if (description) {
                effectData.description = description;
            }
            
            // Use name as key, if duplicate then use ID
            const key = processedEffects[name] && 
                !foundry.utils.objectsEqual(processedEffects[name], effectData) 
                ? _id : name;
            processedEffects[key] = effectData;
        });
        
        return processedEffects;
    }

    /**
     * Reorder mapping fields for better organization
     * @param {Object} mapping - Mapping object to reorder
     * @private
     */
    static _reorderMapping(mapping) {
        // Define preferred field order for better organization
        const preferredOrder = [
            'name',
            'description', 
            'notes',
            'source',
            'category',
            'actions',
            'requirements',
            'trapping',
            'damage',
            'range',
            'ap',
            'parry',
            'armor',
            'toughness',
            'effects'
        ];
        
        const reordered = {};
        
        // Add fields in preferred order
        for (const field of preferredOrder) {
            if (mapping[field]) {
                reordered[field] = mapping[field];
            }
        }
        
        // Add any remaining fields
        for (const [key, value] of Object.entries(mapping)) {
            if (!reordered[key]) {
                reordered[key] = value;
            }
        }
        
        // Replace original mapping with reordered version
        Object.keys(mapping).forEach(key => delete mapping[key]);
        Object.assign(mapping, reordered);
    }

    async _processDataset() {
        const documents = await this.pack.getIndex();

        for (const indexDocument of documents) {
            const document = foundry.utils.duplicate(await this.pack.getDocument(indexDocument._id));
            
            // Get complete mapping configuration for this item type
            const fullMapping = TemplateManager.applyTemplate('Item', document.type, this.options.mapping.Item || {});
            
            const documentData = ItemExporter.getDocumentData(
                document, 
                this.options.mapping.Item || {}, 
                this.dataset.mapping.Item ?? this.dataset.mapping
            );

            // Ensure mapping completeness for this item type
            this.ensureMappingCompleteness(document.type);

            let key = this._getExportKey(document);
            key = this.dataset.entries[key] && 
                !foundry.utils.objectsEqual(this.dataset.entries[key], documentData) 
                ? document._id : key;

            this.dataset.entries[key] = foundry.utils.mergeObject(
                documentData, 
                this.existingContent[key] ?? {}
            );

            if (!this.options.asZip) this._stepProgressBar();
        }

        ItemExporter._reorderMapping(this.dataset.mapping.Item ?? this.dataset.mapping);
        
        // Final validation and reporting
        this.performFinalMappingValidation();
    }
    
    /**
     * Perform final mapping validation and generate completeness report
     */
    performFinalMappingValidation() {
        try {
            // Validate overall mapping completeness
            const completenessValidation = this.validateExportMappingCompleteness();
            
            if (!completenessValidation.isComplete) {
                console.warn('ItemExporter: Export mapping is incomplete:', completenessValidation);
            }
            
            // Generate and log completeness report if in debug mode
            if (this.options.debugMode || this.options.generateReports) {
                const report = this.generateMappingCompletenessReport();
                console.info('ItemExporter: Mapping completeness report:', report);
                
                // Store report for potential UI display
                this.completenessReport = report;
            }
            
        } catch (error) {
            console.error('ItemExporter: Failed to perform final mapping validation:', error);
        }
    }
    
    /**
     * Ensure mapping configuration completeness for a specific item type
     * @param {string} itemType - Item type to ensure completeness for
     */
    ensureMappingCompleteness(itemType) {
        const standardMapping = TemplateManager.applyTemplate('Item', itemType);
        const currentMapping = this.dataset.mapping.Item ?? this.dataset.mapping;
        
        // Use mapping preservation engine to merge standard mapping with current
        const preservedMapping = MappingPreservationEngine.preserveExistingMappings(
            currentMapping,
            standardMapping,
            { conflictResolution: 'preserve' }
        );
        
        // Update the current mapping with preserved result
        if (this.dataset.mapping.Item) {
            this.dataset.mapping.Item = preservedMapping;
        } else {
            this.dataset.mapping = preservedMapping;
        }
        
        // Validate mapping completeness and report issues
        const validation = MappingPreservationEngine.validateMappingCompleteness(
            preservedMapping,
            'Item',
            itemType
        );
        
        if (!validation.isValid || validation.getWarningCount() > 0) {
            this.reportMappingIssues(validation.issues, itemType);
        }
        
        // Auto-repair critical missing fields if enabled
        if (this.options.autoRepairMappings !== false) {
            this.autoRepairMissingMappings(itemType);
        }
    }
    
    /**
     * Auto-repair missing mappings for critical fields
     * @param {string} itemType - Item type to repair mappings for
     */
    autoRepairMissingMappings(itemType) {
        try {
            const currentMapping = this.dataset.mapping.Item ?? this.dataset.mapping;
            
            // Detect missing fields and get repair suggestions
            const missingReport = MappingPreservationEngine.detectMissingFields(
                currentMapping,
                'Item',
                itemType
            );
            
            if (missingReport.autoRepairAvailable) {
                // Auto-repair with high-priority fields only
                const repairResult = MappingPreservationEngine.autoRepairMapping(
                    currentMapping,
                    'Item',
                    itemType,
                    {
                        addMissingFields: true,
                        fixInvalidSyntax: true,
                        preserveExisting: true
                    }
                );
                
                // Update mapping with repaired version
                if (this.dataset.mapping.Item) {
                    this.dataset.mapping.Item = repairResult.mapping;
                } else {
                    this.dataset.mapping = repairResult.mapping;
                }
                
                // Log repair actions
                if (repairResult.report.fieldsAdded.length > 0) {
                    console.info(`ItemExporter: Auto-repaired ${repairResult.report.fieldsAdded.length} missing fields for ${itemType}:`, 
                        repairResult.report.fieldsAdded.map(f => f.field));
                }
            }
        } catch (error) {
            console.warn(`ItemExporter: Failed to auto-repair mappings for ${itemType}:`, error.message);
        }
    }
    
    /**
     * Validate export file mapping completeness
     * Ensures the final export file contains all necessary mapping fields
     * @returns {Object} Validation result with completeness report
     */
    validateExportMappingCompleteness() {
        const validation = {
            isComplete: true,
            missingFields: [],
            itemTypeIssues: {},
            recommendations: []
        };
        
        try {
            const currentMapping = this.dataset.mapping.Item ?? this.dataset.mapping;
            
            // Get all unique item types from the dataset
            const itemTypes = new Set();
            Object.values(this.dataset.entries).forEach(entry => {
                // Try to determine item type from the entry or use a default check
                if (entry.type) {
                    itemTypes.add(entry.type);
                }
            });
            
            // If no types found, check common SWADE item types
            if (itemTypes.size === 0) {
                itemTypes.add('gear'); // Default fallback
            }
            
            // Validate completeness for each item type
            for (const itemType of itemTypes) {
                const typeValidation = MappingPreservationEngine.validateMappingCompleteness(
                    currentMapping,
                    'Item',
                    itemType
                );
                
                if (!typeValidation.isValid || typeValidation.getWarningCount() > 0) {
                    validation.isComplete = false;
                    validation.itemTypeIssues[itemType] = {
                        errors: typeValidation.getIssuesBySeverity('error'),
                        warnings: typeValidation.getIssuesBySeverity('warning')
                    };
                    
                    // Collect missing fields
                    const missingFields = typeValidation.getIssuesByType('missing_field');
                    missingFields.forEach(issue => {
                        if (!validation.missingFields.includes(issue.field)) {
                            validation.missingFields.push(issue.field);
                        }
                    });
                }
            }
            
            // Generate recommendations
            if (validation.missingFields.length > 0) {
                validation.recommendations.push(
                    `Consider adding missing fields: ${validation.missingFields.join(', ')}`
                );
            }
            
            if (Object.keys(validation.itemTypeIssues).length > 0) {
                validation.recommendations.push(
                    'Run ensureMappingCompleteness() for each item type to auto-repair issues'
                );
            }
            
            return validation;
            
        } catch (error) {
            validation.isComplete = false;
            validation.error = error.message;
            validation.recommendations.push('Check mapping structure and template availability');
            return validation;
        }
    }
    
    /**
     * Generate mapping completeness report for export
     * @returns {Object} Detailed completeness report
     */
    generateMappingCompletenessReport() {
        const report = {
            timestamp: new Date().toISOString(),
            packName: this.pack.metadata.name,
            documentType: 'Item',
            totalEntries: Object.keys(this.dataset.entries).length,
            mappingFields: Object.keys(this.dataset.mapping.Item ?? this.dataset.mapping).length,
            completenessValidation: this.validateExportMappingCompleteness(),
            itemTypeBreakdown: {},
            recommendations: []
        };
        
        // Analyze item type distribution
        const itemTypeCounts = {};
        Object.values(this.dataset.entries).forEach(entry => {
            const type = entry.type || 'unknown';
            itemTypeCounts[type] = (itemTypeCounts[type] || 0) + 1;
        });
        
        report.itemTypeBreakdown = itemTypeCounts;
        
        // Generate specific recommendations
        if (!report.completenessValidation.isComplete) {
            report.recommendations.push(
                'Mapping configuration is incomplete - some fields may not be translated properly'
            );
        }
        
        if (report.mappingFields < 5) {
            report.recommendations.push(
                'Very few mapping fields detected - consider using complete mapping templates'
            );
        }
        
        const commonTypes = ['weapon', 'armor', 'edge', 'hindrance', 'power', 'gear'];
        const missingCommonTypes = commonTypes.filter(type => !itemTypeCounts[type]);
        if (missingCommonTypes.length < commonTypes.length) {
            report.recommendations.push(
                `Consider validating mappings for common item types: ${Object.keys(itemTypeCounts).join(', ')}`
            );
        }
        
        return report;
    }
    
    /**
     * Report mapping issues to console with context
     * @param {Array} issues - Array of validation issues
     * @param {string} itemType - Item type context
     */
    reportMappingIssues(issues, itemType) {
        const errors = issues.filter(issue => issue.severity === 'error');
        const warnings = issues.filter(issue => issue.severity === 'warning');
        
        if (errors.length > 0) {
            console.error(`ItemExporter: Mapping errors for ${itemType}:`, errors);
        }
        
        if (warnings.length > 0) {
            console.warn(`ItemExporter: Mapping warnings for ${itemType}:`, warnings);
        }
    }
}