---
title: MySQL 为什么需要小表驱动大表 ?
volume: mysql
chapter: SQL Optimization
order: 5
updatedAt: 2026-11-26
---

首先这里说的 "小表" 并不是指总行数更少的表, 而是经过 `WHERE` 条件过滤后, 行数更少的表.

- 有索引 (NLJ: Nested Loop Join): 减少外层循环次数, `N * log(M) << M * log(N)`.

- 无索引老版本 (BNL: Block Nested Loop): 此时性能取决于两种驱动方式的磁盘扫描次数, 小表驱动的磁盘扫描次数远小于大表驱动.

- 无索引新版本 (Hash Join): 新版本会在 join buffer 建立驱动表的 **哈希索引**, 如果选择大表驱动会撑爆缓冲区, 触发磁盘写临时文件.

> 在 BNL 中, 会将驱动表分批装入 join buffer, 每一批 join buffer 都需要对被驱动表进行一次全表扫描.
> 
> 小表驱动需要扫描 100 + 1000000 次, 而大表驱动假如分 100 批装入, 需要扫描 100 次小表.