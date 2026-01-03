/**
 * Template Manager for handling mapping templates and configurations
 * Provides template loading, application, validation, and customization support
 */

import {
    STANDARD_MAPPING_TEMPLATES,
    ITEM_TYPE_SPECIFIC_MAPPINGS,
    ACTOR_TYPE_SPECIFIC_MAPPINGS,
    TEMPLATE_METADATA,
    REQUIRED_FIELDS,
    RECOMMENDED_FIELDS
} from '../templates/mapping-templates.mjs';

/**
 * Validation result class for template validation operations
 */
export class ValidationResult {
    constructor(isValid = true, issues = []) {
        this.isValid = isValid;
        this.issues = issues;
        this.timestamp = new Date().toISOString();
    }
    
    addIssue(severity, type, message, field = null) {
        this.issues.push({
            severity, // 'error', 'warning', 'info'
            type,     // 'missing_field', 'invalid_mapping', 'conflict'
            message,
            field,
            timestamp: new Date().toISOString()
        });
        
        if (severity === 'error') {
            this.isValid = false;
        }
    }
    
    getErrorCount() {
        return this.issues.filter(issue => issue.severity === 'error').length;
    }
    
    getWarningCount() {
        return this.issues.filter(issue => issue.severity === 'warning').length;
    }
    
    getIssuesByType(type) {
        return this.issues.filter(issue => issue.type === type);
    }
    
    getIssuesBySeverity(severity) {
        return this.issues.filter(issue => issue.severity === severity);
    }
}

/**
 * Template Manager class for handling mapping templates
 */
export class TemplateManager {
    /**
     * Load standard mapping templates
     * @returns {Object} Standard template collection
     */
    static loadStandardTemplates() {
        return foundry.utils.deepClone(STANDARD_MAPPING_TEMPLATES);
    }
    
    /**
     * Get template metadata information
     * @returns {Object} Template metadata
     */
    static getTemplateMetadata() {
        return foundry.utils.deepClone(TEMPLATE_METADATA);
    }
    
    /**
     * Get item type specific mapping configuration
     * @param {string} itemType - Item type (weapon, armor, edge, etc.)
     * @returns {Object} Type-specific mapping configuration
     */
    static getItemTypeSpecificMapping(itemType) {
        if (!itemType) return {};
        return foundry.utils.deepClone(ITEM_TYPE_SPECIFIC_MAPPINGS[itemType] || {});
    }
    
    /**
     * Get actor type specific mapping configuration
     * @param {string} actorType - Actor type (character, npc, vehicle, etc.)
     * @returns {Object} Type-specific mapping configuration
     */
    static getActorTypeSpecificMapping(actorType) {
        if (!actorType) return {};
        return foundry.utils.deepClone(ACTOR_TYPE_SPECIFIC_MAPPINGS[actorType] || {});
    }
    
    /**
     * Apply mapping template with customizations
     * @param {string} documentType - Document type (Item, Actor, etc.)
     * @param {string} subType - Sub-type (item type, actor type, etc.)
     * @param {Object} customMappings - Custom mapping overrides
     * @returns {Object} Complete mapping configuration
     */
    static applyTemplate(documentType, subType = null, customMappings = {}) {
        // Start with base template
        let baseTemplate = this.loadStandardTemplates()[documentType] || {};
        
        // Apply sub-type specific mappings
        if (documentType === 'Item' && subType) {
            const typeSpecific = this.getItemTypeSpecificMapping(subType);
            baseTemplate = foundry.utils.mergeObject(baseTemplate, typeSpecific);
        } else if (documentType === 'Actor' && subType) {
            const typeSpecific = this.getActorTypeSpecificMapping(subType);
            baseTemplate = foundry.utils.mergeObject(baseTemplate, typeSpecific);
        }
        
        // Apply custom mappings
        return foundry.utils.mergeObject(baseTemplate, customMappings);
    }
    
    /**
     * Validate template configuration
     * @param {Object} template - Template object to validate
     * @param {string} documentType - Document type for validation context
     * @returns {ValidationResult} Validation result
     */
    static validateTemplate(template, documentType = null) {
        const result = new ValidationResult();
        
        if (!template || typeof template !== 'object') {
            result.addIssue('error', 'invalid_template', 'Template must be a valid object');
            return result;
        }
        
        // Validate required fields if document type is specified
        if (documentType && REQUIRED_FIELDS[documentType]) {
            const requiredFields = REQUIRED_FIELDS[documentType];
            for (const field of requiredFields) {
                if (!template[field]) {
                    result.addIssue('error', 'missing_field', 
                        `Missing required field: ${field}`, field);
                }
            }
        }
        
        // Check for recommended fields
        if (documentType && RECOMMENDED_FIELDS[documentType]) {
            const recommendedFields = RECOMMENDED_FIELDS[documentType];
            for (const field of recommendedFields) {
                if (!template[field]) {
                    result.addIssue('warning', 'missing_field', 
                        `Missing recommended field: ${field}`, field);
                }
            }
        }
        
        // Validate mapping syntax
        for (const [key, value] of Object.entries(template)) {
            if (typeof value === 'string') {
                // Simple field mapping validation
                if (!this._isValidMappingPath(value)) {
                    result.addIssue('warning', 'invalid_mapping', 
                        `Unusual mapping path for ${key}: ${value}`, key);
                }
            } else if (typeof value === 'object' && value !== null) {
                if (value.path) {
                    // Complex mapping validation
                    if (!value.converter) {
                        result.addIssue('error', 'invalid_mapping', 
                            `Missing converter for complex mapping ${key}`, key);
                    }
                    if (!this._isValidMappingPath(value.path)) {
                        result.addIssue('warning', 'invalid_mapping', 
                            `Unusual mapping path for ${key}: ${value.path}`, key);
                    }
                } else {
                    result.addIssue('warning', 'invalid_mapping', 
                        `Complex mapping ${key} missing path property`, key);
                }
            }
        }
        
        return result;
    }
    
    /**
     * Validate if a mapping path looks reasonable
     * @param {string} path - Mapping path to validate
     * @returns {boolean} Whether the path appears valid
     * @private
     */
    static _isValidMappingPath(path) {
        if (!path || typeof path !== 'string') return false;
        
        // Common valid prefixes for SWADE system
        const validPrefixes = [
            'system.',
            'prototypeToken.',
            'effects',
            'items',
            'pages',
            'name',
            'description',
            'notes',
            'source'
        ];
        
        return validPrefixes.some(prefix => path.startsWith(prefix)) || 
               path.includes('.') || // Nested paths are generally valid
               validPrefixes.includes(path); // Direct field names
    }
    
    /**
     * Export mapping configuration as a template
     * @param {Object} mapping - Mapping configuration to export
     * @param {string} documentType - Document type
     * @param {string} subType - Sub-type (item type, actor type, etc.)
     * @returns {Object} Template object with metadata
     */
    static exportTemplate(mapping, documentType, subType = null) {
        return {
            documentType,
            subType,
            version: TEMPLATE_METADATA.version,
            mapping: foundry.utils.deepClone(mapping),
            timestamp: new Date().toISOString(),
            metadata: {
                generator: "SWADE Babele Translation Files Generator",
                swadeSystemVersion: TEMPLATE_METADATA.swadeSystemVersion
            }
        };
    }
    
    /**
     * Automatically detect item type from document
     * @param {Object} document - Document object
     * @returns {string} Detected item type
     */
    static detectItemType(document) {
        if (!document || !document.type) {
            return 'gear'; // Default fallback
        }
        
        return document.type;
    }
    
    /**
     * Automatically detect actor type from document
     * @param {Object} document - Document object
     * @returns {string} Detected actor type
     */
    static detectActorType(document) {
        if (!document || !document.type) {
            return 'character'; // Default fallback
        }
        
        return document.type;
    }
    
    /**
     * Get all available item types
     * @returns {string[]} Array of available item types
     */
    static getAvailableItemTypes() {
        return Object.keys(ITEM_TYPE_SPECIFIC_MAPPINGS);
    }
    
    /**
     * Get all available actor types
     * @returns {string[]} Array of available actor types
     */
    static getAvailableActorTypes() {
        return Object.keys(ACTOR_TYPE_SPECIFIC_MAPPINGS);
    }
    
    /**
     * Get all available document types
     * @returns {string[]} Array of available document types
     */
    static getAvailableDocumentTypes() {
        return Object.keys(STANDARD_MAPPING_TEMPLATES);
    }
    
    /**
     * Check if a document type is supported
     * @param {string} documentType - Document type to check
     * @returns {boolean} Whether the document type is supported
     */
    static isDocumentTypeSupported(documentType) {
        return documentType && STANDARD_MAPPING_TEMPLATES.hasOwnProperty(documentType);
    }
    
    /**
     * Check if an item type is supported
     * @param {string} itemType - Item type to check
     * @returns {boolean} Whether the item type is supported
     */
    static isItemTypeSupported(itemType) {
        return itemType && ITEM_TYPE_SPECIFIC_MAPPINGS.hasOwnProperty(itemType);
    }
    
    /**
     * Check if an actor type is supported
     * @param {string} actorType - Actor type to check
     * @returns {boolean} Whether the actor type is supported
     */
    static isActorTypeSupported(actorType) {
        return actorType && ACTOR_TYPE_SPECIFIC_MAPPINGS.hasOwnProperty(actorType);
    }
    
    /**
     * Merge multiple templates with conflict resolution
     * @param {...Object} templates - Templates to merge
     * @returns {Object} Merged template
     */
    static mergeTemplates(...templates) {
        let result = {};
        
        for (const template of templates) {
            if (template && typeof template === 'object') {
                result = foundry.utils.mergeObject(result, template);
            }
        }
        
        return result;
    }
    
    /**
     * Compare two templates and identify differences
     * @param {Object} template1 - First template
     * @param {Object} template2 - Second template
     * @returns {Object} Comparison result with added, removed, and modified fields
     */
    static compareTemplates(template1, template2) {
        const result = {
            added: {},
            removed: {},
            modified: {},
            unchanged: {}
        };
        
        const keys1 = new Set(Object.keys(template1 || {}));
        const keys2 = new Set(Object.keys(template2 || {}));
        const allKeys = new Set([...keys1, ...keys2]);
        
        for (const key of allKeys) {
            const value1 = template1?.[key];
            const value2 = template2?.[key];
            
            if (!keys1.has(key)) {
                result.added[key] = value2;
            } else if (!keys2.has(key)) {
                result.removed[key] = value1;
            } else if (!foundry.utils.objectsEqual(value1, value2)) {
                result.modified[key] = { from: value1, to: value2 };
            } else {
                result.unchanged[key] = value1;
            }
        }
        
        return result;
    }
    
    /**
     * Create a minimal template containing only the specified fields
     * @param {Object} fullTemplate - Full template to extract from
     * @param {string[]} fields - Fields to include in minimal template
     * @returns {Object} Minimal template
     */
    static createMinimalTemplate(fullTemplate, fields) {
        const minimal = {};
        
        for (const field of fields) {
            if (fullTemplate.hasOwnProperty(field)) {
                minimal[field] = fullTemplate[field];
            }
        }
        
        return minimal;
    }
}