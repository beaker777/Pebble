---
title: 如何理解 MVCC ?
volume: mysql
chapter: Transaction
order: 4
updatedAt: 2026-11-26
---

MVCC 的核心目的是实现 **非阻塞的读写并发**, 实现 "读不加锁, 读写不冲突", 底层主要依赖三个机制:

## 隐式字段和版本链

MySql 的每行数据都有隐藏字段, `trx_id` 表示最后修改该行的事务, `row_ptr` 是回滚指针, 指向上个版本.

每次修改事务时, 会将旧版本的数据写入 Undo Log, 通过回滚指针形成版本链. 使得数据库中同时存在该行数据的多个版本.

## ReadView

当进行快照读的时候, 会生成一个 Read View, 保存了 `max_trx_id`, `min_trx_id`, `m_ids`.

分别对应执行事务时系统下一个分配的事务 id, 最小的活跃事务 id, 所有的活跃事务 id 集合.

## 可见性判断规则

事务在读取数据时, 会用当前行的 `trx_id` 和 ReadView 的事务 id 比较. 如果不可读, 会顺着版本链遍历之前的版本.

- 如果 `trx_id` < `min_id`, 说明事务已经提交, 可以读取.

- 如果 `trx_id` >= `max_id`, 说明创建快照时该事务还没创建, 不可读.

- 如果 `trx_id` not in `m_ids` 或 `trx_id` == `creator_trx_id`, 说明事务已提交或者是创建快照的事务, 可读. 否则不可读.

## 关于隔离级别的差异

- RC 级别下, 每次查询都会创建一个新的 ReadView.

- RR 级别下, **只有第一次** 查询会创建 ReadView.