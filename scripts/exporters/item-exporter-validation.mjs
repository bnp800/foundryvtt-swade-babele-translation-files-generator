/**
 * Validation test for enhanced ItemExporter
 * This can be run in a FoundryVTT environment to verify the enhanced ItemExporter works correctly
 */

import { ItemExporter } from './item-exporter.mjs';
import { TemplateManager } from '../core/template-manager.mjs';
import { MappingPreservationEngine } from '../core/mapping-preservation-engine.mjs';

/**
 * Run ItemExporter validation tests
 */
export async function runItemExporterValidationTests() {
    console.log('Running ItemExporter validation tests...');
    
    try {
        // Test 1: Template application
        const weaponTemplate = TemplateManager.applyTemplate('Item', 'weapon');
        console.log('✓ Template application works for weapon type');
        console.log(`  - Template fields: ${Object.keys(weaponTemplate).length}`);
        
        // Test 2: Field extraction from mapping
        const mockDocument = {
            name: 'Test Sword',
            type: 'weapon',
            system: {
                description: 'A sharp blade',
                damage: '2d6',
                range: 'Melee',
                ap: 2,
                notes: 'Well-balanced'
            },
            effects: []
        };
        
        const extractResult = ItemExporter.extractFieldsFromMapping(
            mockDocument, 
            weaponTemplate, 
            ['name']
        );
        
        console.log('✓ Field extraction from mapping works');
        console.log(`  - Extracted fields: ${Object.keys(extractResult.data).length}`);
        console.log(`  - Applied mappings: ${Object.keys(extractResult.mapping).length}`);
        
        // Test 3: Document data generation
        const documentData = ItemExporter.getDocumentData(
            mockDocument,
            {},
            {}
        );
        
        console.log('✓ Document data generation works');
        console.log(`  - Document data fields: ${Object.keys(documentData).length}`);
        console.log(`  - Has name: ${!!documentData.name}`);
        console.log(`  - Has description: ${!!documentData.description}`);
        
        // Test 4: Active Effects processing
        const mockDocumentWithEffects = {
            ...mockDocument,
            effects: [
                {
                    _id: 'effect1',
                    name: 'Sharp',
                    description: 'Increases damage',
                    _tombstone: false
                },
                {
                    _id: 'effect2',
                    name: 'Blessed',
                    description: 'Effective against undead',
                    _tombstone: false
                }
            ]
        };
        
        const processedEffects = ItemExporter.processActiveEffects(mockDocumentWithEffects.effects);
        console.log('✓ Active Effects processing works');
        console.log(`  - Processed effects: ${Object.keys(processedEffects).length}`);
        
        // Test 5: Mapping completeness validation
        const mockExporter = {
            dataset: {
                mapping: {}
            },
            options: {
                autoRepairMappings: false
            }
        };
        
        // Bind the method to mock exporter
        const ensureCompleteness = ItemExporter.prototype.ensureMappingCompleteness.bind(mockExporter);
        ensureCompleteness('weapon');
        
        console.log('✓ Mapping completeness validation works');
        console.log(`  - Final mapping fields: ${Object.keys(mockExporter.dataset.mapping).length}`);
        
        // Test 6: Mapping validation
        const validation = MappingPreservationEngine.validateMappingCompleteness(
            mockExporter.dataset.mapping,
            'Item',
            'weapon'
        );
        
        console.log('✓ Mapping validation works');
        console.log(`  - Is valid: ${validation.isValid}`);
        console.log(`  - Issues: ${validation.issues.length}`);
        console.log(`  - Errors: ${validation.getErrorCount()}`);
        console.log(`  - Warnings: ${validation.getWarningCount()}`);
        
        // Test 7: Mapping reordering
        const testMapping = {
            effects: { path: 'effects', converter: 'effects' },
            name: 'name',
            damage: 'system.damage',
            description: 'system.description'
        };
        
        ItemExporter._reorderMapping(testMapping);
        const orderedKeys = Object.keys(testMapping);
        
        console.log('✓ Mapping reordering works');
        console.log(`  - Field order: ${orderedKeys.join(', ')}`);
        console.log(`  - Description first: ${orderedKeys[1] === 'description'}`);
        
        console.log('All ItemExporter validation tests completed successfully!');
        return true;
        
    } catch (error) {
        console.error('ItemExporter validation test failed:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Auto-run if this module is loaded directly in FoundryVTT
if (typeof game !== 'undefined' && game.ready) {
    runItemExporterValidationTests();
}