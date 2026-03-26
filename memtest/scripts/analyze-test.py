#!/usr/bin/env python3
"""
Usage: python analyze-test.py results/f1-baseline.csv --rps 10 --duration 600
       python analyze-test.py results/          # analyze all CSVs in directory
"""
import argparse
import csv
import os
import sys
import math


def linear_regression(x, y):
    """Simple linear regression returning (slope, intercept, r_squared)."""
    n = len(x)
    if n < 2:
        return 0, 0, 0

    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi * xi for xi in x)
    sum_y2 = sum(yi * yi for yi in y)

    denom = n * sum_x2 - sum_x * sum_x
    if denom == 0:
        return 0, 0, 0

    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n

    # R-squared
    ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))
    mean_y = sum_y / n
    ss_tot = sum((yi - mean_y) ** 2 for yi in y)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return slope, intercept, r_squared


def analyze(csv_path, rps, duration_sec):
    """Analyze a single CSV file."""
    rows = []
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                rows.append({k: float(v) for k, v in row.items()})
            except (ValueError, TypeError):
                continue

    if len(rows) < 3:
        print(f"  SKIP: {csv_path} — too few data points ({len(rows)})")
        return None

    total_requests = rps * duration_sec

    # Time-based x-axis (seconds from start)
    t0 = rows[0]['timestamp']
    t_sec = [(r['timestamp'] - t0) / 1000.0 for r in rows]

    # Skip first 30s warmup
    warmup_idx = 0
    for i, t in enumerate(t_sec):
        if t >= 30:
            warmup_idx = i
            break

    t_sec = t_sec[warmup_idx:]
    rows = rows[warmup_idx:]

    if len(rows) < 3:
        print(f"  SKIP: {csv_path} — too few data points after warmup trim")
        return None

    results = {}
    for col in ['rss_mb', 'heapUsed_mb', 'external_mb']:
        if col not in rows[0]:
            continue

        y = [r[col] for r in rows]
        slope, intercept, r_squared = linear_regression(t_sec, y)

        # Convert MB/sec slope to bytes/request
        bytes_per_sec = slope * 1024 * 1024
        bytes_per_req = bytes_per_sec / rps if rps > 0 else 0

        # Project to 6 days at production rate (~100 req/min = 1.67 req/s)
        prod_rps = 100 / 60.0
        six_day_sec = 6 * 24 * 3600
        six_day_growth_mb = (bytes_per_req * prod_rps * six_day_sec) / (1024 * 1024)

        results[col] = {
            'slope_mb_per_sec': round(slope, 6),
            'bytes_per_request': round(bytes_per_req, 1),
            'r_squared': round(r_squared, 4),
            'six_day_projection_mb': round(six_day_growth_mb, 1),
            'start_mb': round(y[0], 2),
            'end_mb': round(y[-1], 2),
            'delta_mb': round(y[-1] - y[0], 2),
        }

    name = os.path.basename(csv_path).replace('.csv', '')
    print(f"\n{'='*60}")
    print(f"Test: {name}")
    print(f"Data points: {len(rows)} (after warmup trim)")
    print(f"Total requests: {total_requests:,}  ({rps} RPS x {duration_sec}s)")
    print(f"{'='*60}")
    for metric, vals in results.items():
        print(f"\n  {metric}:")
        print(f"    Start:          {vals['start_mb']:.2f} MB")
        print(f"    End:            {vals['end_mb']:.2f} MB")
        print(f"    Delta:          {vals['delta_mb']:.2f} MB")
        print(f"    Slope:          {vals['bytes_per_request']:.1f} B/req  "
              f"(R²={vals['r_squared']:.3f})")
        print(f"    6-day estimate: {vals['six_day_projection_mb']:.0f} MB  "
              f"(at 100 req/min)")
    print()

    return results


def analyze_rss_divergence(results):
    """Compute RSS:heap ratio from a results dict."""
    if not results or 'rss_mb' not in results or 'heapUsed_mb' not in results:
        return
    rss_bpr = results['rss_mb']['bytes_per_request']
    heap_bpr = results['heapUsed_mb']['bytes_per_request']
    if heap_bpr > 0:
        ratio = rss_bpr / heap_bpr
        non_heap_pct = ((ratio - 1) / ratio) * 100 if ratio > 1 else 0
        print(f"  RSS:heap ratio: {ratio:.2f}x")
        print(f"  Non-heap growth: {non_heap_pct:.0f}% of RSS growth")
    else:
        print(f"  RSS:heap ratio: N/A (heap slope <= 0)")


def print_results_matrix(all_results):
    """Print the final results matrix table."""
    print(f"\n{'='*100}")
    print("RESULTS MATRIX")
    print(f"{'='*100}")
    header = f"{'Test':<20} {'heapUsed B/req':>14} {'R²':>6} {'RSS B/req':>12} {'R²':>6} {'6d heap(MB)':>12} {'6d RSS(MB)':>12}"
    print(header)
    print("-" * 100)
    for name, results in sorted(all_results.items()):
        if results is None:
            print(f"{name:<20} {'SKIPPED':>14}")
            continue
        heap = results.get('heapUsed_mb', {})
        rss = results.get('rss_mb', {})
        print(f"{name:<20} "
              f"{heap.get('bytes_per_request', 0):>14.1f} "
              f"{heap.get('r_squared', 0):>6.3f} "
              f"{rss.get('bytes_per_request', 0):>12.1f} "
              f"{rss.get('r_squared', 0):>6.3f} "
              f"{heap.get('six_day_projection_mb', 0):>12.0f} "
              f"{rss.get('six_day_projection_mb', 0):>12.0f}")
    print()


def print_derived_attribution(all_results):
    """Print derived attribution via subtraction."""
    print(f"\n{'='*80}")
    print("DERIVED ATTRIBUTION (subtraction)")
    print(f"{'='*80}")
    header = f"{'Vector':<30} {'Calculation':<25} {'B/req':>8} {'6d (MB)':>10}"
    print(header)
    print("-" * 80)

    pairs = [
        ("Undici fetch leak", "f2-a - f2-b", "f2-node20.17", "f2-node20.15"),
        ("Sentry (bot traffic)", "f3-a - f3-b", "f3-sentry100-bot", "f3-sentry-disabled"),
        ("Sentry (bot filter fix)", "f3-a - f3-c", "f3-sentry100-bot", "f3-sentry-botfilter"),
        ("QueryClient orphans", "f4-a - f4-a'", "f4-queryclient-nofix", "f4-queryclient-fix"),
        ("Next.js fetch patching", "f6-a - f6-b", "f6-global-fetch", "f6-node-http"),
        ("WASM bundling (startup)", "f7-a - f7-b", "f7-no-externalpkgs", "f7-externalpkgs"),
    ]

    for label, calc, key_a, key_b in pairs:
        res_a = all_results.get(key_a)
        res_b = all_results.get(key_b)
        if res_a and res_b and 'heapUsed_mb' in res_a and 'heapUsed_mb' in res_b:
            bpr = res_a['heapUsed_mb']['bytes_per_request'] - res_b['heapUsed_mb']['bytes_per_request']
            sixd = res_a['heapUsed_mb']['six_day_projection_mb'] - res_b['heapUsed_mb']['six_day_projection_mb']
            print(f"{label:<30} {calc:<25} {bpr:>8.1f} {sixd:>10.0f}")
        else:
            print(f"{label:<30} {calc:<25} {'N/A':>8} {'N/A':>10}")
    print()


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('path', help='CSV file or directory of CSVs')
    p.add_argument('--rps', type=int, default=10)
    p.add_argument('--duration', type=int, default=600)
    args = p.parse_args()

    if os.path.isdir(args.path):
        csvs = sorted([os.path.join(args.path, f) for f in os.listdir(args.path) if f.endswith('.csv')])
        all_results = {}
        for csv_path in csvs:
            name = os.path.basename(csv_path).replace('.csv', '')
            all_results[name] = analyze(csv_path, args.rps, args.duration)
        print_results_matrix(all_results)
        print_derived_attribution(all_results)

        # RSS divergence for baseline
        if 'f1-baseline' in all_results and all_results['f1-baseline']:
            print("RSS vs heapUsed divergence (F1 baseline):")
            analyze_rss_divergence(all_results['f1-baseline'])
    else:
        results = analyze(args.path, args.rps, args.duration)
        if results:
            analyze_rss_divergence(results)
