import { describe, expect, it } from "vitest";
import {
  looksLikeQqTargetId,
  normalizeQqAllowEntry,
  normalizeQqMessagingTarget,
  parseQqOutboundTarget,
} from "./normalize.js";

describe("normalizeQqAllowEntry", () => {
  it("strips channel and target prefixes while preserving case", () => {
    expect(normalizeQqAllowEntry("qq:user:OpenId_ABC")).toBe("OpenId_ABC");
    expect(normalizeQqAllowEntry("onebot:group:Group_98765")).toBe("Group_98765");
    expect(normalizeQqAllowEntry("  private:User_123456  ")).toBe("User_123456");
    expect(normalizeQqAllowEntry("*")).toBe("*");
  });
});

describe("normalizeQqMessagingTarget", () => {
  it("normalizes official target variants", () => {
    expect(normalizeQqMessagingTarget("qq:group:group_OPENID_123")).toBe("group:group_OPENID_123");
    expect(normalizeQqMessagingTarget("onebot:user:userOpenid_67890")).toBe(
      "user:userOpenid_67890",
    );
    expect(normalizeQqMessagingTarget("  userOpenid_24680  ")).toBe("userOpenid_24680");
  });
});

describe("parseQqOutboundTarget", () => {
  it("defaults openid targets to private chat", () => {
    expect(parseQqOutboundTarget("openid_12345")).toEqual({ kind: "private", id: "openid_12345" });
  });

  it("parses group target format with official group openid", () => {
    expect(parseQqOutboundTarget("group:groupOpenid_67890")).toEqual({
      kind: "group",
      id: "groupOpenid_67890",
    });
  });

  it("rejects invalid target ids", () => {
    expect(parseQqOutboundTarget("group:bad id")).toEqual({
      kind: null,
      error: "unsupported group target id: bad id",
    });
    expect(parseQqOutboundTarget("user:")).toEqual({
      kind: null,
      error: "unsupported user target id: <empty>",
    });
  });
});

describe("looksLikeQqTargetId", () => {
  it("supports official user and group ids", () => {
    expect(looksLikeQqTargetId("user:openid_abc")).toBe(true);
    expect(looksLikeQqTargetId("group:grp_abc")).toBe(true);
    expect(looksLikeQqTargetId("bad id with spaces")).toBe(false);
  });
});
