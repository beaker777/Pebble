---
title: InnoDB 和 MYISAM 的主要区别是什么 ?
volume: mysql
chapter: Storage Engine
order: 1
updatedAt: 2026-11-24
---

`InnoDB` 和 `MYISAM` 的主要区别体现在三个方面: **事务支持**, **并发性能**, **索引结构**.

## 事务支持

- `InnoDB` 支持满足 ACID 特性的事务, 支持 `COMMIT`, `ROLLBACK` 等操作.

- `MYISAM` 不支持事务, 一旦数据库崩溃, 数据容易损坏且很难恢复.

## 并发性能

- `InnoDB` 支持行锁, 适合高并发写入的场景.

- `MYISAM` 只支持表锁, 当有写任务时, 整张表都会被锁住, 并发性能上限很低.

## 索引结构

- `InnoDB` 的索引是聚簇索引, 索引的叶子节点会保存数据行, 减少 IO 次数.

- `MYISAM` 的索引是非聚簇索引, 索引文件和数据文件分开保存, 索引保存的是指向数据文件的指针.