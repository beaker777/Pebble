---
title: MySQL 中 Buffer Pool 的作用是什么 ?
volume: mysql
chapter: Log
order: 4
updatedAt: 2026-11-26
---

Buffer Pool 作为一块内存区域是 MySQL 性能优化的关键, 通过内存缓存来减少磁盘 IO 次数.

## 缓存读取

在查询数据时, MySQL 会先尝试从 Buffer Pool 中获取, 如果缓存中没有再去磁盘读取后缓存到 Buffer Pool.

它不仅缓存数据页, 还会缓存索引页和 Undo Log 等.

## 缓冲写入

在修改数据时, MySQL 只修改缓存中的数据, 并将其标记为 "脏页", 通过后台线程将其异步刷入磁盘.

不仅合并了大量的磁盘 IO, 还避免了随机 IO 导致的性能开销.

## 缓存淘汰

Buffer Pool 的缓存空间是有上限的, 我们基于优化后的 LRU 算法淘汰缓存:

将缓冲区分为 new 和 old 两部分, 新数据只放在 old 区的头部, 只有满足一定条件 (如再次访问且停留一定时间) 才放入 new 区.

这种做法主要是为了避免大量扫描导致真正的热点数据被挤出缓冲区.