// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { App } from "../App";

// Drive the real UI in a DOM. Network is stubbed to fail so the app falls back
// to its offline behaviour (FX = 3.7, no live quotes) and we use the manual
// price overrides — exactly the path a user has when APIs are unreachable.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("offline in test"))),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RSU calculator UI", () => {
  it("renders after-tax results from manual inputs", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Turn on the manual price override and enter a price.
    await user.click(screen.getByRole("checkbox", { name: /set stock price/i }));
    const price = screen.getByLabelText("Stock price (USD)");
    await user.clear(price);
    await user.type(price, "200");

    // Results render with gross = price × shares × fallback FX (3.7).
    // 200 × 100 × 3.7 = ₪74,000.00
    await waitFor(() =>
      expect(screen.getByText("₪74,000.00")).toBeInTheDocument(),
    );
    expect(screen.getByText("Average tax deduction")).toBeInTheDocument();
    expect(screen.getByText("Total net")).toBeInTheDocument();
    expect(screen.getByText("Marginal tax")).toBeInTheDocument();
    expect(screen.getByText(/Monthly miluim pay/i)).toBeInTheDocument();
  });
});

describe("ESPP calculator UI", () => {
  it("computes gross investment exactly from the defaults", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "ESPP" }));
    await user.click(screen.getByRole("checkbox", { name: /set stock price/i }));
    const price = screen.getByLabelText("Stock price (USD)");
    await user.clear(price);
    await user.type(price, "80");

    // Gross investment = discounted 42.5 × 100 shares × 3.7 = ₪15,725.00
    await waitFor(() =>
      expect(screen.getByText("₪15,725.00")).toBeInTheDocument(),
    );
    expect(screen.getByText("Gross investment")).toBeInTheDocument();
    expect(screen.getByText("Capital tax")).toBeInTheDocument();
    expect(screen.getByText(/Net gain|Net loss/)).toBeInTheDocument();
  });

  it("switches result rows when the trustee toggle is off", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "ESPP" }));
    await user.click(screen.getByRole("checkbox", { name: /set stock price/i }));
    const price = screen.getByLabelText("Stock price (USD)");
    await user.clear(price);
    await user.type(price, "80");
    await user.click(screen.getByRole("checkbox", { name: /With Trustee/i }));

    await waitFor(() =>
      expect(screen.getByText(/Tax on discount/i)).toBeInTheDocument(),
    );
  });
});
