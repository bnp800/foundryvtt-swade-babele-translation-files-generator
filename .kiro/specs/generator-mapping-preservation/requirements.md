# Requirements Document

## Introduction

本文档定义了 foundryvtt-swade-babele-translation-files-generator 模块的改进需求，重点解决当前导出过程中存在的映射丢失和重复导出问题。该模块用于从 SWADE compendium 生成 Babele 兼容的翻译文件，但目前存在以下关键问题：

1. 导出时丢失原有的自定义映射字段（如 actions/category/ammo/range 等）
2. 对于 Actor 类型，导出包含许多已翻译的嵌入 item 条目
3. 生成的 zh_Hans JSON 文件缺少完整的自定义映射配置

核心目标：
1. 保留所有原有映射字段，确保导出文件的完整性
2. 智能过滤已翻译内容，避免重复导出
3. 生成包含完整映射配置的目标翻译文件

## Glossary

- **Mapping**: Babele 字段映射配置，定义哪些字段需要翻译以及如何翻译
- **Custom_Mapping**: 用户自定义的映射字段，如 actions、category、ammo、range 等
- **Embedded_Items**: Actor 中嵌入的 Items，如装备、技能、边缘等
- **Translation_Generator**: foundryvtt-swade-babele-translation-files-generator 模块
- **Source_Compendium**: SWADE 系统中的原始 compendium 数据
- **Target_Translation**: 生成的翻译文件（zh_Hans 目录下的 JSON 文件）
- **Exporter**: 负责特定文档类型导出的类（如 ItemExporter、ActorExporter）
- **MappingModel**: 管理字段映射配置的数据模型

## Requirements

### Requirement 1: 自定义映射字段保留

**User Story:** As a 翻译协调者, I want 导出的翻译文件保留所有原有的自定义映射字段, so that 翻译工作不会因为映射丢失而中断。

#### Acceptance Criteria

1. WHEN 导出 Item 类型的 compendium THEN Translation_Generator SHALL 保留所有现有的 actions、category、ammo、range 等自定义映射字段
2. WHEN 导出 Actor 类型的 compendium THEN Translation_Generator SHALL 保留所有现有的自定义映射字段
3. WHEN 合并现有翻译文件 THEN Translation_Generator SHALL 保留目标文件中已存在的所有映射字段
4. WHEN 发现新的映射字段 THEN Translation_Generator SHALL 将其添加到导出文件而不覆盖现有字段
5. THE Translation_Generator SHALL 在导出前验证映射字段的完整性

### Requirement 2: 智能内容过滤

**User Story:** As a 翻译者, I want 导出时自动过滤已翻译的内容, so that 我只需要处理真正需要翻译的新内容。

#### Acceptance Criteria

1. WHEN 导出 Actor 包含嵌入的 Items THEN Translation_Generator SHALL 检查这些 Items 是否已在对应的 Item compendium 中翻译
2. WHEN 嵌入的 Item 已有翻译 THEN Translation_Generator SHALL 排除该 Item 不进行重复导出
3. WHEN 嵌入的 Item 未翻译或内容已变更 THEN Translation_Generator SHALL 包含该 Item 进行导出
4. WHEN 检测到内容变更 THEN Translation_Generator SHALL 标记该条目需要重新翻译
5. THE Translation_Generator SHALL 提供选项让用户选择是否包含已翻译的嵌入内容

### Requirement 3: 完整映射配置生成

**User Story:** As a 开发者, I want 生成的翻译文件包含完整的映射配置, so that Babele 能正确处理所有可翻译字段。

#### Acceptance Criteria

1. WHEN 生成 zh_Hans 翻译文件 THEN Translation_Generator SHALL 包含完整的字段映射配置
2. WHEN 映射配置包含嵌套字段 THEN Translation_Generator SHALL 正确处理多层嵌套结构
3. WHEN 映射配置包含条件映射 THEN Translation_Generator SHALL 保留所有条件逻辑
4. THE Translation_Generator SHALL 验证生成的映射配置语法正确性
5. THE Translation_Generator SHALL 支持自定义映射模板的导入和应用

### Requirement 4: 导出器架构改进

**User Story:** As a 开发者, I want 改进导出器架构以支持映射保留和智能过滤, so that 系统能够可靠地处理复杂的导出需求。

#### Acceptance Criteria

1. WHEN 处理不同文档类型 THEN 每个 Exporter SHALL 支持自定义映射字段的保留
2. WHEN 处理嵌入内容 THEN Exporter SHALL 提供智能过滤机制
3. WHEN 合并现有翻译 THEN Exporter SHALL 使用深度合并策略保留所有现有数据
4. WHEN 检测映射冲突 THEN Exporter SHALL 提供冲突解决策略
5. THE AbstractExporter SHALL 提供统一的映射处理接口

### Requirement 5: 用户界面增强

**User Story:** As a 翻译协调者, I want 在导出界面中控制映射保留和内容过滤选项, so that 我可以根据需要定制导出行为。

#### Acceptance Criteria

1. WHEN 用户打开导出界面 THEN CompendiumExporterApp SHALL 显示映射保留选项
2. WHEN 用户选择导出 Actor THEN CompendiumExporterApp SHALL 显示嵌入内容过滤选项
3. WHEN 用户配置导出选项 THEN CompendiumExporterApp SHALL 保存用户偏好设置
4. WHEN 导出过程中发现问题 THEN CompendiumExporterApp SHALL 显示详细的错误信息和建议
5. THE CompendiumExporterApp SHALL 提供导出预览功能，显示将要导出的内容摘要

### Requirement 6: 映射模板管理

**User Story:** As a 开发者, I want 管理和维护标准的映射模板, so that 导出的翻译文件具有一致的结构和完整的映射配置。

#### Acceptance Criteria

1. THE Translation_Generator SHALL 提供标准的映射模板文件
2. WHEN 导出新的文档类型 THEN Translation_Generator SHALL 应用对应的映射模板
3. WHEN 映射模板更新 THEN Translation_Generator SHALL 支持模板版本管理
4. WHEN 用户自定义映射 THEN Translation_Generator SHALL 支持模板的扩展和覆盖
5. THE Translation_Generator SHALL 验证映射模板的有效性和完整性

### Requirement 7: 增量导出支持

**User Story:** As a 翻译协调者, I want 支持增量导出以避免重复处理未变更的内容, so that 导出过程更加高效。

#### Acceptance Criteria

1. WHEN 执行增量导出 THEN Translation_Generator SHALL 比较源数据和现有翻译文件的时间戳
2. WHEN 源数据未变更 THEN Translation_Generator SHALL 跳过该条目的导出
3. WHEN 源数据已变更 THEN Translation_Generator SHALL 标记该条目需要重新翻译
4. WHEN 检测到新增条目 THEN Translation_Generator SHALL 将其包含在导出中
5. THE Translation_Generator SHALL 生成增量导出报告，显示处理的条目统计

### Requirement 8: 质量验证和错误处理

**User Story:** As a 翻译协调者, I want 导出过程包含质量验证和错误处理, so that 生成的翻译文件质量可靠。

#### Acceptance Criteria

1. WHEN 导出完成 THEN Translation_Generator SHALL 验证生成文件的 JSON 语法正确性
2. WHEN 检测到映射字段缺失 THEN Translation_Generator SHALL 报告缺失的字段并提供修复建议
3. WHEN 检测到数据不一致 THEN Translation_Generator SHALL 生成警告报告
4. WHEN 导出过程出错 THEN Translation_Generator SHALL 提供详细的错误信息和恢复建议
5. THE Translation_Generator SHALL 支持导出结果的回滚和重试机制

### Requirement 9: 性能优化

**User Story:** As a 用户, I want 导出过程快速高效, so that 我可以及时获得翻译文件进行后续工作。

#### Acceptance Criteria

1. WHEN 处理大型 compendium THEN Translation_Generator SHALL 使用流式处理避免内存溢出
2. WHEN 执行批量导出 THEN Translation_Generator SHALL 支持并行处理多个文件
3. WHEN 检测内容变更 THEN Translation_Generator SHALL 使用高效的哈希比较算法
4. THE Translation_Generator SHALL 显示导出进度和预估完成时间
5. THE Translation_Generator SHALL 支持导出过程的暂停和恢复

### Requirement 10: 兼容性和向后兼容

**User Story:** As a 现有用户, I want 改进后的导出器与现有翻译文件兼容, so that 我的翻译工作不会受到影响。

#### Acceptance Criteria

1. WHEN 处理现有翻译文件 THEN Translation_Generator SHALL 保持向后兼容性
2. WHEN 升级导出器版本 THEN Translation_Generator SHALL 自动迁移旧格式的映射配置
3. WHEN 检测到版本不兼容 THEN Translation_Generator SHALL 提供迁移工具和指南
4. THE Translation_Generator SHALL 支持多种翻译文件格式的导入和导出
5. THE Translation_Generator SHALL 提供配置验证工具确保兼容性