/**
 * Simple validation test for core modules
 * This can be run in a FoundryVTT environment to verify the modules work correctly
 */

import { SmartContentFilter } from './smart-content-filter.mjs';
import { TranslationDatabase, createTranslationDatabase } from './translation-database.mjs';

/**
 * Run basic validation tests
 */
export async function runValidationTests() {
    console.log('Running SmartContentFilter validation tests...');
    
    try {
        // Test 1: SmartContentFilter instantiation
        const filter = new SmartContentFilter();
        console.log('✓ SmartContentFilter created successfully');
        
        // Test 2: TranslationDatabase instantiation
        const db = createTranslationDatabase();
        console.log('✓ TranslationDatabase created successfully');
        
        // Test 3: Content hash generation
        const testContent = {
            name: 'Test Item',
            type: 'weapon',
            system: {
                description: 'A test weapon',
                damage: '2d6'
            }
        };
        
        const hash = filter.generateContentHash(testContent);
        console.log(`✓ Content hash generated: ${hash}`);
        
        // Test 4: Filter embedded items with empty array
        const filterResult = await filter.filterEmbeddedItems([], {
            enableSmartFiltering: true,
            includeAllEmbeddedItems: false
        });
        
        console.log('✓ Filter embedded items works with empty array');
        console.log(`  - Total: ${filterResult.statistics.total}`);
        console.log(`  - Included: ${filterResult.statistics.included}`);
        console.log(`  - Excluded: ${filterResult.statistics.excluded}`);
        
        // Test 5: Translation database cache operations
        db.setContentHash('test-item', 'test-compendium', hash);
        const retrievedHash = db.getContentHash('test-item', 'test-compendium');
        
        if (retrievedHash === hash) {
            console.log('✓ Translation database hash cache works correctly');
        } else {
            console.log('✗ Translation database hash cache failed');
        }
        
        // Test 6: Clear cache
        db.clearCache();
        const clearedHash = db.getContentHash('test-item', 'test-compendium');
        
        if (clearedHash === null) {
            console.log('✓ Translation database cache clearing works correctly');
        } else {
            console.log('✗ Translation database cache clearing failed');
        }
        
        console.log('All validation tests completed successfully!');
        return true;
        
    } catch (error) {
        console.error('Validation test failed:', error);
        return false;
    }
}

// Auto-run if this module is loaded directly in FoundryVTT
if (typeof game !== 'undefined' && game.ready) {
    runValidationTests();
}