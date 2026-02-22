import {
  BlockStreamingCoalesceSchema,
  MarkdownConfigSchema,
  GroupPolicySchema,
  ToolPolicySchema,
  requireOpenAllowFrom,
} from "openclaw/plugin-sdk";
import { z } from "zod";

const allowFromEntry = z.union([z.string(), z.number()]);

const qqGroupSchema = z
  .object({
    allow: z.boolean().optional(),
    enabled: z.boolean().optional(),
    requireMention: z.boolean().optional(),
    allowFrom: z.array(allowFromEntry).optional(),
    tools: ToolPolicySchema,
    systemPrompt: z.string().optional(),
  })
  .strict();

const qqAccountSchemaBase = z
  .object({
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    markdown: MarkdownConfigSchema,
    apiBaseUrl: z.string().optional(),
    appId: z.string().optional(),
    appSecret: z.string().optional(),
    appSecretFile: z.string().optional(),
    webhookPath: z.string().optional(),
    dmPolicy: z.enum(["pairing", "allowlist", "open", "disabled"]).optional(),
    allowFrom: z.array(allowFromEntry).optional(),
    groupPolicy: GroupPolicySchema.optional(),
    groupAllowFrom: z.array(allowFromEntry).optional(),
    groups: z.record(z.string(), qqGroupSchema.optional()).optional(),
    textChunkLimit: z.number().int().positive().optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    mediaMaxMb: z.number().positive().optional(),
    responsePrefix: z.string().optional(),
    blockStreaming: z.boolean().optional(),
    blockStreamingCoalesce: BlockStreamingCoalesceSchema.optional(),
  })
  .strict();

const qqAccountSchema = qqAccountSchemaBase.superRefine((value, ctx) => {
  requireOpenAllowFrom({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.qq.dmPolicy="open" requires channels.qq.allowFrom to include "*"',
  });
});

export const QqConfigSchema = qqAccountSchemaBase
  .extend({
    accounts: z.record(z.string(), qqAccountSchema.optional()).optional(),
    defaultAccount: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    requireOpenAllowFrom({
      policy: value.dmPolicy,
      allowFrom: value.allowFrom,
      ctx,
      path: ["allowFrom"],
      message: 'channels.qq.dmPolicy="open" requires channels.qq.allowFrom to include "*"',
    });
  });
