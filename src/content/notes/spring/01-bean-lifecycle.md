---
title: Spring Bean 生命周期与三级缓存解决循环依赖
subtitle: 为什么二级缓存不够？为什么构造器注入无法用三级缓存破解？
volume: spring
chapter: IoC 容器与 Bean 生命周期
order: 1
frequency: 高频必问
readTime: 6 min
tags: [IoC, Bean生命周期, 三级缓存]
updatedAt: 2026-11-24
---

## Bean 核心生命周期主线

1. **实例化（Instantiation）**：通过反射调用构造器在堆中分配对象（此时属性为空）；
2. **属性填充（Populate Properties）**：完成 `@Autowired` / `@Resource` 依赖注入；
3. **Aware 接口回调**：依次回调 `BeanNameAware`、`BeanFactoryAware`、`ApplicationContextAware`；
4. **初始化前增强**：执行 `BeanPostProcessor.postProcessBeforeInitialization`；
5. **初始化方法**：依次触发 `@PostConstruct`、`InitializingBean.afterPropertiesSet()`、自定义 `init-method`；
6. **初始化后增强（AOP 常规入口）**：执行 `BeanPostProcessor.postProcessAfterInitialization`，正常情况下在此生成动态代理对象；
7. **销毁阶段**：容器关闭时触发 `@PreDestroy`、`DisposableBean.destroy()`。

## 三级缓存职责拆解

| 缓存层级 | Map 名称 | 存放内容 |
| :--- | :--- | :--- |
| **一级缓存** | `singletonObjects` | 已经历完整生命周期的**成品单例 Bean** |
| **二级缓存** | `earlySingletonObjects` | 实例化完成但尚未属性填充的**半成品（或已提前生成的代理对象）** |
| **三级缓存** | `singletonFactories` | 生成早期引用的 `ObjectFactory` Lambda 工厂 |

> **为什么需要三级缓存，只有二级不行吗？**
> - 如果没有 AOP，两级缓存确实就能解决循环依赖；
> - 引入 AOP 后，Spring 的设计原则是**在初始化完成后再创建代理**。三级缓存存放的 `ObjectFactory` 相当于一个延迟钩子：**只有真正触发循环依赖时**，才提前调用 `getEarlyBeanReference()` 生成代理并升入二级缓存；若无循环依赖，则依然按标准流程在初始化后创建代理。
> - **构造器循环依赖**无法被三级缓存解决，因为对象连第一步实例化都还没完成，根本来不及暴露进三级缓存（可用 `@Lazy` 打破）。
