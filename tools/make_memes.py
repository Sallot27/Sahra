"""Draws the reaction cards for «شكلي إذا» as animated SVGs (original art, no text).

Run: python3 tools/make_memes.py  ->  public/img/memes/<n>.svg and public/img/memes/index.json
"""
import json
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "img" / "memes"
INK = "#1a1033"

CSS = """
.a{transform-box:fill-box;transform-origin:center}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes drip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(40px);opacity:0}}
@keyframes puff{0%{transform:translateY(0) scale(.6);opacity:.9}100%{transform:translateY(-28px) scale(1.4);opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes look{0%,40%{transform:translateX(0)}50%,90%{transform:translateX(7px)}100%{transform:translateX(0)}}
@keyframes up{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes float{0%{transform:translate(0,0);opacity:0}20%{opacity:1}100%{transform:translate(10px,-34px);opacity:0}}
@keyframes rise{0%{transform:translateY(10px);opacity:0}30%{opacity:.9}100%{transform:translateY(-30px);opacity:0}}
@keyframes pop{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes boom{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.6);opacity:0}}
@keyframes shiver{0%,100%{transform:translate(0,0)}20%{transform:translate(-2px,1px)}40%{transform:translate(2px,-1px)}60%{transform:translate(-1px,-1px)}80%{transform:translate(1px,1px)}}
@keyframes melt{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.9)}}
@keyframes glint{0%,70%,100%{opacity:0}80%{opacity:1}}
@keyframes run{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(20deg)}}
@keyframes tilt{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
@keyframes flip{0%,100%{transform:rotate(180deg)}50%{transform:rotate(170deg)}}
@keyframes fall{0%{transform:translateY(-10px)}100%{transform:translateY(60px)}}
@keyframes blink{0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
"""


def svg(bg, body, extra_css=""):
    import re
    body = re.sub(r'style="([^"]*)" style="([^"]*)"', r'style="\1;\2"', body)  # anim() + transform-origin on one tag
    # a pivot given in picture coordinates (px) is measured on the whole picture, not the shape's own box
    body = re.sub(r'style="([^"]*transform-origin:[^"]*px[^"]*)"', r'style="\1;transform-box:view-box"', body)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><style>{CSS}{extra_css}</style>'
            f'<rect width="120" height="120" rx="18" fill="{bg}"/>{body}</svg>')


def anim(name, dur, delay=0, inf=True, ease="ease-in-out"):
    return f'class="a" style="animation:{name} {dur}s {ease} {delay}s {"infinite" if inf else "1 both"}"'


def blob(color="#ffcc33", cx=60, cy=64, r=38, cls=""):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" {cls}/><ellipse cx="{cx-12}" cy="{cy-18}" rx="10" ry="6" fill="#fff" opacity=".35"/>'


def eyes(y=58, dx=13, r=5, look=False):
    g = f'<g {anim("look", 3) if look else anim("blink", 4)}><circle cx="{60-dx}" cy="{y}" r="{r}" fill="{INK}"/><circle cx="{60+dx}" cy="{y}" r="{r}" fill="{INK}"/></g>'
    return g


def brows(y=46, kind="angry"):
    if kind == "angry":
        return f'<path d="M38 {y-4} L54 {y+3} M82 {y-4} L66 {y+3}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    if kind == "sad":
        return f'<path d="M38 {y+3} L54 {y-3} M82 {y+3} L66 {y-3}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
    if kind == "up":
        return f'<path d="M40 {y-2} Q47 {y-8} 54 {y-2} M66 {y-2} Q73 {y-8} 80 {y-2}" stroke="{INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    return ""


def mouth(kind, y=78):
    m = {
        "smile": f'<path d="M48 {y} Q60 {y+10} 72 {y}" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>',
        "frown": f'<path d="M48 {y+6} Q60 {y-4} 72 {y+6}" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>',
        "flat": f'<path d="M50 {y+2} L70 {y+2}" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>',
        "o": f'<ellipse cx="60" cy="{y+3}" rx="7" ry="9" fill="{INK}"/>',
        "bigo": f'<ellipse cx="60" cy="{y+4}" rx="10" ry="13" fill="{INK}"/><ellipse cx="60" cy="{y+10}" rx="6" ry="4" fill="#ff6b81"/>',
        "laugh": f'<path d="M44 {y-2} Q60 {y+22} 76 {y-2} Z" fill="{INK}"/><path d="M50 {y+8} Q60 {y+16} 70 {y+8}" fill="#ff6b81"/>',
        "grit": f'<rect x="46" y="{y-3}" width="28" height="11" rx="4" fill="#fff" stroke="{INK}" stroke-width="3"/><path d="M53 {y-3} V{y+8} M60 {y-3} V{y+8} M67 {y-3} V{y+8}" stroke="{INK}" stroke-width="2"/>',
        "wobble": f'<path d="M46 {y+4} q4 -5 7 0 t7 0 t7 0 t7 0" stroke="{INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
        "smirk": f'<path d="M50 {y+2} Q62 {y+6} 72 {y-4}" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>',
        "yawn": f'<ellipse cx="60" cy="{y+4}" rx="9" ry="12" fill="{INK}" {anim("pop", 2.5)}/>',
        "tongue": f'<path d="M48 {y} Q60 {y+8} 72 {y}" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M60 {y+4} q8 2 6 12 q-6 4 -10 -2 z" fill="#ff6b81"/>',
    }
    return m[kind]


def tears(stream=False):
    if stream:
        return (f'<g {anim("drip", 1.1, ease="ease-in")}><path d="M44 62 q-3 8 0 14 q3 -6 0 -14" fill="#4cc2ff"/></g>'
                f'<g {anim("drip", 1.1, .5, ease="ease-in")}><path d="M76 62 q-3 8 0 14 q3 -6 0 -14" fill="#4cc2ff"/></g>'
                f'<g {anim("drip", 1.1, .25, ease="ease-in")}><circle cx="44" cy="70" r="3" fill="#4cc2ff"/></g>'
                f'<g {anim("drip", 1.1, .75, ease="ease-in")}><circle cx="76" cy="70" r="3" fill="#4cc2ff"/></g>')
    return f'<g {anim("drip", 1.6, ease="ease-in")}><path d="M46 63 q-3 7 0 11 q3 -4 0 -11" fill="#4cc2ff"/></g>'


def hand(x, y, rot=0, color="#ffcc33"):
    return (f'<g transform="translate({x} {y}) rotate({rot})"><ellipse cx="0" cy="0" rx="11" ry="9" fill="{color}" stroke="{INK}" stroke-width="2.5"/>'
            f'<path d="M-6 -6 v-6 M-1 -8 v-7 M4 -7 v-6" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/></g>')


def cat(color="#c9c9d6", body=""):
    return (f'<path d="M26 52 L32 20 L52 38 Z" fill="{color}"/><path d="M94 52 L88 20 L68 38 Z" fill="{color}"/>'
            f'<path d="M31 46 L34 28 L45 38 Z" fill="#ffb3c1"/><path d="M89 46 L86 28 L75 38 Z" fill="#ffb3c1"/>'
            f'<ellipse cx="60" cy="68" rx="36" ry="32" fill="{color}"/>'
            f'<path d="M56 74 L64 74 L60 79 Z" fill="#ff7f9f"/>'
            f'<path d="M28 72 L14 69 M28 78 L14 80 M92 72 L106 69 M92 78 L106 80" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>' + body)


def dog(color="#d9a066", body=""):
    return (f'<ellipse cx="28" cy="56" rx="11" ry="22" fill="#8a5a2b"/><ellipse cx="92" cy="56" rx="11" ry="22" fill="#8a5a2b"/>'
            f'<ellipse cx="60" cy="64" rx="32" ry="32" fill="{color}"/><ellipse cx="60" cy="80" rx="16" ry="12" fill="#f3d3a8"/>'
            f'<ellipse cx="60" cy="72" rx="7" ry="5" fill="{INK}"/>' + body)


def frog(body=""):
    return (f'<circle cx="40" cy="42" r="15" fill="#4fc35a"/><circle cx="80" cy="42" r="15" fill="#4fc35a"/>'
            f'<ellipse cx="60" cy="72" rx="42" ry="30" fill="#4fc35a"/>' + body)


M = []


def add(key, label, content):
    M.append((key, label, content))


# ---- cats
add("cry_cat", "قطوة تبكي", svg("#7fb8ff", cat(body=f'<g {anim("shake", .5)}>'
    f'<ellipse cx="46" cy="62" rx="8" ry="9" fill="{INK}"/><ellipse cx="74" cy="62" rx="8" ry="9" fill="{INK}"/>'
    f'<circle cx="48" cy="59" r="3" fill="#fff"/><circle cx="76" cy="59" r="3" fill="#fff"/>'
    f'<path d="M43 68 Q46 72 49 68 M71 68 Q74 72 77 68" stroke="#4cc2ff" stroke-width="3" fill="none"/></g>'
    + mouth("wobble", 82) + tears(True))))
add("judge_cat", "قطوة تحكم عليك", svg("#ffd98a", cat("#f39c3d", f'<g {anim("blink", 5)}><path d="M38 62 h16 M66 62 h16" stroke="{INK}" stroke-width="5" stroke-linecap="round"/></g>'
    f'<path d="M37 55 L54 58 M83 55 L66 58" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>' + mouth("flat", 80))))
add("shock_cat", "قطوة مصدومة", svg("#ff8fa3", f'<g {anim("shake", .35)}>' + cat("#fff4dc", '<circle cx="46" cy="60" r="10" fill="#fff" stroke="#1a1033" stroke-width="3"/><circle cx="74" cy="60" r="10" fill="#fff" stroke="#1a1033" stroke-width="3"/><circle cx="46" cy="60" r="3.5" fill="#1a1033"/><circle cx="74" cy="60" r="3.5" fill="#1a1033"/>' + mouth("o", 80)) + '</g>'))
# ---- dogs / frog / penguin
add("confused_dog", "كلب مستغرب", svg("#a8e05f", f'<g {anim("tilt", 2.4)}>' + dog(body=eyes(56, 13, 5) + brows(46, "up") + mouth("flat", 84)) + '</g>'
    f'<g {anim("bob", 1.6)}><path d="M92 18 q10 -2 10 7 q0 6 -7 8 v5" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="95" cy="44" r="2.5" fill="{INK}"/></g>'))
add("happy_dog", "كلب مبسوط", svg("#ffcc33", f'<g {anim("bob", .7)}>' + dog(body=f'<path d="M42 56 Q48 50 54 56 M66 56 Q72 50 78 56" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("tongue", 84)) + '</g>'))
add("stare_frog", "ضفدع يطالع بصمت", svg("#7fe0ff", frog(f'<circle cx="40" cy="42" r="9" fill="#fff"/><circle cx="80" cy="42" r="9" fill="#fff"/>'
    f'<g {anim("blink", 6)}><circle cx="40" cy="43" r="4" fill="{INK}"/><circle cx="80" cy="43" r="4" fill="{INK}"/></g><path d="M38 78 H82" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>')))
add("cry_frog", "ضفدع يبكي", svg("#b98cff", frog(f'<path d="M33 44 Q40 38 47 44 M73 44 Q80 38 87 44" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("frown", 76)) + tears(True)))
add("penguin_fall", "بطريق يتزحلق", svg("#dff3ff", f'<rect x="0" y="96" width="120" height="24" fill="#bfe3ff"/><g {anim("run", .6)} style="transform-origin:60px 90px">'
    f'<ellipse cx="60" cy="62" rx="26" ry="32" fill="{INK}"/><ellipse cx="60" cy="68" rx="17" ry="24" fill="#fff"/>'
    f'<circle cx="53" cy="52" r="4" fill="#fff"/><circle cx="67" cy="52" r="4" fill="#fff"/><circle cx="53" cy="52" r="2" fill="{INK}"/><circle cx="67" cy="52" r="2" fill="{INK}"/>'
    f'<path d="M54 60 L66 60 L60 67 Z" fill="#ffb02e"/><ellipse cx="50" cy="96" rx="8" ry="4" fill="#ffb02e"/><ellipse cx="70" cy="96" rx="8" ry="4" fill="#ffb02e"/></g>'
    f'<path d="M16 30 l8 4 M14 44 l9 1 M100 30 l-8 4" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'))

# ---- blob faces
B = "#ffcc33"
add("sob", "يبكي بحرقة", svg("#4cc2ff", blob(B) + brows(48, "sad") + f'<path d="M40 58 Q47 63 54 58 M66 58 Q73 63 80 58" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("bigo", 76) + tears(True)))
add("shocked", "مصدوم", svg("#ff8fa3", f'<g {anim("shake", .3)}>' + blob(B) + f'<circle cx="47" cy="56" r="8" fill="#fff" stroke="{INK}" stroke-width="3"/><circle cx="73" cy="56" r="8" fill="#fff" stroke="{INK}" stroke-width="3"/><circle cx="47" cy="56" r="3" fill="{INK}"/><circle cx="73" cy="56" r="3" fill="{INK}"/>' + mouth("bigo", 74) + hand(26, 74, -20) + hand(94, 74, 20) + '</g>'))
add("side_eye", "نظرة جانبية", svg("#b98cff", blob(B) + f'<circle cx="47" cy="58" r="8" fill="#fff"/><circle cx="73" cy="58" r="8" fill="#fff"/><g {anim("look", 3)}><circle cx="45" cy="58" r="4" fill="{INK}"/><circle cx="71" cy="58" r="4" fill="{INK}"/></g>'
    f'<path d="M38 49 H56 M64 49 H82" stroke="{INK}" stroke-width="3.5" stroke-linecap="round"/>' + mouth("flat", 76)))
add("angry", "معصب وطالع منه بخار", svg("#ffd0c2", blob("#ff4f6d") + brows(48, "angry") + eyes(58, 13, 5) + mouth("grit", 78)
    + ''.join(f'<g {anim("puff", 1.4, d)}><circle cx="{x}" cy="24" r="8" fill="#fff"/></g>' for x, d in ((24, 0), (96, .7), (30, .35), (90, 1.05)))))
add("sweat", "متوتر ويعرق", svg("#a8e05f", blob(B) + brows(48, "sad") + eyes(58, 13, 5) + mouth("grit", 78)
    + f'<g {anim("drip", 1.8, ease="ease-in")}><path d="M88 34 q-6 10 0 14 q6 -4 0 -14" fill="#4cc2ff"/></g>'))
add("laugh", "يموت من الضحك", svg("#ffcc33", f'<g {anim("bob", .45)}>' + blob("#ffe066") + f'<path d="M38 56 Q46 48 54 56 M66 56 Q74 48 82 56" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("laugh", 70) + '</g>' + tears()))
add("sleepy", "نعسان", svg("#7fe0ff", blob(B) + f'<path d="M40 58 Q47 62 54 58 M66 58 Q73 62 80 58" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("o", 74)
    + ''.join(f'<g {anim("float", 2.4, d)}><path d="M{x} {y} h8 l-8 9 h8" stroke="{INK}" stroke-width="3" fill="none" stroke-linejoin="round"/></g>' for x, y, d in ((84, 34, 0), (92, 24, .8), (100, 14, 1.6)))))
add("mind_blown", "مخه انفجر", svg("#ff9a3c", blob(B, cy=70) + f'<circle cx="47" cy="64" r="7" fill="#fff" stroke="{INK}" stroke-width="3"/><circle cx="73" cy="64" r="7" fill="#fff" stroke="{INK}" stroke-width="3"/><circle cx="47" cy="64" r="2.5" fill="{INK}"/><circle cx="73" cy="64" r="2.5" fill="{INK}"/>' + mouth("o", 80)
    + f'<g {anim("boom", 1.2, ease="ease-out")}><path d="M60 30 l6 -14 l4 12 l12 -8 l-4 14 l14 0 l-12 8" fill="#fff4dc" stroke="#ff4f6d" stroke-width="3"/><path d="M60 30 l-6 -14 l-4 12 l-12 -8 l4 14 l-14 0 l12 8" fill="#fff4dc" stroke="#ff4f6d" stroke-width="3"/></g>'))
add("facepalm", "يحط يده على وجهه", svg("#ffd98a", blob(B) + f'<path d="M66 58 Q73 62 80 58" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("frown", 78)
    + f'<g {anim("bob", 2)}><ellipse cx="46" cy="54" rx="17" ry="14" fill="#ffd34d" stroke="{INK}" stroke-width="3"/><path d="M34 44 v-10 M41 42 v-12 M48 42 v-12 M55 44 v-10" stroke="{INK}" stroke-width="3" stroke-linecap="round"/></g>'))
add("cool", "رايق بالنظارة", svg("#2ee6a6", blob(B) + f'<path d="M34 52 H86 L82 64 Q74 70 66 64 L62 56 H58 L54 64 Q46 70 38 64 Z" fill="{INK}"/>'
    f'<g {anim("glint", 2.5)}><path d="M44 56 l4 -3 M72 56 l4 -3" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>' + mouth("smirk", 78)))
add("dizzy", "دايخ", svg("#b98cff", blob(B) + ''.join(f'<g {anim("spin", 1.2)} style="transform-origin:{x}px 58px"><path d="M{x} 58 m-7 0 a7 7 0 1 1 7 7 a4 4 0 1 1 -4 -4" stroke="{INK}" stroke-width="3" fill="none"/></g>' for x in (47, 73)) + mouth("wobble", 76)
    + ''.join(f'<g {anim("spin", 3)} style="transform-origin:60px 26px"><circle cx="{60 + 22*math.cos(a)}" cy="{26 + 6*math.sin(a)}" r="3.5" fill="#ffcc33" stroke="{INK}" stroke-width="1.5"/></g>' for a in (0, 2.1, 4.2))))
add("freezing", "متجمد من البرد", svg("#dff3ff", f'<g {anim("shiver", .25)}>' + blob("#9ad8ff") + eyes(58, 13, 5) + mouth("grit", 78) + '</g>'
    f'<path d="M40 30 l3 9 l3 -9 M56 28 l3 11 l3 -11 M72 30 l3 9 l3 -9" fill="#fff" stroke="#7fb8ff" stroke-width="2"/>'
    + ''.join(f'<g {anim("fall", 2.2, d, ease="linear")}><circle cx="{x}" cy="6" r="2.5" fill="#fff" stroke="#9ad8ff"/></g>' for x, d in ((14, 0), (104, .7), (24, 1.4), (96, 1.9)))))
add("melting", "ذايب من الحر", svg("#ffcc33", f'<circle cx="100" cy="18" r="12" fill="#ff9a3c"/><g {anim("melt", 2)} style="transform-origin:60px 104px">'
    f'<path d="M24 66 Q24 30 60 30 Q96 30 96 66 Q96 86 104 100 Q80 108 60 104 Q36 108 16 100 Q24 86 24 66 Z" fill="#ffe066"/>'
    f'<path d="M40 60 Q47 64 54 60 M66 60 Q73 64 80 60" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("wobble", 76) + '</g>'))
add("ghost", "روحه طلعت", svg("#ff8fa3", blob(B, cy=78, r=32) + f'<path d="M44 78 h8 M68 78 h8" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>' + mouth("o", 90)
    + f'<g {anim("rise", 2.4)}><path d="M48 50 Q48 26 60 26 Q72 26 72 50 l-4 -4 l-4 4 l-4 -4 l-4 4 l-4 -4 z" fill="#fff" opacity=".95"/><circle cx="56" cy="38" r="2" fill="{INK}"/><circle cx="64" cy="38" r="2" fill="{INK}"/></g>'))
add("clown", "مهرج", svg("#a8e05f", blob("#fff4dc") + f'<circle cx="34" cy="40" r="9" fill="#ff4f6d"/><circle cx="86" cy="40" r="9" fill="#4cc2ff"/>' + eyes(58, 13, 5)
    + f'<circle cx="60" cy="68" r="7" fill="#ff4f6d" {anim("pop", 1.2)}/>' + mouth("smile", 80)))
add("nerd", "شاطر وفاهم", svg("#7fe0ff", blob(B) + f'<circle cx="47" cy="58" r="9" fill="#fff" stroke="{INK}" stroke-width="3"/><circle cx="73" cy="58" r="9" fill="#fff" stroke="{INK}" stroke-width="3"/><path d="M56 58 H64" stroke="{INK}" stroke-width="3"/>'
    + eyes(58, 13, 3.5) + f'<path d="M50 76 Q60 84 70 76" stroke="{INK}" stroke-width="4" fill="none"/><rect x="55" y="78" width="10" height="7" rx="1" fill="#fff" stroke="{INK}" stroke-width="2"/>'
    + f'<g {anim("up", 1)}><path d="M98 66 V40" stroke="#ffd34d" stroke-width="7" stroke-linecap="round"/><ellipse cx="98" cy="72" rx="9" ry="8" fill="#ffd34d" stroke="{INK}" stroke-width="2.5"/></g>'))
add("zip", "ساكت ما عنده تعليق", svg("#ffd0c2", blob(B) + eyes(56, 13, 5) + f'<path d="M44 78 H76" stroke="{INK}" stroke-width="4"/><path d="M46 74 v8 M52 74 v8 M58 74 v8 M64 74 v8 M70 74 v8" stroke="{INK}" stroke-width="2"/><circle cx="78" cy="78" r="4" fill="#c9c9d6" stroke="{INK}" stroke-width="2"/>'))
add("eyeroll", "يقلب عيونه", svg("#b98cff", blob(B) + f'<circle cx="47" cy="58" r="8" fill="#fff"/><circle cx="73" cy="58" r="8" fill="#fff"/><g {anim("up", 1.6)}><circle cx="47" cy="53" r="4" fill="{INK}"/><circle cx="73" cy="53" r="4" fill="{INK}"/></g>' + mouth("flat", 78)))
add("plead", "يترجى بعيونه", svg("#ff8fa3", blob(B) + brows(46, "sad") + f'<g {anim("pop", 1.6)}><circle cx="47" cy="58" r="10" fill="{INK}"/><circle cx="73" cy="58" r="10" fill="{INK}"/><circle cx="50" cy="54" r="4" fill="#fff"/><circle cx="76" cy="54" r="4" fill="#fff"/><circle cx="44" cy="62" r="2" fill="#fff"/><circle cx="70" cy="62" r="2" fill="#fff"/></g>' + mouth("wobble", 78)))
add("panic_run", "يهرب بسرعة", svg("#a8e05f", f'<path d="M6 50 H26 M2 62 H22 M8 74 H24" stroke="#fff" stroke-width="4" stroke-linecap="round" {anim("look", .4)}/>'
    + f'<g {anim("bob", .25)}>' + blob(B, cx=64, cy=54, r=30) + f'<circle cx="56" cy="50" r="6" fill="#fff" stroke="{INK}" stroke-width="2.5"/><circle cx="74" cy="50" r="6" fill="#fff" stroke="{INK}" stroke-width="2.5"/><circle cx="58" cy="50" r="2.5" fill="{INK}"/><circle cx="76" cy="50" r="2.5" fill="{INK}"/><ellipse cx="66" cy="66" rx="6" ry="7" fill="{INK}"/></g>'
    + f'<g {anim("run", .3)} style="transform-origin:58px 84px"><path d="M58 84 L48 106" stroke="{INK}" stroke-width="5" stroke-linecap="round"/></g><g {anim("run", .3, .15)} style="transform-origin:70px 84px"><path d="M70 84 L80 106" stroke="{INK}" stroke-width="5" stroke-linecap="round"/></g>'))
add("party", "يحتفل", svg("#b98cff", blob(B) + f'<path d="M44 30 L60 2 L76 30 Z" fill="#ff4f6d"/><circle cx="60" cy="3" r="4" fill="#ffcc33"/>' + f'<path d="M40 58 Q47 52 54 58 M66 58 Q73 52 80 58" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("laugh", 72)
    + ''.join(f'<g {anim("fall", 1.8, d, ease="linear")}><rect x="{x}" y="0" width="5" height="9" rx="1" fill="{c}" transform="rotate({r} {x} 0)"/></g>' for x, d, c, r in ((12, 0, "#2ee6a6", 20), (100, .5, "#4cc2ff", -30), (24, 1, "#ff9a3c", 40), (92, 1.3, "#ff4f6d", 10), (8, .8, "#fff", -15)))))
add("thinking", "يفكر بعمق", svg("#7fe0ff", blob(B) + brows(46, "up") + f'<g {anim("look", 4)}>' + eyes(56, 13, 4.5) + '</g>' + mouth("smirk", 76)
    + f'<g transform="translate(70 92)"><ellipse cx="0" cy="0" rx="10" ry="8" fill="#ffd34d" stroke="{INK}" stroke-width="2.5"/><path d="M-4 -6 L-8 -14" stroke="{INK}" stroke-width="3" stroke-linecap="round"/></g>'
    + ''.join(f'<g {anim("float", 2.4, d)}><circle cx="{x}" cy="{y}" r="{r}" fill="#fff"/></g>' for x, y, r, d in ((88, 40, 3, 0), (96, 30, 5, .4), (104, 16, 8, .8)))))
add("bored", "طفشان", svg("#c9c9d6", blob("#ffe9a8") + f'<path d="M40 56 H54 M66 56 H80" stroke="{INK}" stroke-width="4" stroke-linecap="round"/><path d="M40 60 Q47 64 54 60 M66 60 Q73 64 80 60" stroke="{INK}" stroke-width="2" fill="none"/>' + mouth("yawn", 74)))
add("shy", "مستحي", svg("#ffd0c2", blob(B) + f'<path d="M40 58 Q47 52 54 58 M66 58 Q73 52 80 58" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + f'<g {anim("pop", 1.4)}><ellipse cx="38" cy="70" rx="8" ry="5" fill="#ff6b81" opacity=".7"/><ellipse cx="82" cy="70" rx="8" ry="5" fill="#ff6b81" opacity=".7"/></g>' + mouth("smile", 76)
    + f'<path d="M50 96 l6 -6 M70 96 l-6 -6" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>'))
add("money", "عيونه على الفلوس", svg("#2ee6a6", blob(B) + ''.join(f'<g {anim("spin", 2)} style="transform-origin:{x}px 58px"><circle cx="{x}" cy="58" r="9" fill="#ffcc33" stroke="#c98a00" stroke-width="3"/><path d="M{x} 52 v12" stroke="#c98a00" stroke-width="3"/></g>' for x in (46, 74)) + mouth("smile", 78)))
add("villain", "عنده خطة شريرة", svg("#3b2a8f", blob("#b98cff") + brows(48, "angry") + f'<path d="M40 58 Q47 62 54 58 M66 58 Q73 62 80 58" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round"/>' + mouth("smirk", 76)
    + f'<g {anim("shake", .6)}><g transform="translate(50 100)"><ellipse cx="0" cy="0" rx="10" ry="8" fill="#b98cff" stroke="{INK}" stroke-width="2.5"/></g><g transform="translate(70 100)"><ellipse cx="0" cy="0" rx="10" ry="8" fill="#b98cff" stroke="{INK}" stroke-width="2.5"/></g></g>'))
add("drool", "جوعان يسيل لعابه", svg("#ffd98a", blob(B) + f'<g {anim("pop", 1.2)}><path d="M40 52 a7 7 0 0 1 14 0 q0 8 -7 12 q-7 -4 -7 -12 Z M66 52 a7 7 0 0 1 14 0 q0 8 -7 12 q-7 -4 -7 -12 Z" fill="#ff4f6d"/></g>' + mouth("smile", 74)
    + f'<g {anim("drip", 1.5, ease="ease-in")}><path d="M66 82 q-3 6 0 10 q3 -4 0 -10" fill="#9ad8ff"/></g>'
    + f'<path d="M100 40 V96" stroke="#c9c9d6" stroke-width="4"/><path d="M94 40 V54 M100 40 V54 M106 40 V54 M94 54 Q100 60 106 54" stroke="#c9c9d6" stroke-width="3" fill="none"/>'))
add("dead", "مات من الضحك", svg("#ff9a3c", f'<g {anim("tilt", 1.6)}>' + blob(B) + f'<path d="M40 52 l12 12 M52 52 l-12 12 M68 52 l12 12 M80 52 l-12 12" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>' + mouth("tongue", 76) + '</g>'))
add("upside", "مقلوب ومبتسم", svg("#4cc2ff", f'<g {anim("flip", 2.4)} style="transform-origin:60px 64px">' + blob(B) + eyes(58, 13, 5) + mouth("smile", 76) + '</g>'))
add("love_food", "عاشق الأكل", svg("#ff8fa3", blob(B) + f'<g {anim("pop", .9)}><path d="M40 54 q-4 -8 3 -10 q4 0 4 4 q0 -4 4 -4 q7 2 3 10 l-7 7 z M66 54 q-4 -8 3 -10 q4 0 4 4 q0 -4 4 -4 q7 2 3 10 l-7 7 z" fill="#ff4f6d"/></g>' + mouth("laugh", 72)))

OUT.mkdir(parents=True, exist_ok=True)
index = []
for i, (key, label, content) in enumerate(M, 1):
    (OUT / f"{i}.svg").write_text(content, encoding="utf-8")
    index.append({"id": i, "key": key, "label": label})
(OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(M), "cards")
