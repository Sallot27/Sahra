"""Generates the game's sound effects from scratch (no samples, no licenses).

Run:  python3 tools/make_sfx.py   (needs numpy, scipy and ffmpeg)
Writes public/audio/sfx_*.mp3
"""
import pathlib
import subprocess
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "audio"
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, r=0.2, d=None, curve=4.0):
    """Attack then exponential release over n samples."""
    x = np.ones(n)
    na = max(1, int(SR * a))
    x[:na] = np.linspace(0, 1, na)
    rest = np.linspace(0, 1, n - na)
    x[na:] = np.exp(-curve * rest * (len(rest) / (SR * r)) / max(1e-9, len(rest) / SR))
    return x


def decay(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))


def tone(freq, d, kind="sine", vib=0.0, vib_rate=6.0):
    tt = t(d)
    f = np.broadcast_to(freq, tt.shape) if np.ndim(freq) else np.full(tt.shape, float(freq))
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * vib_rate * tt))
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "sine":
        return np.sin(ph)
    if kind == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if kind == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == "square":
        return np.sign(np.sin(ph))
    raise ValueError(kind)


def noise(d):
    return rng.uniform(-1, 1, int(SR * d))


def band(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x)


def lowpass(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def highpass(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def mix(*parts):
    n = max(len(p[1]) + int(p[0] * SR) for p in parts)
    out = np.zeros(n)
    for start, sig in parts:
        s = int(start * SR)
        out[s:s + len(sig)] += sig
    return out


def bell(freq, d=1.2, tau=0.35, gain=1.0):
    n = int(SR * d)
    partials = [(1, 1), (2.0, .5), (3.01, .25), (4.2, .12), (5.4, .06)]
    x = sum(a * tone(freq * k, d) * decay(n, tau / (1 + .6 * i)) for i, (k, a) in enumerate(partials))
    return gain * x


def save(name, x, stereo=False):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    fade = int(SR * 0.01)
    x[-fade:] *= np.linspace(1, 0, fade)
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        wavfile.write(f.name, SR, (x * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f.name, "-af", "loudnorm=I=-18:TP=-1.5",
                        "-ar", "44100", "-ac", "1", "-b:a", "80k", str(OUT / f"sfx_{name}.mp3")], check=True)


def make():
    OUT.mkdir(parents=True, exist_ok=True)

    # whoosh: filtered noise sweeping up then down (category card fly-out)
    d = 0.55
    n = noise(d)
    tt = t(d)
    sweep = 400 + 3200 * np.sin(np.pi * tt / d) ** 2
    seg = 256
    w = np.zeros_like(n)
    for i in range(0, len(n), seg):
        f = sweep[i]
        w[i:i + seg] = band(n[max(0, i - 2048):i + seg], max(80, f * .6), min(18000, f * 1.6))[-len(n[i:i + seg]):]
    save("whoosh", w * np.sin(np.pi * tt / d) ** 1.5)

    # pop: quick pitch drop with a bubbly body (card pops in)
    d = 0.18
    f = 900 * np.exp(-t(d) * 22) + 180
    save("pop", tone(f, d) * decay(int(SR * d), 0.05) + .25 * band(noise(d), 1500, 5000) * decay(int(SR * d), .01))

    # tada: brass-ish major chord with a little drum hit (category lands)
    d = 1.6
    chord = sum(tone(fr, d, "saw", vib=.004) for fr in (261.6, 329.6, 392.0, 523.3))
    chord = lowpass(chord, 2600) * env(int(SR * d), a=.02, r=.9)
    hit = lowpass(noise(.25), 900) * decay(int(SR * .25), .06) * 2
    pre = lowpass(sum(tone(fr, .14, "saw") for fr in (196, 246.9, 293.7)), 2400) * env(int(SR * .14), a=.01, r=.1)
    save("tada", mix((0, pre), (0.15, hit), (0.15, chord)))

    # join: bright two-note chime (player joins)
    save("join", mix((0, bell(1046.5, .6, .18, .8)), (0.09, bell(1568, .9, .25))))

    # submit: soft "ploop" (player sends an answer)
    d = 0.22
    f = 380 + 520 * (1 - np.exp(-t(d) * 30))
    save("submit", tone(f, d) * env(int(SR * d), a=.004, r=.12))

    # tick: woody clock tick (last seconds)
    d = 0.09
    tk = band(noise(d), 2200, 5200, 4) * decay(int(SR * d), .012) + .4 * tone(1800, d) * decay(int(SR * d), .01)
    save("tick", tk)

    # sad trombone: wah wah wah waaah (a lie is revealed)
    notes = [(0, 311.1, .32), (.34, 293.7, .32), (.68, 277.2, .32), (1.02, 261.6, 1.1)]
    parts = []
    for st, fr, ln in notes:
        x = tone(fr, ln, "saw", vib=.012 if ln > .5 else .0, vib_rate=5.5)
        x = lowpass(x, 1400) * env(int(SR * ln), a=.03, r=ln * .9 if ln > .5 else .25)
        parts.append((st, x))
    save("trombone", mix(*parts))

    # sparkle: rising bell arpeggio (the truth is revealed)
    arp = [1046.5, 1318.5, 1568, 2093, 2637]
    save("sparkle", mix(*[(i * .07, bell(fr, 1.2, .3, .9 - i * .1)) for i, fr in enumerate(arp)],
                        (0, highpass(noise(1.0), 6000) * decay(SR, .25) * .15)))

    # coin: classic two-tone ding (points)
    d1, d2 = .07, .45
    save("coin", mix((0, tone(987.8, d1, "square") * .35), (d1, tone(1318.5, d2, "square") * decay(int(SR * d2), .12) * .35)))

    # applause: many short filtered claps spread over time (winner)
    d = 3.2
    claps = np.zeros(int(SR * d))
    for _ in range(900):
        st = int(rng.uniform(0, d - .05) * SR)
        ln = int(SR * rng.uniform(.006, .02))
        c = band(rng.uniform(-1, 1, ln), rng.uniform(900, 1600), rng.uniform(2500, 6000), 2) * decay(ln, .004)
        claps[st:st + ln] += c * rng.uniform(.3, 1)
    shape = np.minimum(1, t(d) / .4) * np.minimum(1, (d - t(d)) / 1.2)
    save("applause", claps * shape)

    # swoosh_up: short whoosh for the scoreboard rows
    d = .3
    save("swoosh", highpass(noise(d), 1500) * np.sin(np.pi * t(d) / d) ** 2)


if __name__ == "__main__":
    make()
    print("ok")
