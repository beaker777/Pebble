import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const VOLUMES = [
  { id: 'mysql', label: '01 · MySQL', chapters: ['Basic', 'Infrastructure', 'Storage Engine'] },
  { id: 'rag', label: '02 · RAG', chapters: [] },
];

const rl = readline.createInterface({ input, output });

function unquote(str) {
  const s = str.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function yamlScalar(str) {
  if (/[:#[\]{},&*?|>!%@`]|^\s|\s$/.test(str)) {
    return JSON.stringify(str);
  }
  return str;
}

function getChapterConfigPath(volId) {
  return path.join(process.cwd(), 'src', 'content', 'notes', volId, '_chapters.yaml');
}

function readChapterConfig(volId) {
  const cfgPath = getChapterConfigPath(volId);
  if (!fs.existsSync(cfgPath)) return [];
  const lines = fs.readFileSync(cfgPath, 'utf-8').split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed === 'chapters:') continue;
    const titleObjMatch = line.match(/^\s*-\s+title:\s*(.+)$/);
    if (titleObjMatch) {
      items.push({ title: unquote(titleObjMatch[1]) });
      continue;
    }
    const subtitleMatch = line.match(/^\s+subtitle:\s*(.+)$/);
    if (subtitleMatch && items.length > 0) {
      items[items.length - 1].subtitle = unquote(subtitleMatch[1]);
      continue;
    }
    const plainMatch = line.match(/^\s*-\s+(.+)$/);
    if (plainMatch) {
      items.push({ title: unquote(plainMatch[1]) });
    }
  }
  return items;
}

function writeChapterConfig(volId, items) {
  const cfgPath = getChapterConfigPath(volId);
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  const lines = [
    '# 章节顺序配置：按从上到下排列即为本书的 CHAPTER 01, 02, 03...',
    '# 支持极简写法（- 章节名）或带副标题写法（title + subtitle）',
    'chapters:',
  ];
  for (const item of items) {
    if (item.subtitle) {
      lines.push(`  - title: ${yamlScalar(item.title)}`);
      lines.push(`    subtitle: ${yamlScalar(item.subtitle)}`);
    } else {
      lines.push(`  - ${yamlScalar(item.title)}`);
    }
  }
  fs.writeFileSync(cfgPath, lines.join('\n') + '\n', 'utf-8');
}

function collectExistingChapters(volId, defaults) {
  const configured = readChapterConfig(volId).map((c) => c.title);
  const ordered = configured.length > 0 ? [...configured] : [...defaults];
  const seen = new Set(ordered);

  const dir = path.join(process.cwd(), 'src', 'content', 'notes', volId);
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(dir, file), 'utf-8');
      const m = text.match(/^chapter:\s*(.+)$/m);
      if (m && m[1]) {
        const ch = unquote(m[1]);
        if (ch && !seen.has(ch)) {
          ordered.push(ch);
          seen.add(ch);
        }
      }
    }
  }
  return ordered;
}

try {
  console.log('\n📚 Pebble Press · 新建面试八股笔记\n');
  VOLUMES.forEach((v, i) => console.log(`  [${i + 1}] ${v.label} (${v.id})`));

  const volChoice = (await rl.question('\n请选择所属书籍编号 (默认 1): ')).trim() || '1';
  const vol = VOLUMES[Number(volChoice) - 1] || VOLUMES[0];

  const chapters = collectExistingChapters(vol.id, vol.chapters);
  console.log(`\n📂 ${vol.label} 现有章节（按当前显示顺序）：`);
  if (chapters.length === 0) {
    console.log('  (当前暂无章节，将创建本书第一章)');
  } else {
    chapters.forEach((c, i) => console.log(`  [${i + 1}] ${c}`));
  }
  console.log('  [0] 新建一个章节');

  const chChoice = (await rl.question(`\n请选择章节编号 (默认 ${chapters.length === 0 ? 0 : 1}): `)).trim() || (chapters.length === 0 ? '0' : '1');
  let chapter = chapters[0] || '核心专题';
  if (chChoice === '0') {
    const customCh = (await rl.question('请输入新章节名称 (如: 日志与主从复制): ')).trim();
    chapter = customCh || '核心专题';
    const customSub = (await rl.question('章节副标题 (可选，直接回车跳过): ')).trim();
    const posInput = (
      await rl.question(`该章节排在第几位？(1 ~ ${chapters.length + 1}，默认排在最后 ${chapters.length + 1}): `)
    ).trim();

    const cfgItems = readChapterConfig(vol.id);
    const baseItems = cfgItems.length > 0 ? cfgItems : chapters.map((t) => ({ title: t }));
    if (!baseItems.some((item) => item.title === chapter)) {
      const posNum = Number(posInput);
      const insertIdx =
        posInput && Number.isFinite(posNum)
          ? Math.max(0, Math.min(baseItems.length, Math.floor(posNum) - 1))
          : baseItems.length;
      baseItems.splice(insertIdx, 0, customSub ? { title: chapter, subtitle: customSub } : { title: chapter });
      writeChapterConfig(vol.id, baseItems);
      console.log(`📌 已将「${chapter}」写入 ${vol.id}/_chapters.yaml（第 ${insertIdx + 1} 位）`);
    }
  } else {
    chapter = chapters[Number(chChoice) - 1] || chapters[0];
  }

  const title = (await rl.question('\n请输入面试题标题: ')).trim();
  if (!title) {
    console.log('标题不能为空，已取消。');
    process.exit(1);
  }

  const slugInput = (await rl.question('请输入英文文件名 (如: innodb-locks): ')).trim();
  const safeSlug = (slugInput || `note-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const tagsRaw = (await rl.question('标签 (逗号分隔，可选): ')).trim();
  const tags = tagsRaw
    ? tagsRaw
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const dir = path.join(process.cwd(), 'src', 'content', 'notes', vol.id);
  fs.mkdirSync(dir, { recursive: true });

  // Compute next order inside the selected chapter + unique numeric file prefix
  const mdFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  let chapterCount = 0;
  for (const f of mdFiles) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
    const m = raw.match(/^chapter:\s*(.+)$/m);
    if (m && unquote(m[1]) === chapter) chapterCount += 1;
  }

  const filePrefix = String(mdFiles.length + 1).padStart(2, '0');
  const nextOrder = chapterCount + 1;
  const fileName = `${filePrefix}-${safeSlug}.md`;
  const filePath = path.join(dir, fileName);

  const today = new Date().toISOString().slice(0, 10);
  const content = `---
title: ${title}
volume: ${vol.id}
chapter: ${chapter}
order: ${nextOrder}
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
  console.log(`📖 归属：${vol.label} → ${chapter} (第 ${nextOrder} 篇)`);
  console.log(`👉 访问路径：/notes/${vol.id}/${filePrefix}-${safeSlug}\n`);
} finally {
  rl.close();
}
