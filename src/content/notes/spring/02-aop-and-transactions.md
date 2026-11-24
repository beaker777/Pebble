---
title: Spring AOP 动态代理与 @Transactional 失效场景
subtitle: JDK 动态代理与 CGLIB 的演进，以及线上最容易踩坑的 6 种事务失效
volume: spring
chapter: AOP 与声明式事务
order: 1
frequency: 高频必问
readTime: 5 min
tags: [AOP, 动态代理, 声明式事务]
updatedAt: 2026-11-24
---

## JDK 动态代理 vs CGLIB

| 维度 | JDK 动态代理 | CGLIB 字节码增强 |
| :--- | :--- | :--- |
| **底层机制** | 基于 `java.lang.reflect.Proxy` 实现目标接口 | 基于 ASM 字节码生成目标类的**子类**并重写方法 |
| **限制条件** | 目标类**必须实现接口** | 无法代理 `final` 类或 `final` / `private` 方法 |
| **Spring Boot 默认策略** | 1.x 有接口默认 JDK | **2.x+ 默认 `proxy-target-class=true`（统一走 CGLIB）** |

## `@Transactional` 经典失效场景清单

1. **同类内部自调用（最高频）**：方法 A 直接调用 `this.methodB()`，绕过了代理对象，切面根本不会执行（解法：注入自身代理、拆分 Service 或使用 `AopContext.currentProxy()`）。
2. **方法修饰符非 `public`**：Spring 事务拦截器 `AbstractFallbackTransactionAttributeSource` 默认直接忽略非 `public` 方法。
3. **异常被 `try-catch` 吞掉未重新抛出**：事务切面感知不到异常，会照常提交。
4. **抛出了受检异常（Checked Exception）**：默认仅对 `RuntimeException` 和 `Error` 回滚，生产务必显式写 `@Transactional(rollbackFor = Exception.class)`。
5. **底层存储引擎不支持**：例如 MySQL 表建成了 `MyISAM` 引擎而非 `InnoDB`。
6. **异步新线程执行**：事务上下文绑定在 `ThreadLocal` 中，新开线程无法继承父线程数据库连接与事务状态。

```java
// 生产推荐写法：显式声明 rollbackFor，避免受检异常漏回滚
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderDTO dto) {
    orderMapper.insert(dto);
    inventoryService.deduct(dto.getSkuId(), dto.getQty());
}
```
