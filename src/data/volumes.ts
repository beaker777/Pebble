export type VolumeId = 'mysql' | 'redis' | 'juc' | 'spring';

export interface ChapterMeta {
  title: string;
  subtitle?: string;
}

export interface VolumeMeta {
  id: VolumeId;
  number: string;
  title: string;
  subtitle: string;
  authorLine: string;
  description: string;
  coverBg: string;
  coverText: string;
  coverAccent: string;
  spineBg: string;
  spineText: string;
  spineAccent: string;
  stageBg: string;
  stageAccent: string;
  clothName: string;
  edition: string;
  designKey: 'mysql' | 'redis' | 'juc' | 'spring';
  chapters: ChapterMeta[];
}

export const VOLUMES: VolumeMeta[] = [
  {
    id: 'mysql',
    number: '01',
    title: 'MySQL',
    subtitle: 'Storage Engines, B+ Trees & MVCC',
    authorLine: 'InnoDB Internals',
    description: '深入 InnoDB 存储引擎内核：B+ 树索引演进、回表与覆盖索引、MVCC 版本链、Redo/Undo 日志落盘与锁机制剖析。',
    coverBg: '#42473B',
    coverText: '#E4C879',
    coverAccent: '#DFC06C',
    spineBg: '#3D4236',
    spineText: '#E4C879',
    spineAccent: '#DFC06C',
    stageBg: '#1A1E16',
    stageAccent: '#E2C675',
    clothName: 'Olive Buckram Cloth',
    edition: 'First Edition',
    designKey: 'mysql',
    chapters: [
      { title: '索引与查询优化', subtitle: 'B+ 树结构、回表、覆盖索引与执行计划' },
      { title: '事务、锁与 MVCC', subtitle: '隔离级别、版本链、临键锁与日志体系' },
    ],
  },
  {
    id: 'redis',
    number: '02',
    title: 'Redis',
    subtitle: 'In-Memory Data Structures & Caching',
    authorLine: 'Florentine Marbled Edition',
    description: '剖析单线程事件循环、底层跳表与压缩列表、RDB/AOF 持久化权衡，以及穿透、击穿、雪崩与双写一致性实战治理。',
    coverBg: '#6B2421',
    coverText: '#F5EFE2',
    coverAccent: '#D9A75A',
    spineBg: '#5C201E',
    spineText: '#1F1816',
    spineAccent: '#F5EFE2',
    stageBg: '#1D1312',
    stageAccent: '#EDE0C9',
    clothName: 'Ebru Marbled Paper',
    edition: 'First Edition',
    designKey: 'redis',
    chapters: [
      { title: '持久化与内存管理', subtitle: 'RDB/AOF 混合持久化、淘汰策略与底层数据结构' },
      { title: '高并发缓存架构', subtitle: '穿透击穿雪崩治理、双写一致性与分布式锁' },
    ],
  },
  {
    id: 'juc',
    number: '03',
    title: 'JUC',
    subtitle: 'Concurrency, Locks & Executors',
    authorLine: 'Java.Util.Concurrent',
    description: '系统梳理 AQS 同步队列、CAS 与 volatile 内存屏障、ReentrantLock 公平性取舍、ConcurrentHashMap 与线程池工程实践。',
    coverBg: '#ECEAE1',
    coverText: '#141619',
    coverAccent: '#1D4491',
    spineBg: '#E4E1D7',
    spineText: '#141619',
    spineAccent: '#1D4491',
    stageBg: '#13161C',
    stageAccent: '#E5E3DC',
    clothName: 'Uncoated Archival Board',
    edition: 'First Edition',
    designKey: 'juc',
    chapters: [
      { title: '同步器与锁机制', subtitle: 'AQS 队列、CAS 原子操作与 ReentrantLock 源码' },
      { title: '线程池与并发容器', subtitle: 'ThreadPoolExecutor 流转、拒绝策略与并发集合' },
    ],
  },
  {
    id: 'spring',
    number: '04',
    title: 'Spring',
    subtitle: 'IoC Container, AOP & Transactions',
    authorLine: 'Enterprise Architecture',
    description: '拆解 Bean 生命周期与三级缓存循环依赖、JDK/CGLIB 动态代理原理、声明式事务传播机制及 Spring Boot 自动装配内核。',
    coverBg: '#E6DDD0',
    coverText: '#1C2420',
    coverAccent: '#5C7466',
    spineBg: '#DED6C8',
    spineText: '#1C2420',
    spineAccent: '#1C2420',
    stageBg: '#19201E',
    stageAccent: '#EAE0CE',
    clothName: 'Cotton Rag Watercolor',
    edition: 'First Edition',
    designKey: 'spring',
    chapters: [
      { title: 'IoC 容器与 Bean 生命周期', subtitle: '实例化、依赖注入、三级缓存与扩展点' },
      { title: 'AOP 与声明式事务', subtitle: '动态代理机制、传播行为与常见事务失效排查' },
    ],
  },
];

export const VOLUME_MAP: Record<VolumeId, VolumeMeta> = Object.fromEntries(
  VOLUMES.map((v) => [v.id, v])
) as Record<VolumeId, VolumeMeta>;
