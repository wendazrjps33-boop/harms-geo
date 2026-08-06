/**
 * 合并 CSS 类名工具
 * 过滤 falsy 值并拼接类名
 */
export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
