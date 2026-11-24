import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const VOLUMES = [
  { id: 'mysql', label: '01 · MySQL' },
  { id: 'redis', label: '02 · Redis' },
  { id: 'juc', label: '03 · JUC' },
  { id: 'spring', label: '04 · Spring' },
];

const FREQS = ['高频必问', '常考进阶', '加分亮点'];
const rl = readline.createInterface({ input, output });

try {
  console.log('\n📚 Pebble Press · 新建面试八股笔记\n');
  VOLUMES.forEach((v, i) => console.log(`  [${i + 1}] ${v.label} (${v.id})`));

  const volChoice = (await rl.question('\n请选择所属书籍编号 (默认 1): ')).trim() || '1';
  const vol = VOLUMES[Number(volChoice) - 1] || VOLUMES[0];

  const title = (await rl.question('请输入面试题标题: ')).trim();
  if (!title) {
    console.log('标题不能为空，已取消。');
    process.exit(1);
  }

  const slugInput = (await rl.question('请输入英文文件名 (如: innodb-locks): ')).trim();
  const safeSlug = (slugInput || `note-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const summary =
    (await rl.question('一句话面试速答 (可直接回车稍后填写): ')).trim() ||
    '请在这里用 1~2 句话概括最核心的面试回答要点。';

  console.log('\n  [1] 高频必问   [2] 常考进阶   [3] 加分亮点');
  const freqChoice = (await rl.question('请选择考察频率 (默认 1): ')).trim() || '1';
  const frequency = FREQS[Number(freqChoice) - 1] || FREQS[0];

  const tagsRaw = (await rl.question('标签 (逗号分隔): ')).trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const dir = path.join(process.cwd(), 'src', 'content', 'notes', vol.id);
  fs.mkdirSync(dir, { recursive: true });

  const existing = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const nextOrder = existing.length + 1;
  const prefix = String(nextOrder).padStart(2, '0');
  const fileName = `${prefix}-${safeSlug}.md`;
  const filePath = path.join(dir, fileName);

  const today = new Date().toISOString().slice(0, 10);
  const content = `---
title: ${title}
volume: ${vol.id}
order: ${nextOrder}
frequency: ${frequency}
readTime: 4 min
summary: ${summary}
tags: [${tags.join(', ')}]
updatedAt: ${today}
---

## 核心原理

在这里展开讲解核心机制、底层结构或关键流程。

## 面试官常见追问

1. **追问点一**：简明扼要写出答题思路。
2. **追问点二**：结合线上实践或源码细节补充亮点。
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`\n✅ 已生成新笔记：${path.relative(process.cwd(), filePath)}`);
  console.log(`👉 访问路径：/notes/${vol.id}/${prefix}-${safeSlug}\n`);
} finally {
  rl.close();
}
