---
title: 什么是深分页 ? 怎么优化 ?
volume: mysql
chapter: SQL Optimization
order: 3
updatedAt: 2026-11-26
---

## 深分页问题

深分页问题主要是 MySQL `LIMIT offset, size` 的实现机制导致的.                                        

当数据量非常大时, MySQL 会查询 `offset + limit` 条数据, 然后抛弃前 `offset` 条数据, 只保留最后 `size` 条. 这会导致两个严重问题:

- **大量无用回表**: 如果没有命中覆盖索引, MySQL 会对 `offset + limit` 条数据全部进行回表, 造成巨大的 IO 浪费.

- **资源消耗**: 大量无用数据加载到内存会挤占 Buffer Pool 的空间, 甚至导致 CPU 飙升.

## 分页查询优化方案

- 延迟关联: 先查询出目标分页的主键, 再使用 JOIN 查询出目标分页的完整数据.

```
SELECT * FROM t1 JOIN (SELECT id FROM t1 LIMIT 1000000, 10) t2 ON t1.id = t2.id;
```

- 游标法: 如果业务允许, 可以将上次查询的结果作为条件, 优化分页查询. 它的性能是最好的, 但不支持跳页.

```
SELECT * FROM t WHERE t.id > last_id LIMIT 10;
```

- 业务层妥协: 限制用户查询的最大页数, 或者引入更适合的 Elasticsearch 做查询.

> 由于 InnoDB 中 B+ 树的索引设计, 进行 LIMIT 操作时它会查询一条就回表一次, 直到扫描到足够的数据.