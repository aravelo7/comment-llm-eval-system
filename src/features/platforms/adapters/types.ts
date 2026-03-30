import type {
  AdapterRiskHint,
  PlatformChannel,
  PlatformConnectionField,
  PlatformDisplayField,
  PlatformFieldDefinition,
  PlatformKey,
  PlatformSourceMode,
  UnifiedContentItem,
  ContentType,
} from '../types';

export type PlatformAdapter<TInput = Record<string, unknown>> = {
  platform: PlatformKey;
  displayName: string;
  iconText: string;
  color: string;
  supportedChannels: PlatformChannel[];
  supportedContentTypes: ContentType[];
  supportedSourceModes: PlatformSourceMode[];
  connectionSchema: PlatformConnectionField[];
  metadataFields: PlatformFieldDefinition[];
  riskHints: AdapterRiskHint[];
  normalize: (input: TInput) => UnifiedContentItem;
  createMockItems: () => UnifiedContentItem[];
  getMetadataDisplay: (item: UnifiedContentItem) => PlatformDisplayField[];
};
