/**
 * Translation Database Interface
 * 
 * Provides interface for querying translation status and managing content hashes
 * 
 * Requirements: 2.1, 7.1
 */
export class TranslationDatabase {
    /**
     * Translation database interface for querying translation status
     */
    constructor() {
        this.translationCache = new Map();
        this.hashCache = new Map();
        this.compendiumCache = new Map();
    }

    /**
     * Get translation status for an item
     * @param {string} itemId - Item ID or name
     * @param {string} compendiumId - Compendium ID
     * @returns {Promise<TranslationStatus|null>} Translation status or null if not found
     */
    async getTranslationStatus(itemId, compendiumId) {
        const cacheKey = `${compendiumId}:${itemId}`;
        
        // Check cache first
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }

        try {
            // Load translation file for the compendium
            const translationData = await this._loadTranslationFile(compendiumId);
            
            if (!translationData || !translationData.entries) {
                return null;
            }

            // Check if item exists in translation
            const translationEntry = translationData.entries[itemId];
            
            if (!translationEntry) {
                return null;
            }

            const status = {
                isTranslated: true,
                hasTranslatedName: !!translationEntry.name,
                hasTranslatedDescription: !!translationEntry.description,
                lastModified: translationEntry._lastModified || null,
                contentHash: translationEntry._contentHash || null
            };

            // Cache the result
            this.translationCache.set(cacheKey, status);
            
            return status;
        } catch (error) {
            console.warn(`TranslationDatabase: Error getting translation status for ${itemId} in ${compendiumId}:`, error);
            return null;
        }
    }

    /**
     * Get existing translation data for an item
     * @param {string} itemId - Item ID or name
     * @param {string} compendiumId - Compendium ID
     * @returns {Promise<Object|null>} Translation data or null if not found
     */
    async getTranslation(itemId, compendiumId) {
        try {
            const translationData = await this._loadTranslationFile(compendiumId);
            
            if (!translationData || !translationData.entries) {
                return null;
            }

            return translationData.entries[itemId] || null;
        } catch (error) {
            console.warn(`TranslationDatabase: Error getting translation for ${itemId} in ${compendiumId}:`, error);
            return null;
        }
    }

    /**
     * Check if a translation file exists for a compendium
     * @param {string} compendiumId - Compendium ID
     * @returns {Promise<boolean>} Whether translation file exists
     */
    async hasTranslationFile(compendiumId) {
        try {
            const translationData = await this._loadTranslationFile(compendiumId);
            return translationData !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get content hash for an item from cache
     * @param {string} itemId - Item ID or name
     * @param {string} compendiumId - Compendium ID
     * @returns {string|null} Content hash or null if not found
     */
    getContentHash(itemId, compendiumId) {
        const cacheKey = `${compendiumId}:${itemId}`;
        return this.hashCache.get(cacheKey) || null;
    }

    /**
     * Set content hash for an item in cache
     * @param {string} itemId - Item ID or name
     * @param {string} compendiumId - Compendium ID
     * @param {string} hash - Content hash
     */
    setContentHash(itemId, compendiumId, hash) {
        const cacheKey = `${compendiumId}:${itemId}`;
        this.hashCache.set(cacheKey, hash);
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.translationCache.clear();
        this.hashCache.clear();
        this.compendiumCache.clear();
    }

    /**
     * Clear cache for a specific compendium
     * @param {string} compendiumId - Compendium ID
     */
    clearCompendiumCache(compendiumId) {
        // Clear translation cache entries for this compendium
        for (const [key] of this.translationCache) {
            if (key.startsWith(`${compendiumId}:`)) {
                this.translationCache.delete(key);
            }
        }

        // Clear hash cache entries for this compendium
        for (const [key] of this.hashCache) {
            if (key.startsWith(`${compendiumId}:`)) {
                this.hashCache.delete(key);
            }
        }

        // Clear compendium data cache
        this.compendiumCache.delete(compendiumId);
    }

    /**
     * Get statistics about translation coverage for a compendium
     * @param {string} compendiumId - Compendium ID
     * @returns {Promise<TranslationStats>} Translation statistics
     */
    async getTranslationStats(compendiumId) {
        try {
            const translationData = await this._loadTranslationFile(compendiumId);
            
            if (!translationData || !translationData.entries) {
                return {
                    totalEntries: 0,
                    translatedEntries: 0,
                    partiallyTranslated: 0,
                    fullyTranslated: 0,
                    coverage: 0
                };
            }

            const entries = Object.values(translationData.entries);
            const totalEntries = entries.length;
            let fullyTranslated = 0;
            let partiallyTranslated = 0;

            for (const entry of entries) {
                const hasName = !!entry.name;
                const hasDescription = !!entry.description;
                
                if (hasName && hasDescription) {
                    fullyTranslated++;
                } else if (hasName || hasDescription) {
                    partiallyTranslated++;
                }
            }

            const translatedEntries = fullyTranslated + partiallyTranslated;
            const coverage = totalEntries > 0 ? (translatedEntries / totalEntries) * 100 : 0;

            return {
                totalEntries,
                translatedEntries,
                partiallyTranslated,
                fullyTranslated,
                coverage: Math.round(coverage * 100) / 100
            };
        } catch (error) {
            console.warn(`TranslationDatabase: Error getting translation stats for ${compendiumId}:`, error);
            return {
                totalEntries: 0,
                translatedEntries: 0,
                partiallyTranslated: 0,
                fullyTranslated: 0,
                coverage: 0
            };
        }
    }

    /**
     * Load translation file for a compendium
     * @private
     * @param {string} compendiumId - Compendium ID
     * @returns {Promise<Object|null>} Translation data or null if not found
     */
    async _loadTranslationFile(compendiumId) {
        // Check cache first
        if (this.compendiumCache.has(compendiumId)) {
            return this.compendiumCache.get(compendiumId);
        }

        try {
            // Try to find existing translation file in the file system
            const translationData = await this._findTranslationFile(compendiumId);
            
            // Cache the result (even if null)
            this.compendiumCache.set(compendiumId, translationData);
            
            return translationData;
        } catch (error) {
            console.warn(`TranslationDatabase: Error loading translation file for ${compendiumId}:`, error);
            this.compendiumCache.set(compendiumId, null);
            return null;
        }
    }

    /**
     * Find translation file for a compendium
     * @private
     * @param {string} compendiumId - Compendium ID
     * @returns {Promise<Object|null>} Translation data or null if not found
     */
    async _findTranslationFile(compendiumId) {
        // In a real implementation, this would search for translation files
        // in the file system or from a configured translation directory
        
        // For now, we'll simulate by checking if there are any uploaded files
        // that match the compendium ID pattern
        
        try {
            // This is a placeholder implementation
            // In a real scenario, you would:
            // 1. Check a configured translation directory
            // 2. Look for files matching the pattern: {compendiumId}.json
            // 3. Load and parse the JSON file
            
            // For demonstration, we'll return null (no translation found)
            // This would be replaced with actual file system access
            
            return null;
        } catch (error) {
            console.warn(`TranslationDatabase: Error finding translation file for ${compendiumId}:`, error);
            return null;
        }
    }

    /**
     * Validate translation data structure
     * @private
     * @param {Object} data - Translation data to validate
     * @returns {boolean} Whether data is valid
     */
    _validateTranslationData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Check for required structure
        if (!data.entries || typeof data.entries !== 'object') {
            return false;
        }

        return true;
    }
}

/**
 * Translation status structure
 * @typedef {Object} TranslationStatus
 * @property {boolean} isTranslated - Whether item has any translation
 * @property {boolean} hasTranslatedName - Whether name is translated
 * @property {boolean} hasTranslatedDescription - Whether description is translated
 * @property {string|null} lastModified - Last modification timestamp
 * @property {string|null} contentHash - Content hash for change detection
 */

/**
 * Translation statistics structure
 * @typedef {Object} TranslationStats
 * @property {number} totalEntries - Total number of entries
 * @property {number} translatedEntries - Number of translated entries
 * @property {number} partiallyTranslated - Number of partially translated entries
 * @property {number} fullyTranslated - Number of fully translated entries
 * @property {number} coverage - Translation coverage percentage
 */

/**
 * Create a default translation database instance
 * @returns {TranslationDatabase} Default translation database
 */
export function createTranslationDatabase() {
    return new TranslationDatabase();
}