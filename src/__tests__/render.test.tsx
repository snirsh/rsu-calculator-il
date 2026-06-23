import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { App } from "../App";

// A server-side render is a cheap smoke test: it exercises the full component
// tree (state initializers, the tax engine via useMemo) without a browser, and
// fails if anything throws during render. Effects (network calls) don't run.
describe("App", () => {
  it("renders without throwing", () => {
    const html = renderToString(createElement(App));
    expect(html).toContain("RSU");
    expect(html).toContain("ESPP");
  });
});
