---
title: 主从复制的原理是什么 ?
volume: mysql
chapter: High Availability
order: 1
updatedAt: 2026-11-26
---

主从复制主要分为三步:

## 主库记录与传输

MySQL 的主库会将数据记录到 Binlog, 并在从库连接上后开启一个线程传输 Binlog.

## 从库接收

从库会专门开启一个 IO 线程, 用来接收 Binlog 的内容, 但他不会直接执行, 而是先保存到 Relay Log 中.

从而实现 SQL 与网络传输的解耦.

## 从库重放

从库还会启动一个 SQL 线程, 读取 Relay Log 中的日志事件, 将其解析并重放到数据库中, 从而实现主从数据库的一致性.