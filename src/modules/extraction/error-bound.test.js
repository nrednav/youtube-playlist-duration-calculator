import assert from "node:assert";
import { describe, it } from "node:test";
import { computeMaxError, computePerVideoError } from "./error-bound.js";

describe("computePerVideoError", () => {
  it("returns 3599 for a MM:SS token parsed as 0:00", () => {
    // max(0, 3599 - 0) = 3599
    assert.strictEqual(computePerVideoError(0, 2), 3599);
  });

  it("returns 3599 for a MM:SS token parsed as 59:59", () => {
    // max(3599, 3599 - 3599) = 3599
    assert.strictEqual(computePerVideoError(3599, 2), 3599);
  });

  it("returns a value smaller than 3599 for a mid-range MM:SS token", () => {
    // max(754, 3599 - 754) = 2845
    // 12:34 parsed as MM:SS
    assert.strictEqual(computePerVideoError(754, 2), 2845);
    assert.ok(2845 < 3599);
  });

  it("returns 86399 for a HH:MM:SS token parsed as 0:00:00", () => {
    // max(0, 86399 - 0) = 86399
    assert.strictEqual(computePerVideoError(0, 3), 86399);
  });

  it("returns a value smaller than 86399 for a mid-range HH:MM:SS token", () => {
    // 1:23:45 = 5025 seconds
    // max(5025, 86399 - 5025) = 81374
    assert.strictEqual(computePerVideoError(5025, 3), 81374);
    assert.ok(81374 < 86399);
  });

  it("returns the parsed value for unknown segment count", () => {
    // With an unknown shape, shapeMax defaults to 0, so the formula
    // degenerates to max(seconds, 0 - seconds) = seconds. This path is
    // unreachable in production (the orchestrator always sets segmentCount
    // for non-null results, and computeMaxError skips null results), but
    // the degenerate bound is still defensible: the true value could be 0.
    assert.strictEqual(computePerVideoError(100, 0), 100);
    assert.strictEqual(computePerVideoError(100, 5), 100);
  });
});

describe("computeMaxError", () => {
  it("returns 0 when all results are verified", () => {
    const results = [
      { seconds: 754, confidence: 1.0, segmentCount: 2 },
      { seconds: 5025, confidence: 1.0, segmentCount: 3 },
    ];
    assert.strictEqual(computeMaxError(results), 0);
  });

  it("returns 0 when all results are unparseable", () => {
    const results = [
      { seconds: null, confidence: 0, segmentCount: 0 },
      { seconds: null, confidence: 0, segmentCount: 0 },
    ];
    assert.strictEqual(computeMaxError(results), 0);
  });

  it("returns the sum of per-video errors for estimated results only", () => {
    const results = [
      { seconds: 754, confidence: 1.0, segmentCount: 2 }, // verified, 0
      { seconds: 754, confidence: 0.6, segmentCount: 2 }, // 2845
      { seconds: 5025, confidence: 0.6, segmentCount: 3 }, // 81374
      { seconds: null, confidence: 0, segmentCount: 0 }, // unparseable, 0
    ];
    assert.strictEqual(computeMaxError(results), 2845 + 81374);
  });

  it("returns strictly less than count * 3599 for realistic MM:SS durations", () => {
    // This is the core regression test for the reported symptom: 54 videos,
    // each parsed as a real MM:SS duration (not all 0:00), should produce an
    // error bound strictly less than the old flat formula of 54 * 3599.
    const oldFlat = 54 * 3599; // 194346
    const results = Array.from({ length: 54 }, (_, i) => ({
      seconds: 100 + i * 10, // realistic spread, none at the extremes
      confidence: 0.6,
      segmentCount: 2,
    }));
    const bound = computeMaxError(results);
    assert.ok(
      bound < oldFlat,
      `Expected bound ${bound} < old flat formula ${oldFlat}`,
    );
  });

  it("treats confidence 0.8 as the verified threshold (>= contributes 0)", () => {
    const results = [{ seconds: 754, confidence: 0.8, segmentCount: 2 }];
    assert.strictEqual(computeMaxError(results), 0);
  });

  it("treats confidence just below 0.8 as estimated", () => {
    const results = [{ seconds: 754, confidence: 0.79, segmentCount: 2 }];
    assert.strictEqual(computeMaxError(results), 2845);
  });
});
