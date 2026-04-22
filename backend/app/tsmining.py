from __future__ import annotations

import numpy as np
from numba import njit


@njit(cache=True)
def znormalize(x: np.ndarray) -> np.ndarray:
    mu = np.mean(x)
    sigma = np.std(x)
    if sigma == 0.0:
        return np.zeros_like(x)
    return (x - mu) / sigma


@njit(cache=True)
def compute_envelope(q: np.ndarray, r: int) -> tuple[np.ndarray, np.ndarray]:
    n = q.shape[0]
    U = np.empty(n, dtype=np.float64)
    L = np.empty(n, dtype=np.float64)

    for i in range(n):
        start = i - r
        if start < 0:
            start = 0
        end = i + r
        if end > n - 1:
            end = n - 1

        mx = q[start]
        mn = q[start]
        for j in range(start + 1, end + 1):
            v = q[j]
            if v > mx:
                mx = v
            if v < mn:
                mn = v
        U[i] = mx
        L[i] = mn

    return U, L


@njit(cache=True)
def lb_keogh(c: np.ndarray, U: np.ndarray, L: np.ndarray) -> float:
    s = 0.0
    n = c.shape[0]
    for i in range(n):
        x = c[i]
        if x > U[i]:
            d = x - U[i]
            s += d * d
        elif x < L[i]:
            d = L[i] - x
            s += d * d
    return s


@njit(cache=True)
def dtw_sakoe_chiba(a: np.ndarray, b: np.ndarray, r: int, cutoff: float) -> float:
    """
    Constrained DTW (Sakoe-Chiba band) with early abandon.

    Returns squared DTW distance (no final sqrt) so it is comparable to LB_Keogh.
    """
    n = a.shape[0]
    big = 1e300

    prev = np.full(n + 1, big, dtype=np.float64)
    curr = np.full(n + 1, big, dtype=np.float64)
    prev[0] = 0.0

    for i in range(1, n + 1):
        j_start = i - r
        if j_start < 1:
            j_start = 1
        j_end = i + r
        if j_end > n:
            j_end = n

        curr[0] = big
        row_min = big

        for j in range(j_start, j_end + 1):
            diff = a[i - 1] - b[j - 1]
            cost = diff * diff
            best_prev = prev[j]
            v = curr[j - 1]
            if v < best_prev:
                best_prev = v
            v = prev[j - 1]
            if v < best_prev:
                best_prev = v

            curr[j] = cost + best_prev
            if curr[j] < row_min:
                row_min = curr[j]

        if row_min >= cutoff:
            return big

        tmp = prev
        prev = curr
        curr = tmp

    return prev[n]

