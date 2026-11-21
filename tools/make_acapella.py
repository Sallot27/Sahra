"""A cappella background sounds for سهرة: synthesized choir "aahs", humming and mouth percussion.
No instruments: every sound is a (synthesized) voice or a mouth sound. Happy major keys.

    python3 tools/make_acapella.py public/audio          # music_lobby, music_thinking, sting_reveal, sting_win
    python3 tools/make_acapella.py public/audio choir    # choir/s0..s7.mp3, env.json, shout.mp3 (جوقة الوحوش)
needs numpy, scipy, ffmpeg.
"""
import subprocess, sys, os
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 32000
rng = np.random.default_rng(7)

# vowel formants: (freq, gain dB, bandwidth)
VOWELS = {
    "a":  [(800, 0, 80), (1150, -6, 90), (2900, -32, 120), (3900, -28, 130)],
    "o":  [(450, 0, 70), (800, -11, 80), (2830, -36, 100), (3500, -40, 120)],
    "u":  [(325, 0, 50), (700, -16, 60), (2530, -35, 170), (3500, -40, 180)],   # "ooh"
    "m":  [(280, 0, 60), (1100, -30, 200), (2500, -42, 250), (3500, -50, 250)], # humming
    "ba": [(600, 0, 60), (1040, -7, 70), (2250, -9, 110), (2450, -9, 120)],     # male "ah"
}

def hz(note):  # MIDI -> Hz
    return 440.0 * 2 ** ((note - 69) / 12)

def formant_gain(f, vowel):
    g = 1e-4
    for F, db, B in VOWELS[vowel]:
        g += 10 ** (db / 20) / (1 + ((f - F) / (B / 2)) ** 2)
    return g

def voice(note, dur, vowel="a", singers=4, attack=.18, release=.35, vib=.006, loud=1.0):
    """one sung note by a small section of singers"""
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    f0 = hz(note)
    for s in range(singers):
        det = 2 ** (rng.uniform(-9, 9) / 1200)
        rate = rng.uniform(4.8, 5.8); ph = rng.uniform(0, 6.28)
        drift = np.cumsum(rng.normal(0, 1, n)) ; drift = drift / (np.abs(drift).max() + 1e-9) * .002
        vibr = vib * np.minimum(1, t / .45)  # vibrato grows in like a real singer
        f = f0 * det * (1 + vibr * np.sin(2 * np.pi * rate * t + ph) + drift)
        phase = 2 * np.pi * np.cumsum(f) / SR
        K = int(min(48, 5200 / f0))
        sig = np.zeros(n)
        for k in range(1, K + 1):
            a = (k ** -1.15) * formant_gain(k * f0, vowel)
            sig += a * np.sin(k * phase + rng.uniform(0, 6.28))
        # a little breath around the formants
        br = rng.normal(0, 1, n); sos = butter(2, [700 / (SR / 2), 3200 / (SR / 2)], "band", output="sos")
        sig += sosfilt(sos, br) * .012
        delay = int(rng.uniform(0, .03) * SR)  # singers never start exactly together
        out[delay:] += sig[: n - delay] / singers
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / release).clip(0, 1)
    return out * env * loud

def place(track, sig, at):
    i = int(at * SR); j = min(len(track), i + len(sig)); track[i:j] += sig[: j - i]

def reverb(x, secs=1.8, mix=.28):
    n = int(secs * SR); ir = rng.normal(0, 1, n) * np.exp(-np.arange(n) / SR * 4.2)
    sos = butter(1, 5000 / (SR / 2), output="sos"); ir = sosfilt(sos, ir); ir /= np.abs(ir).sum() ** .5 * 6
    wet = fftconvolve(x, ir); wet = np.concatenate([wet, np.zeros(len(x) + n - len(wet))])[: len(x) + n]
    dry = np.concatenate([x, np.zeros(n)])
    return dry * (1 - mix) + wet * mix

def loopify(x, length):
    """fold the reverb tail back to the start so the loop is seamless"""
    n = int(length * SR); y = x[:n].copy(); tail = x[n:]
    y[: len(tail)] += tail[: n]
    return y

# mouth percussion
def kick(loud=1.):
    n = int(.18 * SR); t = np.arange(n) / SR
    f = 55 + 90 * np.exp(-t * 28); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18)
    s += rng.normal(0, 1, n) * np.exp(-t * 120) * .15  # the "b" of the lips
    return s * .9 * loud
def hat(loud=1.):
    n = int(.06 * SR); t = np.arange(n) / SR
    sos = butter(2, 5500 / (SR / 2), "high", output="sos")
    return sosfilt(sos, rng.normal(0, 1, n)) * np.exp(-t * 70) * .35 * loud
def snare(loud=1.):  # a "pf" / "k" mouth snare
    n = int(.14 * SR); t = np.arange(n) / SR
    sos = butter(2, [1200 / (SR / 2), 6000 / (SR / 2)], "band", output="sos")
    s = sosfilt(sos, rng.normal(0, 1, n)) * np.exp(-t * 30) * .9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40) * .3
    return s * .6 * loud
def snap(loud=1.):  # tongue click
    n = int(.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 220) * .5 * loud

def master(x, peak=.85):
    x = x - x.mean(); x = np.tanh(x / (np.abs(x).max() + 1e-9) * 1.3)
    return x / (np.abs(x).max() + 1e-9) * peak

def save(x, path, fade_in=0., fade_out=0.):
    if fade_in: x[: int(fade_in * SR)] *= np.linspace(0, 1, int(fade_in * SR))
    if fade_out: x[-int(fade_out * SR):] *= np.linspace(1, 0, int(fade_out * SR))
    pcm = (x * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-ac", "2", "-b:a", "112k", path], input=pcm, check=True)

# C major: I - V - vi - IV (bright and happy)
PROG = [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]]
BASS = [36, 43, 45, 41]

def lobby(out):
    bpm, bars = 100, 8; beat = 60 / bpm; bar = beat * 4; L = bar * bars
    tr = np.zeros(int((L + 3) * SR))
    for b in range(bars):
        ch = PROG[b % 4]; t0 = b * bar
        for i, nte in enumerate(ch):  # "aah" chord, gently swelling each bar
            place(tr, voice(nte + 12 * (i == 2), bar * .98, "a", singers=4, attack=.3, release=.4, loud=.55), t0)
        # bouncy "ba da" bass on beats 1 and 3 (+ pickup)
        for k, off in enumerate([0, 2, 3.5]):
            place(tr, voice(BASS[b % 4] + 12, beat * (.9 if off != 3.5 else .45), "ba", singers=2, attack=.02, release=.08, vib=.002, loud=.75), t0 + off * beat)
        # a little "doo" melody on top, answering every other bar
        if b % 2 == 1:
            mel = [ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]
            for k, m in enumerate(mel):
                place(tr, voice(m, beat * .8, "u", singers=2, attack=.03, release=.12, loud=.28), t0 + (k * .5 + 2) * beat)
        for s in range(8):  # mouth beat
            at = t0 + s * beat / 2
            if s in (0, 4): place(tr, kick(), at)
            if s in (2, 6): place(tr, snare(.8), at)
            place(tr, hat(.7 if s % 2 else .4), at)
    y = loopify(reverb(tr), L)
    save(master(y, .7), out)

def thinking(out):
    bpm, bars = 112, 8; beat = 60 / bpm; bar = beat * 4; L = bar * bars
    tr = np.zeros(int((L + 3) * SR))
    prog = [[60, 64, 67], [60, 65, 69], [62, 65, 69], [59, 62, 67]]  # C - F/C - Dm - G : curious but light
    for b in range(bars):
        ch = prog[b % 4]; t0 = b * bar
        for i, nte in enumerate(ch):  # soft humming pad
            place(tr, voice(nte, bar * .98, "m", singers=3, attack=.35, release=.5, vib=.004, loud=.42), t0)
        for s in range(8):  # "doo doo" plucky ostinato, like a clock ticking
            nte = ch[[0, 2, 1, 2][s % 4]] + 12
            place(tr, voice(nte, beat * .34, "u", singers=2, attack=.01, release=.06, vib=.0, loud=.3), t0 + s * beat / 2)
        for s in range(8):
            at = t0 + s * beat / 2
            place(tr, snap(.9 if s % 2 == 0 else .55), at)
            if s in (0, 5): place(tr, kick(.55), at)
    y = loopify(reverb(tr, mix=.22), L)
    save(master(y, .55), out)

def sting_reveal(out):
    tr = np.zeros(int(4 * SR))
    for i, (a, b) in enumerate([(55, 60), (59, 64), (62, 67), (67, 72)]):  # a rising "aaah" stack
        place(tr, voice(b, 2.6 - i * .35, "a", singers=4, attack=.25, release=.6, loud=.6), i * .35)
    place(tr, kick(), 1.4); place(tr, snap(), 1.4)
    save(master(reverb(tr, mix=.3)[: int(3.2 * SR)], .85), out, fade_out=.4)

def sting_win(out):
    tr = np.zeros(int(5 * SR))
    for nte in [48, 60, 64, 67, 72, 76]:  # bright "taa-daa!" chord
        place(tr, voice(nte, .35, "a", singers=4, attack=.02, release=.1, loud=.5), 0)
        place(tr, voice(nte + (2 if nte in (64, 76) else 0), 3.2, "a", singers=5, attack=.08, release=.9, loud=.55), .42)
    place(tr, kick(), 0); place(tr, snare(), .42); place(tr, kick(), .42)
    save(master(reverb(tr, mix=.32)[: int(4.2 * SR)], .9), out, fade_out=.6)

if __name__ == "__main__" and (len(sys.argv) < 3 or sys.argv[2] != "choir"):
    d = sys.argv[1] if len(sys.argv) > 1 else "."
    lobby(os.path.join(d, "music_lobby.mp3")); print("lobby")
    thinking(os.path.join(d, "music_thinking.mp3")); print("thinking")
    sting_reveal(os.path.join(d, "sting_reveal.mp3")); sting_win(os.path.join(d, "sting_win.mp3")); print("stings")


# ---------------------------------------------------------------------------
# جوقة الوحوش: 8 stems of one song (same tempo, key and length). Each player's
# monster sings one stem; the big screen plays only the stems whose monster is in the room.
# Also writes env.json (mouth openness per 1/20 s for each stem) and shout.mp3.
def choir(d):
    os.makedirs(d, exist_ok=True)
    bpm, bars = 100, 8; beat = 60 / bpm; bar = beat * 4; L = bar * bars
    N = int((L + 3) * SR)
    st = [np.zeros(N) for _ in range(8)]
    for b in range(bars):
        ch = PROG[b % 4]; t0 = b * bar
        # 0: "aah" chords
        for i, nte in enumerate(ch):
            place(st[0], voice(nte, bar * .98, "a", singers=3, attack=.3, release=.4, loud=.5), t0)
        # 1: bass "bm ba"
        for off, ln in [(0, .9), (1.5, .45), (2, .9), (3.5, .45)]:
            place(st[1], voice(BASS[b % 4] + 12, beat * ln, "ba", singers=2, attack=.02, release=.08, vib=.002, loud=.8), t0 + off * beat)
        # 2: mouth beat (kick + snare)
        for s in range(8):
            at = t0 + s * beat / 2
            if s in (0, 3, 4): place(st[2], kick(1 if s != 3 else .6), at)
            if s in (2, 6): place(st[2], snare(.9), at)
        # 3: "doo doo" melody
        mel = [ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[2] + 12, ch[2] + 12, None] if b % 2 == 0 else [ch[1] + 12, ch[1] + 12, ch[1] + 12, None, ch[2] + 12, ch[2] + 15 if ch[2] + 15 in (79, 76, 72, 77) else ch[2] + 12, ch[2] + 12, None]
        for k, m in enumerate(mel):
            if m: place(st[3], voice(m, beat * .45, "u", singers=2, attack=.02, release=.1, vib=.003, loud=.42), t0 + k * beat / 2)
        # 4: humming "mmm" (one long low note per bar, the third of the chord)
        place(st[4], voice(ch[1] - 12 + 12, bar * .97, "m", singers=3, attack=.4, release=.5, vib=.004, loud=.5), t0)
        # 5: "ts ts" and tongue clicks
        for s in range(16):
            at = t0 + s * beat / 4
            place(st[5], hat(.8 if s % 2 else .45), at)
            if s in (5, 13): place(st[5], snap(.8), at)
        # 6: high "ooh" countermelody, long notes
        top = [ch[2] + 24, ch[0] + 24][b % 2]
        place(st[6], voice(top, bar * .5, "u", singers=3, attack=.25, release=.3, loud=.32), t0)
        place(st[6], voice(top - (1 if top % 12 in (0, 5) else 2), bar * .45, "u", singers=3, attack=.2, release=.3, loud=.3), t0 + bar * .5)
        # 7: "ba ba ba" arpeggio
        for s in range(8):
            nte = [ch[0], ch[1], ch[2], ch[1]][s % 4] + 12
            place(st[7], voice(nte, beat * .3, "ba", singers=1, attack=.01, release=.05, vib=0, loud=.35), t0 + s * beat / 2)
    outs = [loopify(reverb(x, mix=.24), L) for x in st]
    peak = max(np.abs(sum(outs)).max(), 1e-9)
    env = []
    for i, x in enumerate(outs):
        y = np.tanh(x / peak * 1.2) * .8
        save(y.copy(), os.path.join(d, f"s{i}.mp3"))
        hop = SR // 20
        e = np.array([np.sqrt(np.mean(y[j:j + hop] ** 2)) for j in range(0, len(y) - hop + 1, hop)])
        env.append([round(float(v), 2) for v in (e / (e.max() + 1e-9))])
    import json
    json.dump({"len": L, "fps": 20, "env": env}, open(os.path.join(d, "env.json"), "w"))
    # a monster's "aah!" (pitched per monster by playback rate)
    sh = np.zeros(int(1.6 * SR)); place(sh, voice(60, .9, "a", singers=3, attack=.03, release=.4, vib=.012, loud=1), 0)
    save(master(reverb(sh, mix=.25)[: int(1.6 * SR)], .9), os.path.join(d, "shout.mp3"), fade_out=.3)

if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[2] == "choir":
    choir(os.path.join(sys.argv[1], "choir"))
