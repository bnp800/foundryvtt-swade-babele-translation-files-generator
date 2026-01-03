import { createTranslationDatabase } from './translation-database.mjs';

/**
 * Smart Content Filter for intelligent translation content filtering
 * 
 * This class provides functionality to:
 * - Detect already translated content
 * - Detect content changes using hash comparison
 * - Filter embedded items to avoid duplicate exports
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export class SmartContentFilter {
    /**
     * Smart content filter for avoiding duplicate exports of translated content
     * @param {Object} translationDatabase - Translation database interface (optional)
     */
    constructor(translationDatabase = null) {
        this.translationDatabase = translationDatabase || createTranslationDatabase();
        this.contentHashCache = new Map();
    }

    /**
     * Check if an Item is already translated in the corresponding compendium
     * @param {Object} item - Item object to check
     * @param {string} compendiumId - Compendium ID to check against
     * @returns {Promise<boolean>} Whether the item is already translated
     */
    async isItemAlreadyTranslated(item, compendiumId) {
        if (!item || !compendiumId) {
            return false;
        }

        try {
            // Check if translation database has this item
            const translationStatus = await this.translationDatabase.getTranslationStatus(
                item._id || item.name,
                compendiumId
            );

            return translationStatus && translationStatus.isTranslated;
        } catch (error) {
            console.warn(`SmartContentFilter: Error checking translation status for item ${item.name}:`, error);
            return false;
        }
    }

    /**
     * Check if content has changed since last translation
     * @param {Object} item - Current Item object
     * @param {Object} existingTranslation - Existing translation data
     * @returns {Promise<boolean>} Whether content has changed
     */
    async hasContentChanged(item, existingTranslation) {
        if (!item || !existingTranslation) {
            return true; // If no existing translation, consider it changed
        }

        try {
            const currentHash = this.generateContentHash(item);
            const existingHash = existingTranslation.contentHash;

            // If no existing hash, consider it changed
            if (!existingHash) {
                return true;
            }

            return currentHash !== existingHash;
        } catch (error) {
            console.warn(`SmartContentFilter: Error checking content changes for item ${item.name}:`, error);
            return true; // On error, assume content changed to be safe
        }
    }

    /**
     * Filter embedded items, excluding already translated content
     * @param {Array} embeddedItems - Array of embedded items
     * @param {Object} options - Filtering options
     * @param {boolean} options.includeAllEmbeddedItems - Force include all items
     * @param {boolean} options.enableSmartFiltering - Enable smart filtering
     * @returns {Promise<FilterResult>} Filtering result with filtered items and statistics
     */
    async filterEmbeddedItems(embeddedItems, options = {}) {
        const {
            includeAllEmbeddedItems = false,
            enableSmartFiltering = true
        } = options;

        const result = {
            filteredItems: [],
            statistics: {
                total: embeddedItems.length,
                included: 0,
                excluded: 0,
                alreadyTranslated: 0,
                contentChanged: 0,
                newItems: 0
            }
        };

        // If smart filtering is disabled or user wants all items, include everything
        if (!enableSmartFiltering || includeAllEmbeddedItems) {
            result.filteredItems = [...embeddedItems];
            result.statistics.included = embeddedItems.length;
            return result;
        }

        // Process each embedded item
        for (const item of embeddedItems) {
            try {
                const shouldInclude = await this._shouldIncludeEmbeddedItem(item, result.statistics);
                
                if (shouldInclude) {
                    result.filteredItems.push(item);
                    result.statistics.included++;
                } else {
                    result.statistics.excluded++;
                }
            } catch (error) {
                console.warn(`SmartContentFilter: Error processing embedded item ${item.name}:`, error);
                // On error, include the item to be safe
                result.filteredItems.push(item);
                result.statistics.included++;
            }
        }

        return result;
    }

    /**
     * Generate content hash for change detection
     * @param {Object} content - Content object to hash
     * @returns {string} Content hash
     */
    generateContentHash(content) {
        if (!content) {
            return '';
        }

        try {
            // Create a normalized version of the content for hashing
            const normalizedContent = this._normalizeContentForHashing(content);
            
            // Use a simple hash function (for FoundryVTT environment)
            return this._simpleHash(JSON.stringify(normalizedContent));
        } catch (error) {
            console.warn('SmartContentFilter: Error generating content hash:', error);
            return '';
        }
    }

    /**
     * Determine if an embedded item should be included in export
     * @private
     * @param {Object} item - Item to evaluate
     * @param {Object} statistics - Statistics object to update
     * @returns {Promise<boolean>} Whether to include the item
     */
    async _shouldIncludeEmbeddedItem(item, statistics) {
        // Get the compendium ID for this item type
        const compendiumId = this._getItemCompendiumId(item.type);
        
        if (!compendiumId) {
            // If we can't determine the compendium, include the item
            statistics.newItems++;
            return true;
        }

        // Check if item is already translated
        const isTranslated = await this.isItemAlreadyTranslated(item, compendiumId);
        
        if (!isTranslated) {
            // Item is not translated, include it
            statistics.newItems++;
            return true;
        }

        statistics.alreadyTranslated++;

        // Item is translated, check if content has changed
        const existingTranslation = await this._getExistingTranslation(item, compendiumId);
        const hasChanged = await this.hasContentChanged(item, existingTranslation);
        
        if (hasChanged) {
            statistics.contentChanged++;
            return true;
        }

        // Item is translated and unchanged, exclude it
        return false;
    }

    /**
     * Get the compendium ID for a given item type
     * @private
     * @param {string} itemType - Type of the item
     * @returns {string|null} Compendium ID or null if not found
     */
    _getItemCompendiumId(itemType) {
        // Map item types to their corresponding compendium IDs
        // This would be configured based on the SWADE system structure
        const typeToCompendiumMap = {
            'edge': 'swade-core-rules.swade-edges',
            'hindrance': 'swade-core-rules.swade-hindrances',
            'power': 'swade-core-rules.swade-powers',
            'weapon': 'swade-core-rules.swade-equipment',
            'armor': 'swade-core-rules.swade-equipment',
            'gear': 'swade-core-rules.swade-equipment',
            'skill': 'swade-core-rules.swade-skills',
            'ability': 'swade-core-rules.swade-abilities'
        };

        return typeToCompendiumMap[itemType] || null;
    }

    /**
     * Get existing translation for an item
     * @private
     * @param {Object} item - Item object
     * @param {string} compendiumId - Compendium ID
     * @returns {Promise<Object|null>} Existing translation or null
     */
    async _getExistingTranslation(item, compendiumId) {
        try {
            return await this.translationDatabase.getTranslation(
                item._id || item.name,
                compendiumId
            );
        } catch (error) {
            console.warn(`SmartContentFilter: Error getting existing translation for ${item.name}:`, error);
            return null;
        }
    }

    /**
     * Normalize content for consistent hashing
     * @private
     * @param {Object} content - Content to normalize
     * @returns {Object} Normalized content
     */
    _normalizeContentForHashing(content) {
        // Create a copy and remove fields that shouldn't affect hash
        const normalized = foundry.utils.duplicate(content);
        
        // Remove metadata fields that change frequently but don't affect translation
        delete normalized._id;
        delete normalized.folder;
        delete normalized.sort;
        delete normalized.ownership;
        delete normalized.flags;
        delete normalized._stats;

        // Sort object keys for consistent hashing
        return this._sortObjectKeys(normalized);
    }

    /**
     * Sort object keys recursively for consistent hashing
     * @private
     * @param {any} obj - Object to sort
     * @returns {any} Object with sorted keys
     */
    _sortObjectKeys(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this._sortObjectKeys(item));
        }

        const sortedKeys = Object.keys(obj).sort();
        const sortedObj = {};
        
        for (const key of sortedKeys) {
            sortedObj[key] = this._sortObjectKeys(obj[key]);
        }

        return sortedObj;
    }

    /**
     * Simple hash function for content hashing
     * @private
     * @param {string} str - String to hash
     * @returns {string} Hash value
     */
    _simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString();
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    }
}

/**
 * Filter result structure
 * @typedef {Object} FilterResult
 * @property {Array} filteredItems - Items that passed the filter
 * @property {Object} statistics - Filtering statistics
 * @property {number} statistics.total - Total items processed
 * @property {number} statistics.included - Items included in result
 * @property {number} statistics.excluded - Items excluded from result
 * @property {number} statistics.alreadyTranslated - Items already translated
 * @property {number} statistics.contentChanged - Items with changed content
 * @property {number} statistics.newItems - New items not yet translated
 */