---
title: Binlog 和 Redo Log 的 区别 ? 有了 Redo Log 为什么还需要 Binlog ?
volume: mysql
chapter: Log
order: 3
updatedAt: 2026-11-26
---

Redo Log 和 Binlog 都是 MySQL 的核心日志, 但他们的功能完全不同.

## 实现层级

- Redo Log 由 InnoDB 实现, 负责做数据库的 **崩溃恢复**.

- Binlog 由 Server 层实现, 是跨存储引擎的, 负责做 **主从复制** 或 **恢复数据到某一时刻**.

## 记录内容不同

- Redo Log 记录的是物理日志, 如 `在第 n 页, 偏移量为 x 的位置写入 y`.

- Binlog 记录的是逻辑日志, 记录的是对哪张表的哪一行做了什么修改.

## 写入方式不同

- Redo Log 是追加写, 空间固定, 写满后会覆盖旧记录.

- Binlog 是附加写, 可以保存全量数据.

## 为什么有了 Redo Log 还需要 Binlog

- 一方面, Redo Log 无法保存历史, 做不到将数据库恢复到过去的某个时间点.

- 另一方面, 主从复制依赖 Binlog, 即使是不同的存储引擎也能同样使用 Binlog 同步数据.