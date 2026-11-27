---
title: MySQL 如何分析 SQL 语句的执行计划 ?
volume: mysql
chapter: SQL Optimization
order: 1
updatedAt: 2026-11-26
---

我主要使用 `Explain` 来分析执行计划, 在拿到的结果中, 我会主要观察以下几个字段来评估 SQL:

## 1. Type

这是最关键的字段, 我会确保它不是 `ALL (全表扫描)`.

一般来说, 我会优化 SQL 至少达到 `range (范围查询)` 或 `ref (普通索引)`.

## 2. key , key_len

首先我会根据 `key` 字段判断走没走索引, 如果为 `NULL` 检查是否违反了最左前缀法则或触发了隐式类型转换.

对于联合索引, 我会根据 `key_len` 判断索引到底命中了几列, 是否充分利用了索引.

## 3. extra

我会特别关注是否出现了 `Using FileSort` 和 `Using Temporary`.

这意味着涉及了无法利用索引的排序或临时表, 通常会产生大量性能开销, 需要做 SQL 优化来避免.

如果出现了 `Using Index`, 说明使用了覆盖索引, 这是性能较好的体现.

## Type 介绍

| Type     | 含义（底层做了什么）                                       | 典型 SQL 示例 | 性能评级 |
|----------|--------------------------------------------------| --- | --- |
| `system` | 表里只有 1 行数据（`const` 的特例，InnoDB 中很少见，多见于系统表）       | 查询只有 1 行的系统表 | 极快 |
| `const`  | 用主键或唯一索引和常量做等值匹配，最多命中 1 行                        | `SELECT * FROM user WHERE id = 18;` | 极快 |
| `eq_ref` | 多表 `JOIN` 中最理想的状态：被驱动表用主键或非空唯一索引关联，驱动表每行最多匹配 1 行 | `SELECT * FROM orders o JOIN user u ON o.user_id = u.id;` | 极快 |
| `ref`    | 用普通非唯一索引（或联合索引左前缀）做等值匹配，可能命中多行                   | `SELECT * FROM user WHERE age = 25;` | 很快 |
| `range`  | 走索引扫描一个有限的范围区间                                   | `SELECT * FROM user WHERE id BETWEEN 10 AND 100;` | 良好（看范围大小） |
| `index`  | 全索引扫描：把整棵索引树从头扫到尾                                | `SELECT id, age FROM user;` | 较差 |
| `ALL`    | 全表扫描：把整棵主键索引的叶子节点从头扫到尾                           | `SELECT * FROM user WHERE name = '张三';` | 最差 |