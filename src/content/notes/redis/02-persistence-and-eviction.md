---
title: Redis 持久化机制（RDB / AOF）与内存淘汰策略
subtitle: 为什么生产环境推荐开启混合持久化？fork 阻塞怎么排查？
volume: redis
order: 2
frequency: 高频必问
readTime: 5 min
summary: RDB 是紧凑的二进制全量快照（恢复极快但可能丢分钟级数据），AOF 追加写命令日志（everysec 最多丢 1 秒但体积大）；Redis 4.0+ 混合持久化将 RDB 全量头与增量 AOF 融合，兼顾恢复速度与数据安全。
tags: [RDB, AOF, 内存淘汰]
updatedAt: 2026-11-24
---

## RDB vs AOF 核心对比

| 维度 | RDB（快照） | AOF（追加日志） |
| :--- | :--- | :--- |
| **生成方式** | `bgsave` 通过 `fork()` 子进程利用 **COW（写时复制）** 生成二进制快照 | 将每条写命令追加至缓冲区，按 `appendfsync` 刷盘 |
| **数据安全性** | 较低，宕机可能丢失最近一次快照后的全部变更 | 高，推荐 `everysec` 策略最多丢失约 1 秒数据 |
| **重启恢复速度** | **极快**（直接加载内存映像） | 较慢（需逐条重放命令） |
| **典型隐患** | 大内存实例 `fork()` 阻塞主线程；写多场景 COW 导致内存翻倍 | 文件膨胀需触发 `bgrewriteaof` 重写 |

## 混合持久化（Redis 4.0+ 生产标配）

开启 `aof-use-rdb-preamble yes` 后，AOF 重写时子进程会先把当前内存以 **RDB 二进制格式**写入新文件前半段，再把重写期间缓冲的新增量命令以 **AOF 文本格式**追加到末尾——既享受秒级重启加载，又保有秒级低丢数。

## 八种内存淘汰策略怎么选？

当内存达到 `maxmemory` 上限时：
- `noeviction`（默认）：不淘汰，新写请求直接报错；
- `allkeys-lru` / `volatile-lru`：按最近最少使用淘汰（全局或仅限带 TTL 的 Key）；
- `allkeys-lfu` / `volatile-lfu`（Redis 4.0+）：按**访问频率**淘汰，比 LRU 更抗偶发扫描抖动，缓存场景优先推荐 `allkeys-lfu`。
