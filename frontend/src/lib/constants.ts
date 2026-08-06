/**
 * AI 引擎常量定义
 * 单一数据源：引擎键名、标签、颜色
 */

export const ENGINE_VALUES = [
  'mimo',
  'openai',
  'claude',
  'gemini',
  'deepseek',
  'qianwen',
] as const;

export type EngineValue = (typeof ENGINE_VALUES)[number];

// i18n 标签键 — 使用 t(ENGINE_I18N_KEYS[engineKey])
export const ENGINE_I18N_KEYS: Record<EngineValue, string> = {
  mimo: 'common.engineMimo',
  openai: 'common.engineOpenAI',
  claude: 'common.engineClaude',
  gemini: 'common.engineGemini',
  deepseek: 'common.engineDeepSeek',
  qianwen: 'common.engineQianwen',
};

// 图表颜色 — hex 格式，按引擎键索引
export const ENGINE_COLORS: Record<EngineValue, string> = {
  openai: '#10b981',
  claude: '#8b5cf6',
  gemini: '#f59e0b',
  deepseek: '#3b82f6',
  qianwen: '#ef4444',
  mimo: '#ec4899',
};

// 按规范引擎顺序的颜色数组（用于柱状图）
export const ENGINE_COLOR_LIST: string[] = ENGINE_VALUES.map(
  (v) => ENGINE_COLORS[v]
);

/**
 * 获取带透明度的引擎颜色
 * @param hex 十六进制颜色值
 * @param alpha 透明度（0-1）
 * @returns 边框颜色和背景颜色
 */
export function engineColorWithAlpha(
  hex: string,
  alpha: number = 0.1
): { border: string; bg: string } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { border: hex, bg: `rgba(${r},${g},${b},${alpha})` };
}

/**
 * 获取引擎下拉选项
 * @param t i18n 翻译函数
 * @returns 选项数组
 */
export function getEngineOptions(
  t: (key: string) => string
): { value: EngineValue; label: string }[] {
  return ENGINE_VALUES.map((v) => ({
    value: v,
    label: t(ENGINE_I18N_KEYS[v]),
  }));
}
