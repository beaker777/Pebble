---
title: 怎么做慢 SQL 分析 ?
volume: mysql
chapter: SQL Optimization
order: 6
updatedAt: 2026-11-26
---

在实际生产环境中, 我会通过三步来分析慢 SQL:

## 定位问题

我会开启 **慢查询日志**, 设置一个合理的阈值 (0.5s 或 1s). 

然后配合 `mysqldumpslow` 工具, 找到那些出现次数很高或平均耗时长的慢 SQL, 作为优先分析对象.

## 分析执行计划

对 SQL 使用 Explain, 主要关注以下几个字段:
    
- type: 对于普通索引优化到 `ref` 级别, 对于范围查询优化到 `range` 级别.

- key: 通过 `key` 字段判断是否使用了索引, 通过 `key_len` 字段判断联合索引使用的字段.

- extra: 我会主要关注是否出现了 `using fileSort` 或 `using temporary` 并着重优化, 如果出现了 `using index` 说明比较理想.

## 资源消耗分析

如果 SQL Explain 没什么问题, 查询速度还是很慢, 我会使用 `show profile` 命令.

找到 SQL 语句的执行时间是花在了 **CPU 计算**, **磁盘 IO** 还是 **锁等待** 上, 找到更隐蔽的性能瓶颈.