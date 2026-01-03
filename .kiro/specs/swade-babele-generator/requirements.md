# Requirements Document

## Introduction

本文档定义了将现有的 D&D 5e Babele 翻译文件生成器模块改造为支持 SWADE (Savage Worlds Adventure Edition) 系统的需求。该模块将允许用户从 SWADE compendium packs 中导出 Babele 兼容的 JSON 翻译文件，支持 SWADE 特有的数据结构和字段映射。

## Glossary

- **Generator**: SWADE Babele 翻译文件生成器模块
- **Compendium**: FoundryVTT 中存储游戏内容的数据包
- **Babele**: FoundryVTT 的运行时翻译模块，用于翻译 compendium 内容
- **Mapping**: Babele 用于将翻译字段映射到文档属性的配置
- **Exporter**: 负责从特定文档类型提取可翻译内容的组件
- **SWADE_Item**: SWADE 系统中的物品文档，包括 edge、hindrance、power、skill、weapon、armor、gear 等类型
- **SWADE_Actor**: SWADE 系统中的角色文档，包括 character、npc、vehicle、group 类型
- **Translation_File**: Babele 兼容的 JSON 格式翻译文件

## Requirements

### Requirement 1: 模块标识更新

**User Story:** 作为模块开发者，我希望模块标识从 D&D 5e 更改为 SWADE，以便正确识别模块用途。

#### Acceptance Criteria

1. THE Generator SHALL 将模块 ID 从 `dnd5e-babele-translation-files-generator` 更改为 `swade-babele-translation-files-generator`
2. THE Generator SHALL 将模块标题更新为 "SWADE - Translation files generator for Babele"
3. THE Generator SHALL 将系统依赖从 `dnd5e` 更改为 `swade`
4. THE Generator SHALL 更新所有文件名中的 `dnd` 前缀为 `swade`

### Requirement 2: SWADE Item 类型导出

**User Story:** 作为翻译者，我希望能够导出 SWADE 系统的所有 Item 类型，以便翻译 edges、hindrances、powers、skills 等内容。

#### Acceptance Criteria

1. WHEN 导出 SWADE Item 时，THE Exporter SHALL 提取 `name` 字段作为可翻译内容
2. WHEN 导出 SWADE Item 时，THE Exporter SHALL 提取 `system.description` 字段作为可翻译内容
3. WHEN 导出 edge 类型 Item 时，THE Exporter SHALL 提取 `system.requirements` 字段（如果存在）
4. WHEN 导出 hindrance 类型 Item 时，THE Exporter SHALL 识别 major/minor 级别信息
5. WHEN 导出 power 类型 Item 时，THE Exporter SHALL 提取 `system.trapping` 字段（如果存在）
6. WHEN 导出 weapon 类型 Item 时，THE Exporter SHALL 提取 `system.notes` 字段（如果存在）
7. THE Exporter SHALL 支持以下 SWADE Item 类型：weapon、armor、ancestry、shield、gear、edge、hindrance、skill、power、ability、consumable、action

### Requirement 3: SWADE Actor 类型导出

**User Story:** 作为翻译者，我希望能够导出 SWADE 系统的 Actor 文档，以便翻译 NPC 和角色内容。

#### Acceptance Criteria

1. WHEN 导出 SWADE Actor 时，THE Exporter SHALL 提取 `name` 字段
2. WHEN 导出 SWADE Actor 时，THE Exporter SHALL 提取 `prototypeToken.name` 作为 tokenName（如果与 name 不同）
3. WHEN 导出 character 或 npc 类型 Actor 时，THE Exporter SHALL 提取 `system.details.biography.value` 字段
4. WHEN 导出 character 或 npc 类型 Actor 时，THE Exporter SHALL 提取 `system.details.appearance` 字段（如果存在）
5. WHEN 导出 character 或 npc 类型 Actor 时，THE Exporter SHALL 提取 `system.details.notes` 字段（如果存在）
6. WHEN 导出 vehicle 或 group 类型 Actor 时，THE Exporter SHALL 提取 `system.description` 字段
7. WHEN Actor 包含嵌入 Items 时，THE Exporter SHALL 递归导出所有嵌入 Item 的可翻译内容
8. WHEN Actor 包含 Active Effects 时，THE Exporter SHALL 导出 effect 的 name 和 description

### Requirement 4: JournalEntry 导出

**User Story:** 作为翻译者，我希望能够导出 SWADE 系统文档日志，以便翻译规则说明和背景故事。

#### Acceptance Criteria

1. WHEN 导出 JournalEntry 时，THE Exporter SHALL 提取 `name` 字段
2. WHEN 导出 JournalEntry 时，THE Exporter SHALL 提取所有 pages 的 `name` 和 `text.content` 字段
3. WHEN JournalEntry page 类型为 headquarters 时，THE Exporter SHALL 提取 `system.advantage`、`system.complication`、`system.form.description` 等特殊字段

### Requirement 5: 字段映射配置

**User Story:** 作为翻译者，我希望导出的文件包含正确的 Babele mapping 配置，以便 Babele 能够正确应用翻译。

#### Acceptance Criteria

1. THE Generator SHALL 为 SWADE Item 生成包含 `name` 和 `description` 映射的 mapping 配置
2. THE Generator SHALL 为 SWADE Actor 生成包含 `name`、`tokenName`、`description` 和 `items` 映射的 mapping 配置
3. WHEN 用户定义自定义映射时，THE Generator SHALL 将自定义映射合并到输出文件中
4. THE Generator SHALL 移除 D&D 5e 特有的映射字段（如 activities、advancement、movement、senses 等）

### Requirement 6: 现有翻译合并

**User Story:** 作为翻译者，我希望能够将新导出的内容与现有翻译文件合并，以便保留已完成的翻译工作。

#### Acceptance Criteria

1. WHEN 用户提供现有翻译文件时，THE Generator SHALL 保留现有翻译的 entries 内容
2. WHEN 用户提供现有翻译文件时，THE Generator SHALL 保留现有翻译的 folders 内容
3. WHEN 新条目与现有条目冲突时，THE Generator SHALL 使用现有翻译内容覆盖新生成的内容
4. IF 现有文件格式无效，THEN THE Generator SHALL 显示错误通知并继续使用空白内容

### Requirement 7: 批量导出功能

**User Story:** 作为翻译者，我希望能够一次性导出多个 compendium 为 ZIP 压缩包，以便高效处理大量翻译文件。

#### Acceptance Criteria

1. WHEN 用户选择多个 compendium 时，THE Generator SHALL 将所有导出文件打包为单个 ZIP 文件
2. WHEN 批量导出时，THE Generator SHALL 显示进度指示器
3. THE Generator SHALL 在 ZIP 文件中为每个 compendium 生成独立的 JSON 文件
4. THE Generator SHALL 使用 compendium ID 作为 JSON 文件名

### Requirement 8: 用户界面

**User Story:** 作为用户，我希望有一个直观的界面来选择 compendium 和配置导出选项。

#### Acceptance Criteria

1. THE Generator SHALL 在 Compendium 侧边栏显示导出按钮（仅对 GM 用户可见）
2. WHEN 用户点击导出按钮时，THE Generator SHALL 显示包含 compendium 列表和导出选项的对话框
3. THE Generator SHALL 允许用户选择是否按字母顺序排序导出条目
4. THE Generator SHALL 允许用户选择使用 ID 或 name 作为条目键
5. THE Generator SHALL 允许用户上传现有翻译文件进行合并
6. THE Generator SHALL 允许用户定义自定义字段映射

### Requirement 9: 本地化支持

**User Story:** 作为非英语用户，我希望模块界面支持多语言，以便更好地使用该工具。

#### Acceptance Criteria

1. THE Generator SHALL 提供英文 (en) 界面翻译
2. THE Generator SHALL 提供法文 (fr) 界面翻译
3. THE Generator SHALL 提供简体中文 (zh-Hans) 界面翻译
4. THE Generator SHALL 使用 FoundryVTT 的 i18n 系统进行所有用户可见文本的本地化
