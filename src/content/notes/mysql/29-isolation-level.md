---
title: MySQL 的四种隔离级别是什么, 默认的隔离级别是什么 ?
volume: mysql
chapter: Transaction
order: 2
updatedAt: 2026-11-26
---

MySQL 的隔离级别分为四种, 默认是 **RR**, 具体的四个级别如下:

## Read Uncommitted

允许读取到未提交的内容, 会导致脏读. 性能最快但并发安全最差, 实际开发中几乎不用.

## Read Committed

用户只能读取到已经提交的内容, 解决了脏读, 但会导致不可重复读. 

有时为了追求极致的并发性能会设置为 MySQL 的隔离级别.

## Repeatable Read

在一个事务中多次查询同一条数据读取到的结果是一样的, 解决了不可重复读, 但存在幻读问题. 是 MySQL 的默认隔离级别.

需要注意的是, MySQL 通过 **MVCC** 和 **Next-Key-Lock** 解决了 RR 级别下大部分的幻读问题.

## Serializable

串行化执行事务, 解决了全部的并发问题, 但性能最差. 

除非是极高级别的金融系统, 否则不用.