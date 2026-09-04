import type { TranscriptSentence } from '../types/subtitle';
import type { AISettings } from '../types/ai';
import { activeKeyConfig } from '../types/ai';

const SYSTEM_PROMPT = `你是一个顶级的双语字幕与精听跟读翻译专家。
任务：将输入的英文字幕切片翻译为高质量、口语自然、符合中文母语者表达习惯的中文。
规则：
1. 专有名词、技术术语（如 AI、Linux、Agent 等）保持准确并结合语境翻译。
2. 保持句子口语流畅性，严禁生硬字面直译。
3. 必须输出且仅输出与输入 ID 严格对应的 JSON 数组格式，不得包含任何 Markdown 代码块标记（如 \`\`\`json）或多余解释。
格式示例：
[{"id": 1, "zh": "本期播客中..."}, {"id": 2, "zh": "..."}]`;

export async function translateSentenceBatch(
  sentences: { id: number; en: string }[],
  settings: AISettings
): Promise<{ id: number; zh: string }[]> {
  const { apiKey, baseUrl, model } = activeKeyConfig(settings);
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(sentences) },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `DeepSeek API 请求失败 (HTTP ${response.status})`
    );
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content?.trim() || '';

  const cleanJson = rawContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(cleanJson);
}

export async function testConnection(
  settings: AISettings
): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await translateSentenceBatch(
      [{ id: 1, en: 'Hello world.' }],
      settings
    );
    if (result.length > 0 && result[0].zh) {
      return { ok: true, message: `连接成功！示例翻译: ${result[0].zh}` };
    }
    return { ok: false, message: 'API 响应格式异常，请检查配置' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : '连接失败',
    };
  }
}

export interface BatchTranslateOptions {
  signal?: AbortSignal;
}

export async function batchTranslateSentences(
  allSentences: TranscriptSentence[],
  settings: AISettings,
  onProgress: (completed: number, total: number) => void,
  onPartialResult?: (results: Map<number, string>) => void,
  options?: BatchTranslateOptions
): Promise<Map<number, string>> {
  const batchSize = settings.batchSize || 30;
  const concurrency = settings.concurrency || 3;

  const needTranslation = allSentences.filter((s) => !s.zh);
  if (needTranslation.length === 0) return new Map();

  const batches: { id: number; en: string }[][] = [];
  for (let i = 0; i < needTranslation.length; i += batchSize) {
    batches.push(
      needTranslation.slice(i, i + batchSize).map((s) => ({ id: s.id, en: s.en }))
    );
  }

  const resultMap = new Map<number, string>();
  let completedCount = 0;
  let index = 0;

  const worker = async () => {
    while (index < batches.length) {
      if (options?.signal?.aborted) return;

      const currentBatchIndex = index++;
      const currentBatch = batches[currentBatchIndex];

      try {
        const translatedItems = await translateSentenceBatch(
          currentBatch,
          settings
        );
        for (const item of translatedItems) {
          if (item && item.id !== undefined && item.zh) {
            resultMap.set(item.id, item.zh);
          }
        }
        onPartialResult?.(new Map(resultMap));
      } catch (err) {
        if (options?.signal?.aborted) return;
        console.error(`Batch ${currentBatchIndex} translation failed:`, err);
      }

      completedCount += currentBatch.length;
      onProgress(
        Math.min(completedCount, needTranslation.length),
        needTranslation.length
      );
    }
  };

  const pool = Array.from(
    { length: Math.min(concurrency, batches.length) },
    () => worker()
  );
  await Promise.all(pool);

  return resultMap;
}
