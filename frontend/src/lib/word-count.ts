/**
 * 中文字数统计工具
 * 中文字符数 + 英文单词数
 */

/**
 * 统计文本字数（中文字符 + 英文单词）
 * @param text 要统计的文本
 * @returns 字数
 */
export function countWords(text: string): number {
  if (!text) return 0;

  // 匹配中文字符（CJK 统一汉字）
  const chineseChars = text.match(/[一-鿿]/g) || [];

  // 移除中文字符后，统计英文单词
  const textWithoutChinese = text.replace(/[一-鿿]/g, ' ');
  const englishWords = textWithoutChinese
    .split(/\s+/)
    .filter((word) => word.length > 0 && /[a-zA-Z0-9]/.test(word));

  return chineseChars.length + englishWords.length;
}

/**
 * 统计中文字符数（不含标点空格）
 * @param text 要统计的文本
 * @returns 中文字符数
 */
export function countChineseChars(text: string): number {
  if (!text) return 0;
  const chineseChars = text.match(/[一-鿿]/g) || [];
  return chineseChars.length;
}

/**
 * 统计英文单词数
 * @param text 要统计的文本
 * @returns 英文单词数
 */
export function countEnglishWords(text: string): number {
  if (!text) return 0;

  // 移除中文字符后，统计英文单词
  const textWithoutChinese = text.replace(/[一-鿿]/g, ' ');
  const words = textWithoutChinese
    .split(/\s+/)
    .filter((word) => word.length > 0 && /[a-zA-Z0-9]/.test(word));

  return words.length;
}

/**
 * 格式化字数统计显示
 * @param current 当前字数
 * @param target 目标字数（可选）
 * @returns 格式化的字符串
 */
export function formatWordCount(current: number, target?: number): string {
  if (target) {
    return `${current} / ${target} 字`;
  }
  return `${current} 字`;
}
