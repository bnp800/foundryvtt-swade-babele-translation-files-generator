# Design Document: Generator Mapping Preservation and Smart Export

## Overview

本设计文档描述了对 foundryvtt-swade-babele-translation-files-generator 模块的改进，重点解决当前导出过程中存在的映射丢失和重复导出问题。该改进将确保导出的翻译文件保留完整的自定义映射配置，并智能过滤已翻译的内容，避免不必要的重复工作。

### 核心设计原则

1. **映射保留优先**: 确保所有现有的自定义映射字段在导出过程中得到完整保留
2. **智能过滤**: 自动识别并过滤已翻译的嵌入内容，减少重复工作
3. **向后兼容**: 保持与现有翻译文件和工作流的完全兼容性
4. **用户控制**: 提供灵活的选项让用户控制导出行为

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Enhanced Translation Generator                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   Mapping        │    │   Smart Content  │    │   Template       │      │
│  │   Preservation   │    │   Filter         │    │   Manager        │      │
│  │   Engine         │    │                  │    │                  │      │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│           │                        │                        │               │
│           ▼                        ▼                        ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Enhanced Abstract Exporter                       │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────────┐ │   │
│  │  │   Mapping     │ │   Content     │ │      Validation           │ │   │
│  │  │   Merger      │ │   Analyzer    │ │      Engine               │ │   │
│  │  └───────────────┘ └───────────────┘ └───────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │                        │                        │               │
│           ▼                        ▼                        ▼               │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   Item Exporter  │    │   Actor Exporter │    │   Other          │      │
│  │   (Enhanced)     │    │   (Enhanced)     │    │   Exporters      │      │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘      │
│           │                        │                        │               │
│           ▼                        ▼                        ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Enhanced UI Components                           │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────────┐ │   │
│  │  │   Export      │ │   Mapping     │ │      Progress             │ │   │
│  │  │   Options     │ │   Manager     │ │      Tracker              │ │   │
│  │  └───────────────┘ └───────────────┘ └───────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Mapping Preservation Engine (映射保留引擎)

负责保留和合并自定义映射字段。

```javascript
class MappingPreservationEngine {
    /**
     * 保留现有映射字段的核心引擎
     */
    
    static preserveExistingMappings(existingMapping, newMapping) {
        /**
         * 深度合并映射配置，确保现有字段不丢失
         * @param {Object} existingMapping - 现有映射配置
         * @param {Object} newMapping - 新的映射配置
         * @returns {Object} 合并后的完整映射配置
         */
    }
    
    static loadMappingTemplate(documentType) {
        /**
         * 加载文档类型对应的标准映射模板
         * @param {string} documentType - 文档类型 (Item, Actor, etc.)
         * @returns {Object} 标准映射模板
         */
    }
    
    static validateMappingCompleteness(mapping, documentType) {
        /**
         * 验证映射配置的完整性
         * @param {Object} mapping - 映射配置
         * @param {string} documentType - 文档类型
         * @returns {ValidationResult} 验证结果
         */
    }
    
    static detectMappingConflicts(mapping1, mapping2) {
        /**
         * 检测映射配置冲突
         * @param {Object} mapping1 - 映射配置1
         * @param {Object} mapping2 - 映射配置2
         * @returns {ConflictReport} 冲突报告
         */
    }
}
```

### 2. Smart Content Filter (智能内容过滤器)

智能识别和过滤已翻译的嵌入内容。

```javascript
class SmartContentFilter {
    /**
     * 智能内容过滤器，避免重复导出已翻译内容
     */
    
    constructor(translationDatabase) {
        this.translationDatabase = translationDatabase;
        this.contentHashCache = new Map();
    }
    
    async isItemAlreadyTranslated(item, compendiumId) {
        /**
         * 检查 Item 是否已在对应的 compendium 中翻译
         * @param {Object} item - Item 对象
         * @param {string} compendiumId - Compendium ID
         * @returns {boolean} 是否已翻译
         */
    }
    
    async hasContentChanged(item, existingTranslation) {
        /**
         * 检查内容是否已变更
         * @param {Object} item - 当前 Item 对象
         * @param {Object} existingTranslation - 现有翻译
         * @returns {boolean} 内容是否已变更
         */
    }
    
    filterEmbeddedItems(embeddedItems, options) {
        /**
         * 过滤嵌入的 Items，排除已翻译的内容
         * @param {Array} embeddedItems - 嵌入的 Items
         * @param {Object} options - 过滤选项
         * @returns {FilterResult} 过滤结果
         */
    }
    
    generateContentHash(content) {
        /**
         * 生成内容哈希用于变更检测
         * @param {Object} content - 内容对象
         * @returns {string} 内容哈希
         */
    }
}
```

### 3. Template Manager (模板管理器)

管理映射模板和配置。

```javascript
class TemplateManager {
    /**
     * 映射模板管理器
     */
    
    static loadStandardTemplates() {
        /**
         * 加载标准映射模板
         * @returns {Object} 标准模板集合
         */
        return STANDARD_MAPPING_TEMPLATES;
    }
    
    static getItemTypeSpecificMapping(itemType) {
        /**
         * 获取特定物品类型的映射配置
         * @param {string} itemType - 物品类型 (weapon, armor, edge, etc.)
         * @returns {Object} 特定类型的映射配置
         */
        return ITEM_TYPE_SPECIFIC_MAPPINGS[itemType] || {};
    }
    
    static applyTemplate(documentType, itemType = null, customMappings = {}) {
        /**
         * 应用映射模板
         * @param {string} documentType - 文档类型 (Item, Actor, etc.)
         * @param {string} itemType - 物品类型 (仅对 Item 文档类型有效)
         * @param {Object} customMappings - 自定义映射
         * @returns {Object} 完整映射配置
         */
        let baseTemplate = this.loadStandardTemplates()[documentType] || {};
        
        // 对于 Item 类型，合并特定物品类型的映射
        if (documentType === 'Item' && itemType) {
            const typeSpecific = this.getItemTypeSpecificMapping(itemType);
            baseTemplate = foundry.utils.mergeObject(baseTemplate, typeSpecific);
        }
        
        // 合并自定义映射
        return foundry.utils.mergeObject(baseTemplate, customMappings);
    }
    
    static validateTemplate(template) {
        /**
         * 验证模板有效性
         * @param {Object} template - 模板对象
         * @returns {ValidationResult} 验证结果
         */
        const result = new ValidationResult();
        
        // 验证必需字段
        const requiredFields = ['description'];
        for (const field of requiredFields) {
            if (!template[field]) {
                result.addIssue('warning', 'missing_field', 
                    `Missing recommended field: ${field}`, field);
            }
        }
        
        // 验证映射语法
        for (const [key, value] of Object.entries(template)) {
            if (typeof value === 'string') {
                // 简单字段映射验证
                if (!value.startsWith('system.') && !value.startsWith('prototypeToken.')) {
                    result.addIssue('warning', 'invalid_mapping', 
                        `Unusual mapping path for ${key}: ${value}`, key);
                }
            } else if (typeof value === 'object' && value.path) {
                // 复杂映射验证
                if (!value.converter) {
                    result.addIssue('error', 'invalid_mapping', 
                        `Missing converter for complex mapping ${key}`, key);
                }
            }
        }
        
        return result;
    }
    
    static exportTemplate(mapping, documentType, itemType = null) {
        /**
         * 导出映射配置为模板
         * @param {Object} mapping - 映射配置
         * @param {string} documentType - 文档类型
         * @param {string} itemType - 物品类型
         * @returns {Object} 模板对象
         */
        return {
            documentType,
            itemType,
            version: "1.0.0",
            mapping,
            timestamp: new Date().toISOString()
        };
    }
    
    static detectItemType(document) {
        /**
         * 自动检测物品类型
         * @param {Object} document - 文档对象
         * @returns {string} 物品类型
         */
        return document.type || 'gear'; // 默认为 gear
    }
}
```

### 4. Enhanced Abstract Exporter (增强抽象导出器)

改进的抽象导出器基类。

```javascript
export class EnhancedAbstractExporter extends AbstractExporter {
    /**
     * 增强的抽象导出器，支持映射保留和智能过滤
     */
    
    constructor(pack, options, existingFile) {
        super(pack, options, existingFile);
        this.mappingEngine = new MappingPreservationEngine();
        this.contentFilter = new SmartContentFilter(this.getTranslationDatabase());
        this.templateManager = new TemplateManager();
    }
    
    async _processCustomMapping() {
        /**
         * 处理自定义映射，确保完整性
         * 重写父类方法以支持映射保留
         */
        
        // 1. 加载标准模板
        const standardTemplate = this.templateManager.loadStandardTemplates()[this.pack.metadata.type];
        
        // 2. 加载现有映射
        const existingMapping = await this.loadExistingMapping();
        
        // 3. 合并用户自定义映射
        const userMapping = this.options.mapping[this.pack.metadata.type] || {};
        
        // 4. 深度合并所有映射
        this.dataset.mapping = this.mappingEngine.preserveExistingMappings(
            standardTemplate,
            this.mappingEngine.preserveExistingMappings(existingMapping, userMapping)
        );
        
        // 5. 验证映射完整性
        const validation = this.mappingEngine.validateMappingCompleteness(
            this.dataset.mapping,
            this.pack.metadata.type
        );
        
        if (!validation.isValid) {
            this.reportMappingIssues(validation.issues);
        }
    }
    
    async loadExistingMapping() {
        /**
         * 从现有翻译文件加载映射配置
         * @returns {Object} 现有映射配置
         */
    }
    
    async filterEmbeddedContent(document, embeddedItems) {
        /**
         * 过滤嵌入内容，排除已翻译的项目
         * @param {Object} document - 父文档
         * @param {Array} embeddedItems - 嵌入的项目
         * @returns {Array} 过滤后的项目
         */
    }
    
    reportMappingIssues(issues) {
        /**
         * 报告映射问题
         * @param {Array} issues - 问题列表
         */
    }
}
```

### 5. Enhanced Item Exporter (增强 Item 导出器)

```javascript
export class EnhancedItemExporter extends EnhancedAbstractExporter {
    /**
     * 增强的 Item 导出器，支持完整映射保留
     */
    
    static getDocumentData(document, customMapping, datasetMapping) {
        const { name, type, system } = document;
        const documentData = { name };

        // 获取完整的映射模板（包括类型特定的映射）
        const fullMapping = this.templateManager.applyTemplate('Item', type, customMapping);

        // 使用完整映射配置提取所有字段
        const mappingAdded = this.extractFieldsFromMapping(document, fullMapping, [
            'name' // 排除已处理的基础字段
        ]);
        
        Object.assign(documentData, mappingAdded.data);
        Object.assign(datasetMapping, mappingAdded.mapping);

        // 处理 Active Effects
        if (this._hasContent(document.effects)) {
            documentData.effects = this.processActiveEffects(document.effects);
            if (!datasetMapping.effects) {
                datasetMapping.effects = { path: 'effects', converter: 'effects' };
            }
        }

        return documentData;
    }
    
    static extractFieldsFromMapping(document, mapping, excludeFields = []) {
        /**
         * 根据映射配置提取字段
         * @param {Object} document - 文档对象
         * @param {Object} mapping - 映射配置
         * @param {Array} excludeFields - 排除的字段
         * @returns {Object} 提取的数据和映射
         */
        const extractedData = {};
        const appliedMapping = {};
        
        Object.entries(mapping).forEach(([key, value]) => {
            if (excludeFields.includes(key)) return;
            
            if (typeof value === 'string') {
                // 简单字段映射
                const fieldValue = this._getValueFromMapping(document, value);
                if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
                    extractedData[key] = fieldValue;
                    appliedMapping[key] = value;
                }
            } else if (typeof value === 'object' && value.path) {
                // 复杂字段映射（如 converter）
                const fieldValue = this._getValueFromMapping(document, value.path);
                if (fieldValue !== undefined && fieldValue !== null) {
                    // 对于复杂映射，我们需要检查是否有实际内容
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
    
    static processActiveEffects(effects) {
        /**
         * 处理 Active Effects
         * @param {Array} effects - Effects 数组
         * @returns {Object} 处理后的 effects 对象
         */
        const processedEffects = {};
        
        effects.filter(effect => !effect._tombstone).forEach(effect => {
            const { _id, name, description } = effect;
            const effectData = { name };
            
            if (description) {
                effectData.description = description;
            }
            
            // 使用名称作为键，如果重复则使用 ID
            const key = processedEffects[name] && 
                !foundry.utils.objectsEqual(processedEffects[name], effectData) 
                ? _id : name;
            processedEffects[key] = effectData;
        });
        
        return processedEffects;
    }
    
    async _processDataset() {
        const documents = await this.pack.getIndex();

        for (const indexDocument of documents) {
            const document = foundry.utils.duplicate(await this.pack.getDocument(indexDocument._id));
            
            // 获取完整的映射配置
            const fullMapping = this.templateManager.applyTemplate('Item', document.type, this.options.mapping.Item || {});
            
            const documentData = EnhancedItemExporter.getDocumentData(
                document, 
                this.options.mapping.Item || {}, 
                this.dataset.mapping.Item ?? this.dataset.mapping
            );

            // 确保映射配置完整
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

        this._reorderMapping(this.dataset.mapping.Item ?? this.dataset.mapping);
    }
    
    ensureMappingCompleteness(itemType) {
        /**
         * 确保映射配置的完整性
         * @param {string} itemType - 物品类型
         */
        const standardMapping = this.templateManager.applyTemplate('Item', itemType);
        const currentMapping = this.dataset.mapping.Item ?? this.dataset.mapping;
        
        // 合并标准映射到当前映射
        for (const [key, value] of Object.entries(standardMapping)) {
            if (!currentMapping[key]) {
                currentMapping[key] = value;
            }
        }
    }
}
```

### 6. Enhanced Actor Exporter (增强 Actor 导出器)

```javascript
export class EnhancedActorExporter extends EnhancedAbstractExporter {
    /**
     * 增强的 Actor 导出器，支持智能嵌入内容过滤
     */
    
    static async getDocumentData(document, customMapping, datasetMapping = {}) {
        const { name, type, prototypeToken, system } = document;
        const documentData = { name };

        // Token name
        if (name?.toLowerCase() !== prototypeToken?.name?.toLowerCase()) {
            documentData.tokenName = prototypeToken.name;
        }

        // 使用映射配置提取字段
        const mappingAdded = this.extractFieldsFromMapping(document, customMapping.Actor || [], [
            'name', 'tokenName'
        ]);
        
        Object.assign(documentData, mappingAdded.data);
        this.mergeMapping(datasetMapping, mappingAdded.mapping, 'Actor');

        // 智能处理嵌入的 Items
        if (this._hasContent(document.items)) {
            const filteredItems = await this.filterEmbeddedItems(
                document.items,
                customMapping,
                datasetMapping
            );
            
            if (filteredItems.length > 0) {
                documentData.items = {};
                filteredItems.forEach(item => {
                    const itemData = EnhancedItemExporter.getDocumentData(
                        item, 
                        customMapping.Item || {}, 
                        this.getItemMapping(datasetMapping)
                    );
                    const key = documentData.items[item.name] && 
                        !foundry.utils.objectsEqual(documentData.items[item.name], itemData) 
                        ? item._id : item.name;
                    documentData.items[key] = itemData;
                });
            }
        }

        // 处理 Active Effects
        if (this._hasContent(document.effects)) {
            documentData.effects = this.processActiveEffects(document.effects);
        }

        return documentData;
    }
    
    async filterEmbeddedItems(embeddedItems, customMapping, datasetMapping) {
        /**
         * 智能过滤嵌入的 Items
         * @param {Array} embeddedItems - 嵌入的 Items
         * @param {Object} customMapping - 自定义映射
         * @param {Object} datasetMapping - 数据集映射
         * @returns {Array} 过滤后的 Items
         */
        const filteredItems = [];
        
        for (const item of embeddedItems.filter(item => !item._tombstone)) {
            // 检查是否应该包含此 item
            const shouldInclude = await this.shouldIncludeEmbeddedItem(item);
            
            if (shouldInclude) {
                filteredItems.push(item);
            }
        }
        
        return filteredItems;
    }
    
    async shouldIncludeEmbeddedItem(item) {
        /**
         * 判断是否应该包含嵌入的 Item
         * @param {Object} item - Item 对象
         * @returns {boolean} 是否应该包含
         */
        // 如果用户选择包含所有嵌入内容
        if (this.options.includeAllEmbeddedItems) {
            return true;
        }
        
        // 检查 Item 是否已在对应的 compendium 中翻译
        const isTranslated = await this.contentFilter.isItemAlreadyTranslated(
            item, 
            this.getItemCompendiumId(item.type)
        );
        
        if (isTranslated) {
            // 检查内容是否已变更
            const hasChanged = await this.contentFilter.hasContentChanged(
                item, 
                this.getExistingTranslation(item)
            );
            
            return hasChanged;
        }
        
        return true; // 未翻译的 item 应该包含
    }
}
```

## Data Models

### Mapping Configuration (映射配置)

```javascript
// 基于当前 SWADE 系统的标准映射模板结构
const STANDARD_MAPPING_TEMPLATES = {
    Item: {
        // 通用字段 (来自 itemDescription)
        description: "system.description",
        notes: "system.notes",
        source: "system.source",
        
        // 分类字段 (来自 category)
        category: "system.category",
        
        // 动作字段 (来自 actions)
        actions: {
            path: "system.actions",
            converter: "actions"
        },
        
        // 物理物品字段 (来自 physicalItem - 适用于 weapon, armor, gear)
        quantity: "system.quantity",
        weight: "system.weight",
        price: "system.price",
        
        // 武器特定字段 (WeaponData)
        damage: "system.damage",
        range: "system.range",
        rof: "system.rof",
        ap: "system.ap",
        parry: "system.parry",
        minStr: "system.minStr",
        shots: "system.shots",
        ammo: "system.ammo",
        reloadType: "system.reloadType",
        
        // 护甲特定字段 (ArmorData)
        armor: "system.armor",
        toughness: "system.toughness",
        
        // 边缘特定字段 (EdgeData)
        requirements: {
            path: "system.requirements",
            converter: "requirements"
        },
        
        // 法术特定字段 (PowerData)
        rank: "system.rank",
        pp: "system.pp",
        duration: "system.duration",
        trapping: "system.trapping",
        arcane: "system.arcane",
        
        // 阻碍特定字段 (HindranceData)
        severity: "system.severity",
        major: "system.major",
        
        // 效果字段
        effects: {
            path: "effects",
            converter: "effects"
        }
    },
    
    Actor: {
        // 角色详情字段 (基于 SWADE 系统的 actor 结构)
        biography: "system.details.biography.value",
        appearance: "system.details.appearance",
        notes: "system.details.notes.value",
        goals: "system.details.goals.value",
        
        // 分类字段
        category: "system.category",
        
        // 嵌入内容
        items: {
            path: "items",
            converter: "embeddedItems"
        },
        effects: {
            path: "effects",
            converter: "nestedContent"
        }
    }
};

// 按物品类型的特定映射模板
const ITEM_TYPE_SPECIFIC_MAPPINGS = {
    weapon: {
        damage: "system.damage",
        range: "system.range",
        rof: "system.rof",
        ap: "system.ap",
        parry: "system.parry",
        minStr: "system.minStr",
        shots: "system.shots",
        ammo: "system.ammo",
        reloadType: "system.reloadType",
        isHeavyWeapon: "system.isHeavyWeapon"
    },
    armor: {
        minStr: "system.minStr",
        armor: "system.armor",
        toughness: "system.toughness",
        isNaturalArmor: "system.isNaturalArmor",
        isHeavyArmor: "system.isHeavyArmor",
        locations: {
            path: "system.locations",
            converter: "nestedContent"
        }
    },
    edge: {
        requirements: {
            path: "system.requirements",
            converter: "requirements"
        },
        isArcaneBackground: "system.isArcaneBackground"
    },
    hindrance: {
        severity: "system.severity",
        major: "system.major"
    },
    power: {
        rank: "system.rank",
        pp: "system.pp",
        damage: "system.damage",
        range: "system.range",
        duration: "system.duration",
        trapping: "system.trapping",
        arcane: "system.arcane",
        ap: "system.ap",
        innate: "system.innate"
    },
    gear: {
        isAmmo: "system.isAmmo"
    }
};
```

### Export Options (导出选项)

```javascript
class EnhancedOptionsModel extends foundry.abstract.DataModel {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            
            // 映射保留选项
            preserveExistingMappings: new BooleanField({
                initial: true,
                label: "BTFG.Options.PreserveExistingMappings",
            }),
            
            // 智能过滤选项
            enableSmartFiltering: new BooleanField({
                initial: true,
                label: "BTFG.Options.EnableSmartFiltering",
            }),
            
            includeAllEmbeddedItems: new BooleanField({
                initial: false,
                label: "BTFG.Options.IncludeAllEmbeddedItems",
            }),
            
            // 验证选项
            validateMappingCompleteness: new BooleanField({
                initial: true,
                label: "BTFG.Options.ValidateMappingCompleteness",
            }),
            
            // 增量导出选项
            enableIncrementalExport: new BooleanField({
                initial: false,
                label: "BTFG.Options.EnableIncrementalExport",
            })
        };
    }
}
```

### Validation Result (验证结果)

```javascript
class ValidationResult {
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
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Custom Mapping Field Preservation

*For any* export operation with existing custom mapping fields (actions, category, ammo, range, etc.), the Translation Generator SHALL preserve all existing custom mapping fields in the output file.

**Validates: Requirements 1.1, 1.2**

### Property 2: Mapping Merge Completeness

*For any* merge operation between existing and new translation files, all mapping fields present in either file SHALL be present in the merged result.

**Validates: Requirements 1.3**

### Property 3: Additive Mapping Behavior

*For any* mapping operation where new fields are discovered, the new fields SHALL be added to the export file without removing any existing fields.

**Validates: Requirements 1.4**

### Property 4: Mapping Validation Accuracy

*For any* mapping configuration, the validation process SHALL correctly identify all missing required fields and invalid mapping syntax.

**Validates: Requirements 1.5, 3.4**

### Property 5: Smart Item Filtering Accuracy

*For any* Actor containing embedded Items, the system SHALL correctly identify which embedded Items are already translated in their corresponding Item compendium.

**Validates: Requirements 2.1**

### Property 6: Translation Status Based Filtering

*For any* embedded Item that is already translated and unchanged, the system SHALL exclude it from export when smart filtering is enabled.

**Validates: Requirements 2.2**

### Property 7: Change Detection Accuracy

*For any* embedded Item whose content has changed since translation, the system SHALL include it in the export and mark it for retranslation.

**Validates: Requirements 2.3, 2.4**

### Property 8: Complete Mapping Configuration Generation

*For any* generated zh_Hans translation file, the file SHALL contain complete field mapping configuration including all standard and custom fields.

**Validates: Requirements 3.1**

### Property 9: Nested Structure Preservation

*For any* mapping configuration containing nested fields, the system SHALL correctly preserve all levels of nesting in the output.

**Validates: Requirements 3.2**

### Property 10: Conditional Mapping Logic Preservation

*For any* mapping configuration containing conditional logic (converters, path specifications), all conditional logic SHALL be preserved exactly in the output.

**Validates: Requirements 3.3**

### Property 11: Cross-Exporter Mapping Consistency

*For any* document type processed by different exporters, the mapping field preservation behavior SHALL be consistent across all exporter types.

**Validates: Requirements 4.1**

### Property 12: Deep Merge Strategy Completeness

*For any* merge operation between existing and new translation data, the deep merge strategy SHALL preserve all nested data structures and values from both sources.

**Validates: Requirements 4.3**

### Property 13: Mapping Conflict Resolution

*For any* mapping configuration with conflicting field definitions, the system SHALL apply a consistent conflict resolution strategy and report the conflicts to the user.

**Validates: Requirements 4.4**

### Property 14: User Preference Persistence

*For any* user configuration of export options, the settings SHALL be saved and restored correctly across sessions.

**Validates: Requirements 5.3**

### Property 15: Error Reporting Completeness

*For any* error condition during export, the system SHALL provide detailed error information including the specific issue, location, and suggested resolution.

**Validates: Requirements 5.4, 8.4**

### Property 16: Template Application Accuracy

*For any* document type being exported, the system SHALL apply the correct mapping template corresponding to that document type.

**Validates: Requirements 6.2**

### Property 17: Template Version Management

*For any* mapping template update, the system SHALL correctly handle version differences and provide migration support when needed.

**Validates: Requirements 6.3**

### Property 18: Template Customization Support

*For any* user-defined custom mapping, the system SHALL correctly extend or override the standard template while preserving template integrity.

**Validates: Requirements 6.4**

### Property 19: Template Validation Completeness

*For any* mapping template, the validation process SHALL verify all required fields are present and all field definitions are syntactically correct.

**Validates: Requirements 6.5**

### Property 20: Incremental Export Timestamp Accuracy

*For any* incremental export operation, the system SHALL correctly compare timestamps between source data and existing translation files to determine what needs updating.

**Validates: Requirements 7.1**

### Property 21: Unchanged Content Skip Behavior

*For any* source data that has not changed since the last export, the system SHALL skip processing that content during incremental export.

**Validates: Requirements 7.2**

### Property 22: Changed Content Marking Accuracy

*For any* source data that has changed since the last translation, the system SHALL mark the corresponding translation entry as needing review.

**Validates: Requirements 7.3**

### Property 23: New Entry Inclusion Behavior

*For any* newly added entries in the source data, the system SHALL include them in the export output.

**Validates: Requirements 7.4**

### Property 24: Export Report Accuracy

*For any* export operation, the generated report SHALL accurately reflect the number of processed, skipped, added, and modified entries.

**Validates: Requirements 7.5**

### Property 25: JSON Syntax Validation

*For any* generated translation file, the JSON syntax SHALL be valid and parseable.

**Validates: Requirements 8.1**

### Property 26: Missing Field Detection

*For any* mapping configuration with missing required fields, the system SHALL detect and report all missing fields with specific field names and suggested fixes.

**Validates: Requirements 8.2**

### Property 27: Data Consistency Validation

*For any* data inconsistency in the export process, the system SHALL generate appropriate warnings with specific details about the inconsistency.

**Validates: Requirements 8.3**

### Property 28: Export Recovery Support

*For any* failed export operation, the system SHALL support rollback to the previous state and allow retry of the operation.

**Validates: Requirements 8.5**

### Property 29: Backward Compatibility Preservation

*For any* existing translation file from a previous version, the system SHALL process it without breaking existing functionality.

**Validates: Requirements 10.1**

### Property 30: Version Migration Accuracy

*For any* upgrade from an older version, the system SHALL correctly migrate old format mapping configurations to the new format.

**Validates: Requirements 10.2**

### Property 31: Compatibility Detection and Migration

*For any* version incompatibility detected, the system SHALL provide appropriate migration tools and clear guidance for resolution.

**Validates: Requirements 10.3**

### Property 32: Multi-Format Support

*For any* supported translation file format, the system SHALL correctly import and export files in that format while preserving all data integrity.

**Validates: Requirements 10.4**

### Property 33: Configuration Validation Tool Accuracy

*For any* configuration provided to the validation tool, it SHALL correctly identify compatibility issues and provide specific guidance for resolution.

**Validates: Requirements 10.5**

## Error Handling

### Mapping Preservation Errors

```javascript
class MappingPreservationError extends Error {
    constructor(operation, details, suggestions = []) {
        super(`Mapping preservation failed during ${operation}: ${details}`);
        this.name = 'MappingPreservationError';
        this.operation = operation;
        this.details = details;
        this.suggestions = suggestions;
    }
}
```

### Content Filtering Errors

```javascript
class ContentFilteringError extends Error {
    constructor(itemId, reason, context = {}) {
        super(`Content filtering failed for item ${itemId}: ${reason}`);
        this.name = 'ContentFilteringError';
        this.itemId = itemId;
        this.reason = reason;
        this.context = context;
    }
}
```

### Template Management Errors

```javascript
class TemplateError extends Error {
    constructor(templateType, operation, details) {
        super(`Template ${operation} failed for ${templateType}: ${details}`);
        this.name = 'TemplateError';
        this.templateType = templateType;
        this.operation = operation;
        this.details = details;
    }
}
```

## Testing Strategy

### Unit Tests

单元测试覆盖各个组件的核心功能：

1. **Mapping Preservation Engine Tests**
   - 测试映射字段保留
   - 测试深度合并逻辑
   - 测试冲突检测和解决
   - 测试映射验证

2. **Smart Content Filter Tests**
   - 测试已翻译内容检测
   - 测试内容变更检测
   - 测试哈希生成和比较
   - 测试过滤逻辑

3. **Template Manager Tests**
   - 测试模板加载和应用
   - 测试模板验证
   - 测试自定义模板支持

4. **Enhanced Exporter Tests**
   - 测试增强的导出逻辑
   - 测试映射配置处理
   - 测试错误处理和恢复

### Property-Based Tests

使用 JavaScript 属性测试框架（如 fast-check）进行属性测试：

```javascript
import fc from 'fast-check';

// Property 1: Custom Mapping Field Preservation
fc.assert(fc.property(
    fc.record({
        actions: fc.string(),
        category: fc.string(),
        ammo: fc.string(),
        range: fc.string()
    }),
    (existingMapping) => {
        const result = MappingPreservationEngine.preserveExistingMappings(
            existingMapping, 
            {}
        );
        
        // All existing fields should be preserved
        return Object.keys(existingMapping).every(key => 
            result.hasOwnProperty(key) && result[key] === existingMapping[key]
        );
    }
));

// Property 5: Smart Item Filtering Accuracy
fc.assert(fc.property(
    fc.array(fc.record({
        _id: fc.string(),
        name: fc.string(),
        type: fc.string(),
        system: fc.object()
    })),
    async (embeddedItems) => {
        const filter = new SmartContentFilter(mockTranslationDatabase);
        const result = await filter.filterEmbeddedItems(embeddedItems, {});
        
        // Filtered items should be a subset of original items
        return result.every(item => 
            embeddedItems.some(original => original._id === item._id)
        );
    }
));
```

### Integration Tests

集成测试验证组件间的协作：

1. **端到端导出测试**
   - 完整的导出流程测试
   - 映射保留和内容过滤的集成测试

2. **UI 集成测试**
   - 用户界面选项和导出行为的集成
   - 错误处理和用户反馈的集成

3. **向后兼容性测试**
   - 与现有翻译文件的兼容性测试
   - 版本迁移的集成测试

### Test Configuration

- 属性测试最少运行 100 次迭代
- 使用 Jest 作为测试框架
- 使用 fast-check 进行属性测试
- 测试覆盖率目标: 85%
- 每个属性测试必须引用其设计文档属性
- 标签格式: **Feature: generator-mapping-preservation, Property {number}: {property_text}**