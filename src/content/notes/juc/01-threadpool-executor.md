---
title: ThreadPoolExecutor 七大参数与拒绝策略
subtitle: 任务提交流转顺序，以及为什么严禁线上直接使用 Executors 工厂方法？
volume: juc
chapter: 线程池与并发容器
order: 1
frequency: 高频必问
readTime: 4 min
tags: [线程池, 并发编程, 生产实践]
updatedAt: 2026-11-24
---

## 七大核心参数速览

| 参数 | 含义 | 关键注意点 |
| :--- | :--- | :--- |
| `corePoolSize` | 核心线程数 | 默认常驻不回收（除非开启 `allowCoreThreadTimeOut`） |
| `maximumPoolSize` | 最大线程数 | 仅在**队列满后**才会创建非核心线程救急 |
| `keepAliveTime` | 空闲存活时间 | 非核心线程空闲超时后自动销毁 |
| `unit` | 时间单位 | 配合 `keepAliveTime` 使用 |
| `workQueue` | 任务阻塞队列 | 生产必须用**有界队列**（如 `ArrayBlockingQueue`） |
| `threadFactory` | 线程工厂 | 自定义有意义的线程名前缀，便于 `jstack` 定位 |
| `handler` | 拒绝策略 | 队列满且线程达上限时的兜底处理 |

## 任务提交四步流转

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    8,
    16,
    60L,
    TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(256),
    r -> new Thread(r, "order-worker-" + counter.incrementAndGet()),
    new ThreadPoolExecutor.CallerRunsPolicy()
);
```

1. 运行线程 `< corePoolSize` → 直接建核心线程执行；
2. 否则入队 `workQueue.offer(command)`；
3. 队列已满且线程 `< maximumPoolSize` → 创建非核心线程执行；
4. 队列满且已达 `maximumPoolSize` → 触发拒绝策略。

> **为什么禁用 `Executors.newFixedThreadPool` 和 `newCachedThreadPool`？**
> - `FixedThreadPool` 默认无界队列 `LinkedBlockingQueue`（`Integer.MAX_VALUE`），任务堆积极易 OOM；
> - `CachedThreadPool` 最大线程数为 `Integer.MAX_VALUE`，突发流量会狂建线程耗尽 CPU 与内存。
