# Implementation Plan: Generator Mapping Preservation and Smart Export

## Overview

本实现计划将设计文档中的组件分解为可执行的编码任务。实现采用 JavaScript ES Modules 作为主要语言，使用 Jest 和 fast-check 进行测试。任务按照依赖关系排序，确保增量开发和持续验证。

## Tasks

- [x] 1. 映射模板系统实现
  - [x] 1.1 创建标准映射模板配置
    - 基于当前 SWADE 系统字段结构创建完整的映射模板
    - 包含所有物品类型的特定字段映射
    - 创建 `scripts/templates/mapping-templates.mjs` 文件
    - _Requirements: 6.1, 6.2_

  - [ ]* 1.2 编写映射模板验证属性测试
    - **Property 16: Template Application Accuracy**
    - **Validates: Requirements 6.2**

  - [x] 1.3 实现 TemplateManager 类
    - 实现模板加载、应用和验证功能
    - 支持物品类型特定的映射合并
    - 创建 `scripts/core/template-manager.mjs` 文件
    - _Requirements: 6.2, 6.4, 6.5_

  - [ ]* 1.4 编写模板管理属性测试
    - **Property 17: Template Version Management**
    - **Property 18: Template Customization Support**
    - **Property 19: Template Validation Completeness**
    - **Validates: Requirements 6.3, 6.4, 6.5**

- [x] 2. 映射保留引擎实现
  - [x] 2.1 实现 MappingPreservationEngine 类
    - 实现深度合并映射配置功能
    - 实现映射冲突检测和解决
    - 创建 `scripts/core/mapping-preservation-engine.mjs` 文件
    - _Requirements: 1.3, 1.4, 4.3, 4.4_

  - [ ]* 2.2 编写映射保留属性测试
    - **Property 1: Custom Mapping Field Preservation**
    - **Property 2: Mapping Merge Completeness**
    - **Property 3: Additive Mapping Behavior**
    - **Property 13: Mapping Conflict Resolution**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.4**

  - [x] 2.3 实现映射验证功能
    - 实现映射完整性验证
    - 实现缺失字段检测和报告
    - _Requirements: 1.5, 8.2_

  - [ ]* 2.4 编写映射验证属性测试
    - **Property 4: Mapping Validation Accuracy**
    - **Property 26: Missing Field Detection**
    - **Validates: Requirements 1.5, 8.2**

- [x] 3. 智能内容过滤器实现
  - [x] 3.1 实现 SmartContentFilter 类
    - 实现已翻译内容检测功能
    - 实现内容变更检测和哈希比较
    - 创建 `scripts/core/smart-content-filter.mjs` 文件
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 3.2 编写智能过滤属性测试
    - **Property 5: Smart Item Filtering Accuracy**
    - **Property 6: Translation Status Based Filtering**
    - **Property 7: Change Detection Accuracy**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 3.3 实现翻译数据库接口
    - 创建翻译状态查询接口
    - 实现内容哈希缓存机制
    - _Requirements: 2.1, 7.1_

  - [ ]* 3.4 编写内容变更检测属性测试
    - **Property 20: Incremental Export Timestamp Accuracy**
    - **Property 21: Unchanged Content Skip Behavior**
    - **Property 22: Changed Content Marking Accuracy**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 4. Checkpoint - 确保核心组件测试通过
  - 确保所有核心组件测试通过，如有问题请询问用户

- [ ] 5. 增强抽象导出器实现
  - [ ] 5.1 创建 EnhancedAbstractExporter 基类
    - 继承现有 AbstractExporter 并增强功能
    - 集成映射保留引擎和智能过滤器
    - 修改 `scripts/exporters/abstract-exporter.mjs` 文件
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 5.2 编写增强导出器属性测试
    - **Property 11: Cross-Exporter Mapping Consistency**
    - **Property 12: Deep Merge Strategy Completeness**
    - **Validates: Requirements 4.1, 4.3**

  - [ ] 5.3 实现现有翻译文件加载功能
    - 从现有翻译文件中提取映射配置
    - 实现向后兼容性处理
    - _Requirements: 10.1, 10.2_

  - [ ]* 5.4 编写向后兼容性属性测试
    - **Property 29: Backward Compatibility Preservation**
    - **Property 30: Version Migration Accuracy**
    - **Validates: Requirements 10.1, 10.2**

- [ ] 6. 增强 Item 导出器实现
  - [ ] 6.1 更新 ItemExporter 类
    - 实现基于完整映射模板的字段提取
    - 支持物品类型特定的映射应用
    - 修改 `scripts/exporters/item-exporter.mjs` 文件
    - _Requirements: 1.1, 3.1, 6.2_

  - [ ]* 6.2 编写完整映射配置属性测试
    - **Property 8: Complete Mapping Configuration Generation**
    - **Property 9: Nested Structure Preservation**
    - **Property 10: Conditional Mapping Logic Preservation**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ] 6.3 实现映射完整性确保功能
    - 确保导出文件包含所有必要的映射字段
    - 实现缺失映射的自动补充
    - _Requirements: 3.1, 8.2_

- [ ] 7. 增强 Actor 导出器实现
  - [ ] 7.1 更新 ActorExporter 类
    - 实现智能嵌入内容过滤
    - 集成 SmartContentFilter 功能
    - 修改 `scripts/exporters/actor-exporter.mjs` 文件
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 4.2_

  - [ ]* 7.2 编写智能过滤集成属性测试
    - **Property 5: Smart Item Filtering Accuracy**
    - **Property 6: Translation Status Based Filtering**
    - **Validates: Requirements 2.1, 2.2**

  - [ ] 7.3 实现嵌入内容过滤选项
    - 提供用户可配置的过滤选项
    - 支持强制包含所有嵌入内容的选项
    - _Requirements: 2.5, 5.3_

- [ ] 8. 用户界面增强
  - [ ] 8.1 更新 CompendiumExporterApp 界面
    - 添加映射保留选项控件
    - 添加智能过滤选项控件
    - 修改 `scripts/app/compendium-exporter-app.mjs` 文件
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 8.2 实现导出预览功能
    - 显示将要导出的内容摘要
    - 显示映射配置预览
    - _Requirements: 5.5_

  - [ ] 8.3 更新用户界面模板
    - 修改 `templates/export.hbs` 模板
    - 添加新的选项控件和预览区域
    - _Requirements: 5.1, 5.2, 5.5_

  - [ ]* 8.4 编写用户偏好持久化属性测试
    - **Property 14: User Preference Persistence**
    - **Validates: Requirements 5.3**

- [ ] 9. 错误处理和验证增强
  - [ ] 9.1 实现增强的错误处理系统
    - 创建专用的错误类型
    - 实现详细的错误报告和建议
    - 创建 `scripts/core/error-handling.mjs` 文件
    - _Requirements: 8.1, 8.3, 8.4_

  - [ ]* 9.2 编写错误处理属性测试
    - **Property 15: Error Reporting Completeness**
    - **Property 25: JSON Syntax Validation**
    - **Property 27: Data Consistency Validation**
    - **Validates: Requirements 5.4, 8.1, 8.3, 8.4**

  - [ ] 9.3 实现导出结果验证
    - 验证生成文件的 JSON 语法
    - 验证映射配置的完整性
    - _Requirements: 8.1, 8.2_

  - [ ]* 9.4 编写验证系统属性测试
    - **Property 25: JSON Syntax Validation**
    - **Property 26: Missing Field Detection**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 10. Checkpoint - 确保所有功能测试通过
  - 确保所有功能测试通过，如有问题请询问用户

- [ ] 11. 增量导出功能实现
  - [ ] 11.1 实现增量导出逻辑
    - 实现时间戳比较功能
    - 实现变更检测和标记
    - 创建 `scripts/core/incremental-export.mjs` 文件
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 11.2 编写增量导出属性测试
    - **Property 20: Incremental Export Timestamp Accuracy**
    - **Property 21: Unchanged Content Skip Behavior**
    - **Property 22: Changed Content Marking Accuracy**
    - **Property 23: New Entry Inclusion Behavior**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

  - [ ] 11.3 实现导出报告生成
    - 生成详细的增量导出报告
    - 显示处理统计信息
    - _Requirements: 7.5_

  - [ ]* 11.4 编写导出报告属性测试
    - **Property 24: Export Report Accuracy**
    - **Validates: Requirements 7.5**

- [ ] 12. 性能优化和恢复机制
  - [ ] 12.1 实现导出过程控制
    - 添加进度显示和预估时间
    - 实现暂停和恢复功能
    - _Requirements: 9.4, 9.5_

  - [ ] 12.2 实现回滚和重试机制
    - 实现导出失败时的回滚功能
    - 实现自动重试机制
    - _Requirements: 8.5_

  - [ ]* 12.3 编写恢复机制属性测试
    - **Property 28: Export Recovery Support**
    - **Validates: Requirements 8.5**

- [ ] 13. 兼容性和迁移工具
  - [ ] 13.1 实现版本兼容性检测
    - 检测旧版本的映射配置格式
    - 提供自动迁移功能
    - 创建 `scripts/core/compatibility.mjs` 文件
    - _Requirements: 10.2, 10.3_

  - [ ]* 13.2 编写兼容性检测属性测试
    - **Property 31: Compatibility Detection and Migration**
    - **Property 32: Multi-Format Support**
    - **Validates: Requirements 10.3, 10.4**

  - [ ] 13.3 实现配置验证工具
    - 提供配置文件验证功能
    - 确保配置兼容性
    - _Requirements: 10.5_

  - [ ]* 13.4 编写配置验证属性测试
    - **Property 33: Configuration Validation Tool Accuracy**
    - **Validates: Requirements 10.5**

- [ ] 14. 集成测试和文档
  - [ ] 14.1 实现端到端集成测试
    - 测试完整的导出流程
    - 验证映射保留和智能过滤的集成
    - 创建 `tests/integration/` 目录和测试文件

  - [ ] 14.2 更新模块文档
    - 更新 README.md 文件
    - 添加新功能的使用说明
    - 创建映射配置指南

  - [ ] 14.3 创建迁移指南
    - 为现有用户提供升级指南
    - 说明新功能的配置方法
    - 创建 `docs/migration-guide.md` 文件

- [ ] 15. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 标记为 `*` 的任务是可选的属性测试任务，可以根据开发进度选择实现
- 每个属性测试都引用了设计文档中的具体属性
- Checkpoint 任务用于确保增量验证
- JavaScript 代码使用 ES Modules 格式
- 测试使用 Jest 和 fast-check 框架
- 所有新功能都保持与现有代码的向后兼容性