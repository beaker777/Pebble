---
title: 什么是索引下推 ?
volume: mysql
chapter: Index
order: 8
updatedAt: 2026-11-26
---

索引下推 (Index Condition Pushdown) 是通过 **减少回表次数** 从而显著提升性能的一种手段.

它的核心思想是: 在存储引擎层根据条件提前进行过滤, 减少返回给 Server 层进行回表的数据.

> 以 SELECT * FROM user WHERE name LIKE '张%' AND age = 11; 为例, 为 (name, age) 建立联合索引.
> 
> 当没有 ICP 时, 只能使用索引找到所有 name 以 "张" 开头的数据, 再去对这些数据全部进行回表. 由 Server 层排除掉 age != 11 的数据.
> 
> 当有 ICP 时, 在根据索引找到所有 name 以 "张" 开头的数据后, 会在存储引擎层直接过滤掉 age != 11 的数据, 大大减少回表的次数.