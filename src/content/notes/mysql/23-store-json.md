---
title: MySQL 可以存储 Json 吗 ? 对比使用 MongoDB 呢 ?
volume: mysql
chapter: Basic
order: 4
updatedAt: 2026-11-26
---

MySQL 提供了专门的 JSON 数据类型, 但这并不意味着 MySQL 就可以取代 MongoDB.

## MySQL 的 JSON 特性

- MySQL 将 JSON 以优化后的二进制形式存储在表中, 这使得 MySQL 读取 JSON 中特定 key 的速度很快, 无需解析 JSON.

- 想对 JSON 中的字段建立索引需要想将其抽出来, 作为 **虚拟生成列**, 之后对该列建立索引, 这一步相对麻烦.

## MySQL 对比 MongoDB 的区别

- 数据模型
    - MySQL 适合绝大部分数据是结构化的, 只有少量字段需要灵活性的场景.
    - MongoDB 是纯文档型数据库, 适合数据结构完全不可控或变化极快的场景.

- 事务与强一致性
    - 对于核心的支付业务, 需要强一致性和 ACID 的事务时, MySQL 是我们的唯一选择.
    - MongoDB 虽然也支持事务, 但在数据严谨性上完全不如 MySQL.

- 查询与索引性能
    - 对于复杂嵌套或包含数组的 JSON 类型, MongoDB 是原生的, 性能和查询体验远优于 MySQL.
