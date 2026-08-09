# Cash Grab v6 Internal Balance Benchmark

Synthetic validation: 5,000 Current-mode games / 50,000 individual player lines using random legal teams. This is a development benchmark, not a forced target or guarantee for live games.

```json
{
  "N": 5000,
  "playerLines": 50000,
  "ast": {
    "avg": 3.52984,
    "p95": 9,
    "p99": 13,
    "max": 18,
    "tenPlusRate": 0.04338
  },
  "stl": {
    "avg": 0.96768,
    "p95": 3,
    "p99": 4,
    "max": 7,
    "fourPlusRate": 0.02984
  },
  "blk": {
    "avg": 0.6699,
    "p95": 3,
    "p99": 4,
    "max": 7,
    "fourPlusRate": 0.0194
  },
  "to": {
    "avg": 2.4256,
    "p05": 0,
    "p95": 6,
    "p99": 8,
    "max": 9,
    "zeroRate": 0.08678,
    "sevenPlusRate": 0.02564
  },
  "reb": {
    "avg": 8.09246,
    "p95": 15,
    "p99": 18,
    "max": 30,
    "fifteenPlusRate": 0.05932
  },
  "gameMax": {
    "ast10Rate": 0.3798,
    "stl4Rate": 0.2696,
    "blk4Rate": 0.1834,
    "to7Rate": 0.239,
    "reb15Rate": 0.4784
  }
}
```

Targeted rebound test with Darius Garland / Paul George / Michael Porter Jr. / Kristaps Porzingis / Ivica Zubac produced approximate rebound averages of **4 / 6 / 6 / 9 / 11**. Zubac's 90th percentile was about 14 rebounds and his 99th percentile about 18, preserving occasional high-teens/20+ rebound games while shifting ordinary guard rebounds downward when multiple strong bigs are present.
