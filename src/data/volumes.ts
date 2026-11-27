export type VolumeId = 'mysql' | 'rag';

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
  designKey: 'mysql' | 'rag';
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
    id: 'rag',
    number: '02',
    title: 'RAG',
    subtitle: 'Retrieval, Embeddings & Reranking',
    authorLine: 'Retrieval-Augmented Generation',
    description: '系统梳理文档切分、向量嵌入、稠密与稀疏混合检索、HNSW 近邻索引、重排模型与上下文增强生成等核心架构与工程实践。',
    coverBg: '#192B42',
    coverText: '#EFEBE0',
    coverAccent: '#DDA15E',
    spineBg: '#152438',
    spineText: '#EFEBE0',
    spineAccent: '#DDA15E',
    stageBg: '#0F1622',
    stageAccent: '#E8E2D4',
    clothName: 'Prussian Indigo Linen',
    edition: 'First Edition',
    designKey: 'rag',
    chapters: [],
  },
];

export const VOLUME_MAP: Record<VolumeId, VolumeMeta> = Object.fromEntries(
  VOLUMES.map((v) => [v.id, v])
) as Record<VolumeId, VolumeMeta>;
