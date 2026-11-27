---
title: MySQL 中 Change Buffer 的作用是什么 ? 它能对哪个索引生效 ? 为什么 ?
volume: mysql
chapter: Log
order: 5
updatedAt: 2026-11-26
---

Change Buffer 是 Buffer Pool 中一块特殊的区域, 它主要用于优化 Delete/Update/Insert 类型的 SQL.

当发生变更时, 会向 Change Buffer 中保存一条变更记录, 后续有查询操作访问到对应的数据页, 再把变更合并到数据页上.

需要注意的是 Change Buffer 只对非唯一索引生效.

原因是唯一索引需要查询数据, 判断是否满足唯一性约束, 而已经查询到数据直接修改即可, 没有保存变更记录的必要.