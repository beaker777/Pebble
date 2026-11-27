---
title: 什么是 ACID, MySQL 是分别通过什么机制来实现这四个特性的 ?
volume: mysql
chapter: Transaction
order: 1
updatedAt: 2026-11-26
---

ACID 是 MySQL 事务的四大特性, InnoDB 引擎通过不同的底层机制来实现他们.

## A (Atomicity)

原子性是基于 Undo Log 实现的, Undo Log 中记录数据的历史版本, 事务出现故障时通过执行反向 SQL 恢复数据库.

保证 "要么全做, 要么不做".

## C (Consistency)

这是一个综合性的目标, 他是通过 **原子性**, **持久性**, **隔离性** 共同实现的.

## I (Isolation)

隔离性是通过 **锁** 和 **MVCC** 实现的.

- 对于写写并发, 通过给目标行加行锁实现隔离性.

- 对于读写并发, 通过 MVCC 读取数据的历史快照, 保证隔离性的同时提升并发性能.

## D (Duration)

持久性是通过 Redo Log 实现的, 利用 WAL 技术, 在提交事务后先写入 Redo Log.

即使数据库宕机, 也能通过 Redo Log 恢复数据, 确保事务一旦提交就一定会保存数据库中.