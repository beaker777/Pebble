---
title: AQS 抽象队列同步器与 ReentrantLock 底层原理
subtitle: state 状态位、CLH 双向等待队列，以及公平锁与非公平锁的源码差异
volume: juc
chapter: 同步器与锁机制
order: 1
frequency: 高频必问
readTime: 5 min
tags: [AQS, ReentrantLock, CAS]
updatedAt: 2026-11-24
---

## AQS 的核心数据结构

`AbstractQueuedSynchronizer` 是整个 JUC 锁与同步器的基石（`ReentrantLock`、`Semaphore`、`CountDownLatch`、`ReentrantReadWriteLock` 均基于它构建）：

- **`volatile int state`**：核心同步状态。在 `ReentrantLock` 中 `0` 表示无锁，`> 0` 表示已加锁及当前线程的重入次数；在 `CountDownLatch` 中表示剩余计数。
- **CLH 变体双向队列**：抢锁失败的线程被封装成 `Node` 尾插进同步队列，通过 `LockSupport.park()` 挂起，前驱节点释放锁时调用 `unpark()` 唤醒后继。
- **模板方法模式**：AQS 封装好排队、阻塞与唤醒骨架，子类只需重写 `tryAcquire` / `tryRelease`（独占）或 `tryAcquireShared` / `tryReleaseShared`（共享）。

## 公平锁 vs 非公平锁（仅两行差异）

```java
// FairSync.tryAcquire 多了一步判断：队列中是否已有前驱在排队
if (c == 0) {
    if (!hasQueuedPredecessors() && compareAndSetState(0, acquires)) {
        setExclusiveOwnerThread(current);
        return true;
    }
}
```

> **为什么 `ReentrantLock` 默认使用非公平锁？**
> 刚到达的线程此时正处于运行态，若允许它直接 CAS 抢占刚刚释放的锁，就能省去一次「挂起当前线程 + 唤醒队列头线程」的操作系统上下文切换开销，在高并发下吞吐量显著更高；代价是队列里的线程可能发生短暂饥饿。
