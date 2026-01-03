/**
 * Mapping Preservation Engine for handling mapping configuration preservation and merging
 * Provides deep merge functionality, conflict detection, and resolution strategies
 */

import { TemplateManager, ValidationResult } from './template-manager.mjs';

/**
 * Error class for mapping preservation operations
 */
export class MappingPreservationError extends Error {
    constructor(operation, details, suggestions = []) {
        super(`Mapping preservation failed during ${operation}: ${details}`);
        this.name = 'MappingPreservationError';
        this.operation = operation;
        this.details = details;
        this.suggestions = suggestions;
    }
}

/**
 * Conflict report class for mapping conflicts
 */
export class ConflictReport {
    constructor() {
        this.conflicts = [];
        this.resolutions = [];
        this.timestamp = new Date().toISOString();
    }
    
    addConflict(field, value1, value2, resolution = null) {
        this.conflicts.push({
            field,
            value1,
            value2,
            resolution,
            timestamp: new Date().toISOString()
        });
    }
    
    addResolution(field, strategy, finalValue) {
        this.resolutions.push({
            field,
            strategy,
            finalValue,
            timestamp: new Date().toISOString()
        });
    }
    
    hasConflicts() {
        return this.conflicts.length > 0;
    }
    
    getUnresolvedConflicts() {
        return this.conflicts.filter(conflict => !conflict.resolution);
    }
}

/**
 * Mapping Preservation Engine class
 */
export class MappingPreservationEngine {
    /**
     * Preserve existing mappings by deeply merging configurations
     * @param {Object} existingMapping - Existing mapping configuration
     * @param {Object} newMapping - New mapping configuration to merge
     * @param {Object} options - Merge options
     * @returns {Object} Merged mapping configuration
     */
    static preserveExistingMappings(existingMapping, newMapping, options = {}) {
        const mergeOptions = {
            preserveExisting: true,
            conflictResolution: 'preserve', // 'preserve', 'override', 'merge'
            validateResult: true,
            ...options
        };
        
        try {
            // Handle null/undefined inputs
            if (!existingMapping && !newMapping) {
                return {};
            }
            if (!existingMapping) {
                return foundry.utils.deepClone(newMapping);
            }
            if (!newMapping) {
                return foundry.utils.deepClone(existingMapping);
            }
            
            // Perform deep merge with conflict detection
            const result = this._deepMergeWithConflictDetection(
                existingMapping, 
                newMapping, 
                mergeOptions
            );
            
            // Validate result if requested
            if (mergeOptions.validateResult) {
                const validation = this._validateMergedMapping(result);
                if (!validation.isValid) {
                    console.warn('Mapping merge resulted in validation issues:', validation.issues);
                }
            }
            
            return result;
            
        } catch (error) {
            throw new MappingPreservationError(
                'preserveExistingMappings',
                error.message,
                ['Check input mapping formats', 'Verify mapping structure consistency']
            );
        }
    }
    
    /**
     * Load mapping template for a specific document type
     * @param {string} documentType - Document type (Item, Actor, etc.)
     * @param {string} subType - Sub-type (item type, actor type, etc.)
     * @returns {Object} Standard mapping template
     */
    static loadMappingTemplate(documentType, subType = null) {
        try {
            return TemplateManager.applyTemplate(documentType, subType);
        } catch (error) {
            throw new MappingPreservationError(
                'loadMappingTemplate',
                `Failed to load template for ${documentType}${subType ? `:${subType}` : ''}: ${error.message}`,
                ['Verify document type is supported', 'Check template configuration']
            );
        }
    }
    
    /**
     * Validate mapping completeness against requirements
     * @param {Object} mapping - Mapping configuration to validate
     * @param {string} documentType - Document type for validation context
     * @param {string} subType - Sub-type for validation context
     * @returns {ValidationResult} Validation result
     */
    static validateMappingCompleteness(mapping, documentType, subType = null) {
        try {
            // Use TemplateManager for basic validation
            const basicValidation = TemplateManager.validateTemplate(mapping, documentType);
            
            // Add completeness-specific validation
            const result = new ValidationResult(basicValidation.isValid, [...basicValidation.issues]);
            
            // Check against standard template for completeness
            const standardTemplate = this.loadMappingTemplate(documentType, subType);
            const missingFields = this._findMissingFields(mapping, standardTemplate);
            
            for (const field of missingFields) {
                result.addIssue('warning', 'missing_field', 
                    `Missing standard field: ${field}`, field);
            }
            
            // Check for orphaned complex mappings
            const orphanedMappings = this._findOrphanedMappings(mapping);
            for (const field of orphanedMappings) {
                result.addIssue('warning', 'orphaned_mapping', 
                    `Complex mapping ${field} may be incomplete`, field);
            }
            
            return result;
            
        } catch (error) {
            const result = new ValidationResult(false);
            result.addIssue('error', 'validation_error', 
                `Validation failed: ${error.message}`);
            return result;
        }
    }
    
    /**
     * Detect mapping conflicts between two configurations
     * @param {Object} mapping1 - First mapping configuration
     * @param {Object} mapping2 - Second mapping configuration
     * @returns {ConflictReport} Conflict report
     */
    static detectMappingConflicts(mapping1, mapping2) {
        const report = new ConflictReport();
        
        try {
            if (!mapping1 || !mapping2) {
                return report; // No conflicts if one mapping is empty
            }
            
            const allKeys = new Set([
                ...Object.keys(mapping1),
                ...Object.keys(mapping2)
            ]);
            
            for (const key of allKeys) {
                const value1 = mapping1[key];
                const value2 = mapping2[key];
                
                // Skip if only one mapping has this key
                if (value1 === undefined || value2 === undefined) {
                    continue;
                }
                
                // Check for conflicts
                if (!this._areMappingValuesEqual(value1, value2)) {
                    report.addConflict(key, value1, value2);
                }
            }
            
            return report;
            
        } catch (error) {
            throw new MappingPreservationError(
                'detectMappingConflicts',
                error.message,
                ['Verify mapping structure', 'Check for circular references']
            );
        }
    }
    
    /**
     * Resolve mapping conflicts using specified strategy
     * @param {ConflictReport} conflictReport - Conflict report to resolve
     * @param {Object} mapping1 - First mapping (usually existing)
     * @param {Object} mapping2 - Second mapping (usually new)
     * @param {string} strategy - Resolution strategy ('preserve', 'override', 'merge')
     * @returns {Object} Resolved mapping
     */
    static resolveMappingConflicts(conflictReport, mapping1, mapping2, strategy = 'preserve') {
        try {
            const result = foundry.utils.deepClone(mapping1);
            
            for (const conflict of conflictReport.conflicts) {
                const { field, value1, value2 } = conflict;
                let resolvedValue;
                
                switch (strategy) {
                    case 'preserve':
                        resolvedValue = value1; // Keep existing value
                        break;
                    case 'override':
                        resolvedValue = value2; // Use new value
                        break;
                    case 'merge':
                        resolvedValue = this._mergeConflictingValues(value1, value2);
                        break;
                    default:
                        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
                }
                
                result[field] = resolvedValue;
                conflictReport.addResolution(field, strategy, resolvedValue);
            }
            
            return result;
            
        } catch (error) {
            throw new MappingPreservationError(
                'resolveMappingConflicts',
                error.message,
                ['Check conflict resolution strategy', 'Verify mapping values are mergeable']
            );
        }
    }
    
    /**
     * Deep merge with conflict detection
     * @param {Object} existing - Existing mapping
     * @param {Object} newMapping - New mapping
     * @param {Object} options - Merge options
     * @returns {Object} Merged result
     * @private
     */
    static _deepMergeWithConflictDetection(existing, newMapping, options) {
        const result = foundry.utils.deepClone(existing);
        const conflicts = this.detectMappingConflicts(existing, newMapping);
        
        // If there are conflicts and we're preserving existing, resolve them
        if (conflicts.hasConflicts() && options.conflictResolution === 'preserve') {
            return this.resolveMappingConflicts(conflicts, existing, newMapping, 'preserve');
        }
        
        // Otherwise, use Foundry's merge with new values taking precedence
        return foundry.utils.mergeObject(result, newMapping, {
            insertKeys: true,
            insertValues: true,
            overwrite: options.conflictResolution === 'override'
        });
    }
    
    /**
     * Validate merged mapping result
     * @param {Object} mapping - Merged mapping to validate
     * @returns {ValidationResult} Validation result
     * @private
     */
    static _validateMergedMapping(mapping) {
        const result = new ValidationResult();
        
        // Check for basic structure
        if (!mapping || typeof mapping !== 'object') {
            result.addIssue('error', 'invalid_structure', 'Merged mapping is not a valid object');
            return result;
        }
        
        // Check for circular references
        try {
            JSON.stringify(mapping);
        } catch (error) {
            result.addIssue('error', 'circular_reference', 'Merged mapping contains circular references');
        }
        
        // Check for empty or null values
        for (const [key, value] of Object.entries(mapping)) {
            if (value === null || value === undefined) {
                result.addIssue('warning', 'null_value', `Field ${key} has null/undefined value`, key);
            } else if (typeof value === 'string' && value.trim() === '') {
                result.addIssue('warning', 'empty_value', `Field ${key} has empty string value`, key);
            }
        }
        
        return result;
    }
    
    /**
     * Find missing fields compared to standard template
     * @param {Object} mapping - Current mapping
     * @param {Object} standardTemplate - Standard template
     * @returns {string[]} Array of missing field names
     * @private
     */
    static _findMissingFields(mapping, standardTemplate) {
        const missing = [];
        
        for (const key of Object.keys(standardTemplate)) {
            if (!mapping.hasOwnProperty(key)) {
                missing.push(key);
            }
        }
        
        return missing;
    }
    
    /**
     * Find orphaned complex mappings (missing converter or path)
     * @param {Object} mapping - Mapping to check
     * @returns {string[]} Array of orphaned mapping field names
     * @private
     */
    static _findOrphanedMappings(mapping) {
        const orphaned = [];
        
        for (const [key, value] of Object.entries(mapping)) {
            if (typeof value === 'object' && value !== null) {
                if (!value.path && !value.converter) {
                    orphaned.push(key);
                } else if (value.path && !value.converter) {
                    // Complex path without converter might be intentional, but flag as warning
                    orphaned.push(key);
                }
            }
        }
        
        return orphaned;
    }
    
    /**
     * Check if two mapping values are equal
     * @param {*} value1 - First value
     * @param {*} value2 - Second value
     * @returns {boolean} Whether values are equal
     * @private
     */
    static _areMappingValuesEqual(value1, value2) {
        // Use Foundry's object comparison for deep equality
        return foundry.utils.objectsEqual(value1, value2);
    }
    
    /**
     * Merge conflicting values intelligently
     * @param {*} value1 - First value (existing)
     * @param {*} value2 - Second value (new)
     * @returns {*} Merged value
     * @private
     */
    static _mergeConflictingValues(value1, value2) {
        // If both are objects, try to merge them
        if (typeof value1 === 'object' && typeof value2 === 'object' && 
            value1 !== null && value2 !== null) {
            return foundry.utils.mergeObject(value1, value2);
        }
        
        // If both are strings and look like paths, prefer the more specific one
        if (typeof value1 === 'string' && typeof value2 === 'string') {
            // Prefer longer, more specific paths
            return value1.length >= value2.length ? value1 : value2;
        }
        
        // Default: prefer existing value
        return value1;
    }
    
    /**
     * Create a mapping diff showing changes between two mappings
     * @param {Object} oldMapping - Original mapping
     * @param {Object} newMapping - New mapping
     * @returns {Object} Diff object with added, removed, and modified fields
     */
    static createMappingDiff(oldMapping, newMapping) {
        return TemplateManager.compareTemplates(oldMapping, newMapping);
    }
    
    /**
     * Apply mapping diff to a base mapping
     * @param {Object} baseMapping - Base mapping to apply diff to
     * @param {Object} diff - Diff object from createMappingDiff
     * @returns {Object} Updated mapping
     */
    static applyMappingDiff(baseMapping, diff) {
        const result = foundry.utils.deepClone(baseMapping);
        
        // Remove deleted fields
        for (const key of Object.keys(diff.removed || {})) {
            delete result[key];
        }
        
        // Add new fields
        Object.assign(result, diff.added || {});
        
        // Apply modifications
        for (const [key, change] of Object.entries(diff.modified || {})) {
            result[key] = change.to;
        }
        
        return result;
    }
    
    /**
     * Backup mapping configuration with timestamp
     * @param {Object} mapping - Mapping to backup
     * @param {string} reason - Reason for backup
     * @returns {Object} Backup object with metadata
     */
    static createMappingBackup(mapping, reason = 'manual') {
        return {
            mapping: foundry.utils.deepClone(mapping),
            timestamp: new Date().toISOString(),
            reason,
            version: "1.0.0"
        };
    }
    
    /**
     * Restore mapping from backup
     * @param {Object} backup - Backup object
     * @returns {Object} Restored mapping
     */
    static restoreMappingFromBackup(backup) {
        if (!backup || !backup.mapping) {
            throw new MappingPreservationError(
                'restoreMappingFromBackup',
                'Invalid backup object',
                ['Verify backup contains mapping data']
            );
        }
        
        return foundry.utils.deepClone(backup.mapping);
    }
    
    /**
     * Comprehensive mapping integrity validation
     * Validates mapping completeness, syntax, and provides repair suggestions
     * @param {Object} mapping - Mapping configuration to validate
     * @param {string} documentType - Document type for validation context
     * @param {string} subType - Sub-type for validation context
     * @param {Object} options - Validation options
     * @returns {ValidationResult} Comprehensive validation result with repair suggestions
     */
    static validateMappingIntegrity(mapping, documentType, subType = null, options = {}) {
        const validationOptions = {
            checkCompleteness: true,
            checkSyntax: true,
            provideSuggestions: true,
            strictMode: false,
            ...options
        };
        
        const result = new ValidationResult();
        
        try {
            // Basic structure validation
            if (!mapping || typeof mapping !== 'object') {
                result.addIssue('error', 'invalid_structure', 
                    'Mapping must be a valid object');
                return result;
            }
            
            // Completeness validation
            if (validationOptions.checkCompleteness) {
                const completenessResult = this.validateMappingCompleteness(mapping, documentType, subType);
                result.issues.push(...completenessResult.issues);
                if (!completenessResult.isValid) {
                    result.isValid = false;
                }
            }
            
            // Syntax validation
            if (validationOptions.checkSyntax) {
                this._validateMappingSyntax(mapping, result);
            }
            
            // Provide repair suggestions
            if (validationOptions.provideSuggestions) {
                this._addRepairSuggestions(result, mapping, documentType, subType);
            }
            
            return result;
            
        } catch (error) {
            result.addIssue('error', 'validation_error', 
                `Validation failed: ${error.message}`);
            result.isValid = false;
            return result;
        }
    }
    
    /**
     * Detect missing fields and provide specific repair suggestions
     * @param {Object} mapping - Current mapping configuration
     * @param {string} documentType - Document type
     * @param {string} subType - Sub-type
     * @returns {Object} Missing fields report with suggestions
     */
    static detectMissingFields(mapping, documentType, subType = null) {
        const report = {
            missingFields: [],
            suggestions: [],
            autoRepairAvailable: false
        };
        
        try {
            const standardTemplate = this.loadMappingTemplate(documentType, subType);
            const missingFields = this._findMissingFields(mapping, standardTemplate);
            
            report.missingFields = missingFields;
            report.autoRepairAvailable = missingFields.length > 0;
            
            // Generate specific suggestions for each missing field
            for (const field of missingFields) {
                const templateValue = standardTemplate[field];
                const suggestion = {
                    field,
                    suggestedValue: templateValue,
                    reason: this._getMissingFieldReason(field, documentType, subType),
                    priority: this._getMissingFieldPriority(field, documentType)
                };
                report.suggestions.push(suggestion);
            }
            
            // Sort suggestions by priority
            report.suggestions.sort((a, b) => b.priority - a.priority);
            
            return report;
            
        } catch (error) {
            throw new MappingPreservationError(
                'detectMissingFields',
                error.message,
                ['Verify document type is supported', 'Check template availability']
            );
        }
    }
    
    /**
     * Auto-repair mapping by adding missing fields
     * @param {Object} mapping - Current mapping to repair
     * @param {string} documentType - Document type
     * @param {string} subType - Sub-type
     * @param {Object} options - Repair options
     * @returns {Object} Repaired mapping with repair report
     */
    static autoRepairMapping(mapping, documentType, subType = null, options = {}) {
        const repairOptions = {
            addMissingFields: true,
            fixInvalidSyntax: true,
            preserveExisting: true,
            ...options
        };
        
        const repairReport = {
            fieldsAdded: [],
            fieldsFixed: [],
            warnings: []
        };
        
        try {
            const repairedMapping = foundry.utils.deepClone(mapping);
            
            if (repairOptions.addMissingFields) {
                const missingReport = this.detectMissingFields(mapping, documentType, subType);
                
                for (const suggestion of missingReport.suggestions) {
                    if (suggestion.priority >= 3) { // Only add high-priority fields
                        repairedMapping[suggestion.field] = suggestion.suggestedValue;
                        repairReport.fieldsAdded.push({
                            field: suggestion.field,
                            value: suggestion.suggestedValue,
                            reason: suggestion.reason
                        });
                    }
                }
            }
            
            if (repairOptions.fixInvalidSyntax) {
                this._fixInvalidSyntax(repairedMapping, repairReport);
            }
            
            return {
                mapping: repairedMapping,
                report: repairReport
            };
            
        } catch (error) {
            throw new MappingPreservationError(
                'autoRepairMapping',
                error.message,
                ['Check mapping structure', 'Verify repair options']
            );
        }
    }
    
    /**
     * Validate mapping syntax
     * @param {Object} mapping - Mapping to validate
     * @param {ValidationResult} result - Result object to add issues to
     * @private
     */
    static _validateMappingSyntax(mapping, result) {
        for (const [key, value] of Object.entries(mapping)) {
            if (typeof value === 'string') {
                // Validate simple mapping paths
                if (!this._isValidMappingPath(value)) {
                    result.addIssue('warning', 'invalid_syntax', 
                        `Potentially invalid mapping path for ${key}: ${value}`, key);
                }
            } else if (typeof value === 'object' && value !== null) {
                // Validate complex mappings
                if (value.path && !this._isValidMappingPath(value.path)) {
                    result.addIssue('warning', 'invalid_syntax', 
                        `Potentially invalid mapping path for ${key}: ${value.path}`, key);
                }
                
                if (value.converter && !this._isValidConverter(value.converter)) {
                    result.addIssue('warning', 'invalid_converter', 
                        `Unknown converter for ${key}: ${value.converter}`, key);
                }
                
                // Check for required properties in complex mappings
                if (!value.path && !value.converter) {
                    result.addIssue('error', 'incomplete_mapping', 
                        `Complex mapping ${key} missing both path and converter`, key);
                }
            } else {
                result.addIssue('error', 'invalid_type', 
                    `Invalid mapping type for ${key}: ${typeof value}`, key);
            }
        }
    }
    
    /**
     * Add repair suggestions to validation result
     * @param {ValidationResult} result - Validation result to enhance
     * @param {Object} mapping - Current mapping
     * @param {string} documentType - Document type
     * @param {string} subType - Sub-type
     * @private
     */
    static _addRepairSuggestions(result, mapping, documentType, subType) {
        const missingFieldIssues = result.issues.filter(issue => issue.type === 'missing_field');
        
        if (missingFieldIssues.length > 0) {
            const suggestion = `Consider running autoRepairMapping() to add ${missingFieldIssues.length} missing fields automatically.`;
            result.addIssue('info', 'repair_suggestion', suggestion);
        }
        
        const syntaxIssues = result.issues.filter(issue => issue.type === 'invalid_syntax');
        if (syntaxIssues.length > 0) {
            const suggestion = `Review ${syntaxIssues.length} syntax warnings and verify mapping paths are correct for your SWADE system version.`;
            result.addIssue('info', 'repair_suggestion', suggestion);
        }
    }
    
    /**
     * Get reason for missing field
     * @param {string} field - Field name
     * @param {string} documentType - Document type
     * @param {string} subType - Sub-type
     * @returns {string} Reason description
     * @private
     */
    static _getMissingFieldReason(field, documentType, subType) {
        const commonReasons = {
            'description': 'Essential for translation - contains main content',
            'name': 'Required for identification and translation',
            'notes': 'Important for additional context and flavor text',
            'source': 'Helps translators understand content origin',
            'category': 'Used for organization and filtering',
            'actions': 'Contains translatable action descriptions',
            'effects': 'Active effects may contain translatable text'
        };
        
        if (commonReasons[field]) {
            return commonReasons[field];
        }
        
        if (documentType === 'Item') {
            const itemReasons = {
                'damage': 'Weapon damage information for display',
                'range': 'Weapon range information',
                'requirements': 'Edge/Hindrance requirements text',
                'trapping': 'Power trapping descriptions'
            };
            return itemReasons[field] || `Standard ${documentType} field for ${subType || 'items'}`;
        }
        
        return `Standard field for ${documentType} documents`;
    }
    
    /**
     * Get priority for missing field (1-5, higher is more important)
     * @param {string} field - Field name
     * @param {string} documentType - Document type
     * @returns {number} Priority level
     * @private
     */
    static _getMissingFieldPriority(field, documentType) {
        const highPriority = ['description', 'name', 'notes'];
        const mediumPriority = ['source', 'category', 'actions'];
        const lowPriority = ['effects', 'requirements'];
        
        if (highPriority.includes(field)) return 5;
        if (mediumPriority.includes(field)) return 3;
        if (lowPriority.includes(field)) return 2;
        return 1;
    }
    
    /**
     * Check if a mapping path is valid
     * @param {string} path - Path to validate
     * @returns {boolean} Whether path is valid
     * @private
     */
    static _isValidMappingPath(path) {
        if (!path || typeof path !== 'string') return false;
        
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
               path.includes('.') || 
               validPrefixes.includes(path);
    }
    
    /**
     * Check if a converter name is valid
     * @param {string} converter - Converter name to validate
     * @returns {boolean} Whether converter is valid
     * @private
     */
    static _isValidConverter(converter) {
        const knownConverters = [
            'actions',
            'effects',
            'requirements',
            'embeddedItems',
            'nestedContent',
            'richText',
            'simpleText'
        ];
        
        return knownConverters.includes(converter);
    }
    
    /**
     * Fix invalid syntax in mapping
     * @param {Object} mapping - Mapping to fix
     * @param {Object} repairReport - Report to add fixes to
     * @private
     */
    static _fixInvalidSyntax(mapping, repairReport) {
        for (const [key, value] of Object.entries(mapping)) {
            if (typeof value === 'object' && value !== null) {
                // Fix incomplete complex mappings
                if (!value.path && !value.converter) {
                    // Try to infer a reasonable path
                    const inferredPath = this._inferMappingPath(key);
                    if (inferredPath) {
                        mapping[key] = inferredPath;
                        repairReport.fieldsFixed.push({
                            field: key,
                            issue: 'incomplete_complex_mapping',
                            fix: `Converted to simple path: ${inferredPath}`
                        });
                    }
                }
            }
        }
    }
    
    /**
     * Infer a reasonable mapping path for a field name
     * @param {string} fieldName - Field name to infer path for
     * @returns {string|null} Inferred path or null
     * @private
     */
    static _inferMappingPath(fieldName) {
        const commonPaths = {
            'description': 'system.description',
            'notes': 'system.notes',
            'source': 'system.source',
            'category': 'system.category',
            'damage': 'system.damage',
            'range': 'system.range',
            'ap': 'system.ap',
            'parry': 'system.parry',
            'armor': 'system.armor',
            'toughness': 'system.toughness'
        };
        
        return commonPaths[fieldName] || null;
    }
}