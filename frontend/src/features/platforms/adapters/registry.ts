import { doubanAdapter } from './doubanAdapter';
import { tiebaAdapter } from './tiebaAdapter';
import { weiboAdapter } from './weiboAdapter';

export const platformAdapters = [weiboAdapter, doubanAdapter, tiebaAdapter];

export const platformAdapterMap = Object.fromEntries(
  platformAdapters.map((adapter) => [adapter.platform, adapter]),
) as Record<(typeof platformAdapters)[number]['platform'], (typeof platformAdapters)[number]>;

export function getPlatformAdapter(platform: keyof typeof platformAdapterMap) {
  return platformAdapterMap[platform];
}
