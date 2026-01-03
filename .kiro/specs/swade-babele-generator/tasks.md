# Implementation Plan: SWADE Babele Translation Files Generator

## Overview

本实现计划将现有的 D&D 5e Babele 翻译文件生成器改造为 SWADE 系统版本。实现采用增量方式，先完成模块标识更新，再重构导出器，最后添加本地化支持。

## Tasks

- [ ] 1. 模块标识和配置更新
  - [ ] 1.1 更新 module.json 配置
    - 将 `id` 从 `dnd5e-babele-translation-files-generator` 改为 `swade-babele-translation-files-generator`
    - 将 `title` 改为 "SWADE - Translation files generator for Babele"
    - 将系统依赖从 `dnd5e` 改为 `swade`
    - 更新 `esmodules` 和 `styles` 路径中的文件名
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.2 重命名核心文件
    - 将 `scripts/dnd-babele-translation-files-generator.mjs` 重命名为 `scripts/swade-babele-translation-files-generator.mjs`
    - 将 `styles/dnd-babele-translation-files-generator.css` 重命名为 `styles/swade-babele-translation-files-generator.css`
    - _Requirements: 1.4_

  - [ ] 1.3 更新模板路径引用
    - 更新 `compendium-exporter-app.mjs` 中的模板路径从 `modules/dnd5e-babele-translation-files-generator/` 改为 `modules/swade-babele-translation-files-generator/`
    - _Requirements: 1.4_

  - [ ] 1.4 更新设置键名称
    - 将入口文件中的设置键从 `dnd-btfg` 改为 `swade-btfg`
    - 更新 `compendium-exporter-app.mjs` 中所有 `dnd-btfg` 引用
    - _Requirements: 1.1_

- [ ] 2. Checkpoint - 验证模块加载
  - 确保模块在 SWADE 系统中正确加载，检查控制台无错误

- [ ] 3. ItemExporter 重构
  - [ ] 3.1 移除 D&D 5e 特有字段处理
    - 移除 `activities` 处理逻辑
    - 移除 `advancement` 处理逻辑
    - 移除 `addBaseMapping` 中的 movement、senses、weight、range、target、capacity 等映射
    - _Requirements: 5.4_

  - [ ] 3.2 实现 SWADE Item 字段提取
    - 更新 `getDocumentData` 方法提取 `system.description` 字段
    - 添加 edge 类型的 `system.requirements` 字段处理
    - 添加 power 类型的 `system.trapping` 字段处理
    - 添加 weapon/gear 类型的 `system.notes` 字段处理
    - 保留 Active Effects 处理逻辑
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [ ] 3.3 更新 ItemExporter 基础映射
    - 简化 `addBaseMapping` 方法，仅保留 effects 映射
    - _Requirements: 5.1_

- [ ] 4. ActorExporter 重构
  - [ ] 4.1 移除 D&D 5e 特有字段处理
    - 移除 alignment 处理逻辑
    - 移除 `addBaseMapping` 中的 movement、senses、travel、communication 等映射
    - 移除 D&D 5e 特有的 conditions 过滤列表
    - _Requirements: 5.4_

  - [ ] 4.2 实现 SWADE Actor 字段提取
    - 更新 `getDocumentData` 方法支持 character/npc 类型的 biography、appearance、notes、goals 字段
    - 添加 vehicle/group 类型的 description 字段处理
    - 保留 tokenName、items、effects 处理逻辑
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 4.3 更新 ActorExporter 基础映射
    - 简化 `addBaseMapping` 方法，仅保留 items 和 effects 映射
    - _Requirements: 5.2_

- [ ] 5. Checkpoint - 验证 Item 和 Actor 导出
  - 测试导出 SWADE skills、edges、hindrances、powers compendium
  - 验证导出文件包含正确的字段

- [ ] 6. JournalEntryExporter 更新
  - [ ] 6.1 移除 D&D 5e 特有字段
    - 移除 `tooltip`、`subclassHeader`、`unlinkedSpells` 等 D&D 5e 特有字段处理
    - _Requirements: 5.4_

  - [ ] 6.2 添加 SWADE headquarters 页面支持
    - 添加 headquarters 页面类型检测
    - 提取 `system.advantage`、`system.complication` 字段
    - 提取 `system.form.description`、`system.form.acquisition`、`system.form.maintenance` 字段
    - 提取 `system.upgrades` 字段
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7. 本地化文件更新
  - [ ] 7.1 更新英文语言文件
    - 更新 `lang/en.json` 中的模块描述文本
    - _Requirements: 9.1_

  - [ ] 7.2 更新法文语言文件
    - 更新 `lang/fr.json` 中的模块描述文本
    - _Requirements: 9.2_

  - [ ] 7.3 创建简体中文语言文件
    - 创建 `lang/zh-Hans.json` 文件
    - 翻译所有界面文本为简体中文
    - 在 `module.json` 中注册中文语言文件
    - _Requirements: 9.3, 9.4_

- [ ] 8. Checkpoint - 验证完整功能
  - 测试单个 compendium 导出功能
  - 测试批量导出 ZIP 功能
  - 测试现有翻译文件合并功能
  - 测试中文界面显示

- [ ] 9. 清理和文档更新
  - [ ] 9.1 更新 README.md
    - 更新项目描述为 SWADE 版本
    - 更新使用说明
    - _Requirements: 1.1_

  - [ ] 9.2 更新 steering 文件
    - 更新 `.kiro/steering/` 中的项目描述文件
    - _Requirements: 1.1_

- [ ] 10. Final Checkpoint - 完整测试
  - 确保所有测试通过，如有问题请询问用户

## Notes

- 本项目没有自动化测试框架，所有测试需要在 FoundryVTT 环境中手动进行
- Checkpoint 任务用于验证阶段性成果，确保增量开发的正确性
- 每个任务引用了对应的需求编号，便于追溯
