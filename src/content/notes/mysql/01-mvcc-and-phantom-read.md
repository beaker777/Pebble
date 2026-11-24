---
title: InnoDB 的 MVCC 原理与幻读治理
subtitle: ReadView、Undo Log 版本链与 Next-Key Lock 如何协同工作？
volume: mysql
order: 1
frequency: 高频必问
readTime: 6 min
summary: MVCC 依托行隐藏字段（trx_id / roll_pointer）、Undo Log 版本链与 ReadView 实现无锁快照读；RC 每条查询重建 ReadView，RR 仅首次快照读生成并复用，再配合临键锁解决当前读下的幻读。
tags: [InnoDB, MVCC, 事务隔离]
updatedAt: 2026-11-24
---

## MVCC 的三块基石

InnoDB 让「读不阻塞写、写不阻塞读」的核心设计由三部分组成：

1. **行隐藏列**：每条聚簇索引记录自带 `DB_TRX_ID`（最近修改它的事务 ID）和 `DB_ROLL_PTR`（指向旧版本的回滚指针）。
2. **Undo Log 版本链**：每次 `UPDATE` 都会把旧行写入 Undo Log，并用 `roll_pointer` 串联成单向历史链表。
3. **ReadView（一致性读视图）**：记录生成视图那一刻的活跃事务集合 `m_ids`、最小活跃事务 `min_trx_id`、下一个待分配事务 `max_trx_id` 和当前事务 `creator_trx_id`。

## 可见性判断规则（四步法）

沿着版本链顺次取出版本的 `trx_id`：
- `trx_id == creator_trx_id`：自己改的，**可见**；
- `trx_id < min_trx_id`：生成视图前早已提交，**可见**；
- `trx_id >= max_trx_id`：生成视图后才开启的事务，**不可见**；
- `min_trx_id <= trx_id < max_trx_id`：若在 `m_ids` 中说明尚未提交（**不可见**），否则已提交（**可见**）。若不可见则顺着 `roll_pointer` 找更老版本。

## RC 与 RR 的本质区别

| 隔离级别 | ReadView 生成时机 | 能否解决不可重复读 |
| :--- | :--- | :--- |
| **读已提交（RC）** | **每一条** `SELECT` 快照读都重新生成一个 ReadView | 不能（每次都能看到最新已提交事务） |
| **可重复读（RR）** | 仅在事务中**第一次**快照读时生成并全程复用 | 能（整个事务看到的都是同一时刻快照） |

> **RR 彻底解决幻读了吗？**
> - **纯快照读**：复用同一个 ReadView，不会读到新插入行；
> - **当前读**（`FOR UPDATE` / `UPDATE` / `DELETE`）：通过 **Next-Key Lock（记录锁 + 间隙锁）** 锁住区间防止插入；
> - **边界特例**：如果事务内先快照读，随后自己执行了针对新插入记录的 `UPDATE`，会导致该行的 `trx_id` 变为当前事务 ID，再次快照读时就会「凭空多出一行」。
