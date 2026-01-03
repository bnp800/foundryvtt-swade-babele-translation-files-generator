# Design Document

## Overview

本设计文档描述了将现有 D&D 5e Babele 翻译文件生成器改造为 SWADE 系统版本的技术方案。改造主要涉及以下方面：

1. **模块标识重命名** - 将所有 `dnd5e` 相关标识更改为 `swade`
2. **导出器重构** - 移除 D&D 5e 特有字段处理，添加 SWADE 特有字段支持
3. **字段映射更新** - 根据 SWADE 数据模型调整 Babele 映射配置
4. **本地化扩展** - 添加简体中文界面支持

## Architecture

系统采用现有的模块化架构，主要组件包括：

```
┌─────────────────────────────────────────────────────────────┐
│                    CompendiumExporterApp                     │
│                    (UI Application Layer)                    │
├─────────────────────────────────────────────────────────────┤
│                    ExporterInstanciator                      │
│                    (Factory Pattern)                         │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│  Actor   │   Item   │  Scene   │ Journal  │    Other       │
│ Exporter │ Exporter │ Exporter │ Exporter │   Exporters    │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│                    AbstractExporter                          │
│                    (Base Class)                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Module Configuration (module.json)

更新模块配置以支持 SWADE 系统：

```json
{
  "id": "swade-babele-translation-files-generator",
  "title": "SWADE - Translation files generator for Babele",
  "relationships": {
    "systems": [{
      "id": "swade",
      "type": "system",
      "compatibility": {
        "minimum": "5.0.0",
        "verified": "5.1.0"
      }
    }]
  }
}
```

### 2. ItemExporter (SWADE 版本)

重构 `ItemExporter` 类以处理 SWADE Item 类型：

```javascript
// scripts/exporters/item-exporter.mjs
export class ItemExporter extends AbstractExporter {
  static getDocumentData(document, customMapping, datasetMapping) {
    const { name, type, system } = document;
    const documentData = { name };

    // SWADE 通用字段
    if (system?.description) {
      documentData.description = system.description;
    }

    // Edge 特有字段
    if (type === "edge" && system?.requirements) {
      // requirements 是对象结构，需要特殊处理
    }

    // Power 特有字段
    if (type === "power" && system?.trapping) {
      documentData.trapping = system.trapping;
    }

    // Weapon/Gear 特有字段
    if (system?.notes) {
      documentData.notes = system.notes;
    }

    // 处理自定义映射
    const mappingAdded = this._addCustomMapping(customMapping, document, documentData);
    datasetMapping = foundry.utils.mergeObject(datasetMapping, mappingAdded);

    // 处理 Active Effects
    if (this._hasContent(document.effects)) {
      documentData.effects = {};
      document.effects.forEach(effect => {
        const { _id, name, description } = effect;
        const effectData = { name, ...(description && { description }) };
        const key = documentData.effects[name] ? _id : name;
        documentData.effects[key] = effectData;
      });
    }

    return documentData;
  }

  static addBaseMapping(mapping, document, documentData) {
    // SWADE 基础映射 - 移除 D&D 5e 特有字段
    if (documentData.effects && !mapping.effects) {
      mapping.effects = { path: 'effects', converter: 'effects' };
    }
  }
}
```

### 3. ActorExporter (SWADE 版本)

重构 `ActorExporter` 类以处理 SWADE Actor 类型：

```javascript
// scripts/exporters/actor-exporter.mjs
export class ActorExporter extends AbstractExporter {
  static getDocumentData(document, customMapping, datasetMapping = {}) {
    const { name, type, prototypeToken, system } = document;
    const documentData = { name };

    // Token 名称
    if (name?.toLowerCase() !== prototypeToken?.name?.toLowerCase()) {
      documentData.tokenName = prototypeToken.name;
    }

    // Character/NPC 类型字段
    if (type === "character" || type === "npc") {
      if (system?.details?.biography?.value) {
        documentData.description = system.details.biography.value;
      }
      if (system?.details?.appearance) {
        documentData.appearance = system.details.appearance;
      }
      if (system?.details?.notes) {
        documentData.notes = system.details.notes;
      }
      if (system?.details?.goals) {
        documentData.goals = system.details.goals;
      }
    }

    // Vehicle/Group 类型字段
    if (type === "vehicle" || type === "group") {
      if (system?.description) {
        documentData.description = system.description;
      }
    }

    // 处理自定义映射
    const mappingAdded = this._addCustomMapping(customMapping.Actor ?? customMapping, document, documentData);

    // 处理嵌入 Items
    if (this._hasContent(document.items)) {
      documentData.items = {};
      document.items.filter(item => !item._tombstone).forEach(item => {
        const itemDoc = foundry.utils.duplicate(item);
        const itemData = ItemExporter.getDocumentData(itemDoc, customMapping.Item ?? {}, datasetMapping.Item ?? {});
        const key = documentData.items[item.name] ? item._id : item.name;
        documentData.items[key] = itemData;
      });
    }

    // 处理 Active Effects
    if (this._hasContent(document.effects)) {
      documentData.effects = {};
      document.effects.filter(effect => !effect._tombstone).forEach(effect => {
        const { _id, name, description } = effect;
        const effectData = { name, ...(description && { description }) };
        const key = documentData.effects[name] ? _id : name;
        documentData.effects[key] = effectData;
      });
    }

    return documentData;
  }

  static addBaseMapping(mapping, document, documentData) {
    // SWADE Actor 基础映射
    if (documentData.items && !mapping.items) {
      mapping.items = { path: 'items', converter: 'fromPack' };
    }
    if (documentData.effects && !mapping.effects) {
      mapping.effects = { path: 'effects', converter: 'effects' };
    }
  }
}
```

### 4. JournalEntryExporter (SWADE 版本)

更新以支持 SWADE 特有的 headquarters 页面类型：

```javascript
// scripts/exporters/journal-entry-exporter.mjs
export class JournalEntryExporter extends AbstractExporter {
  static getDocumentData(document, customMapping, datasetMapping, srcToInclude) {
    const documentData = { name: document.name };

    const mappingAdded = this._addCustomMapping(customMapping, document, documentData);
    datasetMapping = foundry.utils.mergeObject(datasetMapping, mappingAdded);

    if (this._hasContent(document.pages)) {
      const pageTracker = new Set();

      documentData.pages = Object.fromEntries(
        document.pages.map(page => {
          const { id, name, type, image, text, system } = page;
          const uniqueName = pageTracker.has(name) ? id : name;
          pageTracker.add(name);

          const pageData = { name };

          // 通用字段
          if (image?.caption) pageData.caption = image.caption;
          if (text?.content) pageData.text = text.content;

          // SWADE Headquarters 页面类型
          if (type === "headquarters" && system) {
            if (system.advantage) pageData.advantage = system.advantage;
            if (system.complication) pageData.complication = system.complication;
            if (system.form?.description) pageData.formDescription = system.form.description;
            if (system.form?.acquisition) pageData.formAcquisition = system.form.acquisition;
            if (system.form?.maintenance) pageData.formMaintenance = system.form.maintenance;
            if (system.upgrades) pageData.upgrades = system.upgrades;
          }

          return [uniqueName, pageData];
        })
      );
    }

    return documentData;
  }
}
```

### 5. 文件重命名映射

| 原文件名 | 新文件名 |
|---------|---------|
| `scripts/dnd-babele-translation-files-generator.mjs` | `scripts/swade-babele-translation-files-generator.mjs` |
| `styles/dnd-babele-translation-files-generator.css` | `styles/swade-babele-translation-files-generator.css` |
| 模板路径 `modules/dnd5e-babele-translation-files-generator/` | `modules/swade-babele-translation-files-generator/` |

### 6. 设置键更新

```javascript
// 原设置键
game.settings.get("dnd-btfg", "packs-mappings")

// 新设置键
game.settings.get("swade-btfg", "packs-mappings")
```

## Data Models

### SWADE Item 数据结构

根据 SWADE system.json 中的 `documentTypes.Item`，支持以下类型：

| Item Type | 可翻译字段 |
|-----------|-----------|
| weapon | name, description, notes |
| armor | name, description |
| ancestry | name, description |
| shield | name, description |
| gear | name, description |
| edge | name, description, requirements |
| hindrance | name, description |
| skill | name, description |
| power | name, description, trapping |
| ability | name, description |
| consumable | name, description |
| action | name, description |

### SWADE Actor 数据结构

| Actor Type | 可翻译字段 |
|------------|-----------|
| character | name, tokenName, biography, appearance, notes, goals, items, effects |
| npc | name, tokenName, biography, appearance, notes, goals, items, effects |
| vehicle | name, tokenName, description, items, effects |
| group | name, description |

### Babele 翻译文件格式

```json
{
  "label": "Compendium Label",
  "mapping": {
    "description": "system.description"
  },
  "folders": {
    "Folder Name": "翻译后的文件夹名"
  },
  "entries": {
    "Item Name": {
      "name": "翻译后的名称",
      "description": "<p>翻译后的描述</p>"
    }
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

由于本项目是 FoundryVTT 模块，没有标准的自动化测试框架，且主要涉及 UI 交互和文件导出，以下属性主要用于指导手动测试和代码审查：

**Property 1: Item 导出字段完整性**
*For any* SWADE Item 文档，导出结果 SHALL 包含 `name` 字段；若 `system.description` 存在，导出结果 SHALL 包含 `description` 字段。
**Validates: Requirements 2.1, 2.2**

**Property 2: Item 类型特定字段提取**
*For any* edge 类型 Item 且 `system.requirements` 存在，导出结果 SHALL 包含 requirements 相关内容；*For any* power 类型 Item 且 `system.trapping` 存在，导出结果 SHALL 包含 `trapping` 字段；*For any* weapon 类型 Item 且 `system.notes` 存在，导出结果 SHALL 包含 `notes` 字段。
**Validates: Requirements 2.3, 2.5, 2.6**

**Property 3: Actor 导出字段完整性**
*For any* SWADE Actor 文档，导出结果 SHALL 包含 `name` 字段；若 `prototypeToken.name` 与 `name` 不同，导出结果 SHALL 包含 `tokenName` 字段。
**Validates: Requirements 3.1, 3.2**

**Property 4: Actor 类型特定字段提取**
*For any* character 或 npc 类型 Actor，若相应字段存在，导出结果 SHALL 包含 `description`（来自 biography）、`appearance`、`notes`、`goals` 字段；*For any* vehicle 或 group 类型 Actor，若 `system.description` 存在，导出结果 SHALL 包含 `description` 字段。
**Validates: Requirements 3.3, 3.4, 3.5, 3.6**

**Property 5: 嵌入内容递归导出**
*For any* Actor 包含嵌入 Items，导出结果 SHALL 包含 `items` 对象，其中每个嵌入 Item 的可翻译字段均被正确提取；*For any* Actor 或 Item 包含 Active Effects，导出结果 SHALL 包含 `effects` 对象。
**Validates: Requirements 3.7, 3.8**

**Property 6: JournalEntry 导出完整性**
*For any* JournalEntry 文档，导出结果 SHALL 包含 `name` 字段和 `pages` 对象；*For any* page，导出结果 SHALL 包含 `name` 字段，若 `text.content` 存在则包含 `text` 字段；*For any* headquarters 类型 page，导出结果 SHALL 包含 SWADE 特有字段（advantage、complication、formDescription 等）。
**Validates: Requirements 4.1, 4.2, 4.3**

**Property 7: 翻译合并保留性**
*For any* 现有翻译文件和新导出内容的合并操作，合并后的文件 SHALL 保留现有翻译文件中所有已存在的 entries 值和 folders 值；当新条目与现有条目键相同时，现有翻译内容 SHALL 覆盖新生成的内容。
**Validates: Requirements 6.1, 6.2, 6.3**

**Property 8: 批量导出完整性**
*For any* 选中的 N 个 compendium 进行批量导出，生成的 ZIP 文件 SHALL 包含恰好 N 个 JSON 文件，每个文件名 SHALL 为对应 compendium 的 ID。
**Validates: Requirements 7.1, 7.3, 7.4**

**Property 9: 排序和键选项正确性**
*For any* 启用排序选项的导出，entries 对象的键 SHALL 按字母顺序排列；*For any* 启用 ID 作为键的导出，entries 对象的键 SHALL 为文档 ID 而非 name。
**Validates: Requirements 8.3, 8.4**

**Property 10: D&D 5e 特有字段移除**
*For any* 导出操作，输出的 mapping 配置 SHALL NOT 包含 D&D 5e 特有字段（activities、advancement、movement、senses、travel 等）。
**Validates: Requirements 5.4**

## Error Handling

### 文件读取错误

```javascript
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
  } catch (err) {
    return ui.notifications.error(game.i18n.format('BTFG.Errors.CanNotReadFile', {
      name: this.existingFile.name,
    }));
  }
}
```

### Compendium 访问错误

```javascript
_getPack(packId) {
  packId ??= this.#packId;
  if (!packId) return null;

  const pack = game.packs.get(packId);
  if (!pack) {
    ui.notifications.error(game.i18n.format('BTFG.CompendiumExporter.CompendiumNotFound', { id: packId }));
    return null;
  }

  return pack;
}
```

## Testing Strategy

### 手动测试方案

由于 FoundryVTT 模块没有标准的自动化测试框架，测试将通过以下手动验证进行：

1. **单元功能测试**
   - 在 FoundryVTT 中加载模块
   - 验证 GM 用户可见导出按钮
   - 验证各类型 compendium 导出功能

2. **集成测试**
   - 导出 SWADE 核心 compendium (skills, edges, hindrances, powers)
   - 验证导出文件可被 Babele 正确加载
   - 验证翻译内容正确显示

3. **回归测试**
   - 验证现有翻译文件合并功能
   - 验证批量导出 ZIP 功能
   - 验证自定义映射功能

### 验证检查清单

- [ ] 模块在 SWADE 系统中正确加载
- [ ] 导出按钮仅对 GM 可见
- [ ] Item compendium 导出包含 name 和 description
- [ ] Actor compendium 导出包含嵌入 items
- [ ] JournalEntry 导出包含所有 pages
- [ ] 现有翻译文件正确合并
- [ ] 批量导出生成有效 ZIP
- [ ] 中文界面正确显示
