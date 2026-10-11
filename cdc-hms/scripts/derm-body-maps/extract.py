import numpy as np, json, sys
from PIL import Image
from scipy import ndimage

S2 = 2.0  # render scale (1620 px for 810 units)

def mask_for(name):
    a = np.asarray(Image.open(f'p_{name}.png').convert('RGB')).astype(int)
    near_white = (a.min(axis=2) >= 238)
    if name != 'child':
        return ~near_white
    # child: bodysuit is near-white too — outside = near-white connected to the border
    lab, n = ndimage.label(near_white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    outside = np.isin(lab, list(border))
    body = ~outside
    body = ndimage.binary_opening(body, iterations=2)
    body = ndimage.binary_fill_holes(body)
    return body

def runs(row):
    d = np.diff(np.concatenate([[0], row.astype(int), [0]]))
    s = np.where(d == 1)[0]; e = np.where(d == -1)[0]
    return [(int(a), int(b)) for a, b in zip(s, e) if b - a >= 3]

CFG = {'child': dict(hand=0.27, knee=0.43, ankle=0.88), 'adult': dict(hand=0.24, knee=0.42, ankle=0.90)}

def analyse(m, view, kind):
    cfg = CFG['child' if kind == 'child' else 'adult']
    H, W = m.shape
    rows = [runs(m[y]) for y in range(H)]
    ys = [y for y in range(H) if rows[y]]
    T, B = ys[0], ys[-1]; Ht = B - T
    width = np.array([ (r[-1][1]-r[0][0]) if r else 0 for r in rows])
    # neck: narrowest single-run row in the upper part (below the head)
    lo, hi = T + int(0.08*Ht), T + int(0.26*Ht)
    C = lo + int(np.argmin([width[y] if len(rows[y]) == 1 else 9999 for y in range(lo, hi)]))
    neckW = width[C]
    # shoulder: first row below the neck reaching 2.6× the neck width
    Sh = next(y for y in range(C, B) if width[y] >= 2.6*neckW)
    # axilla: first row below the shoulder with 3+ runs (arms separate)
    A = next(y for y in range(Sh, B) if len(rows[y]) >= 3)
    r3 = rows[A]
    armL, torso, armR = r3[0], None, r3[-1]
    cands = [r for r in r3[1:-1]]
    torso = (cands[0][0], cands[-1][1])
    cx = (torso[0] + torso[1]) / 2
    gapL = (armL[1] + torso[0]) / 2; gapR = (torso[1] + armR[0]) / 2
    # track arms down: pick the run overlapping the previous arm run
    arm = {'L': [None]*H, 'R': [None]*H}
    prev = {'L': armL, 'R': armR}
    end = {'L': A, 'R': A}
    for side in 'LR':
        p = prev[side]
        for y in range(A, B+1):
            rr = rows[y]
            pw = p[1] - p[0]
            # runs touching the arm's last extent, but not a trunk/leg run that
            # merely passes through it (much wider than the arm)
            ov = [r for r in rr if r[0] <= p[1]+4 and r[1] >= p[0]-4 and (r[1]-r[0]) <= 1.8*pw + 12]
            if not ov: break
            # fingers: several runs — take them all; an arm never jumps sideways,
            # so clamp to the previous extent (keeps a nearby thigh out)
            lo_, hi_ = min(r[0] for r in ov), max(r[1] for r in ov)
            r = (max(lo_, p[0]-6), min(hi_, p[1]+6))
            if r[1] - r[0] < 3: break
            arm[side][y] = r; p = r; end[side] = y
    # crotch: first row (below axilla + 15%) where the centre column is empty
    K = next(y for y in range(A + int(0.15*Ht), B) if not m[y, int(cx)] and
             any(r[1] < cx for r in rows[y] if r != arm['L'][y]) and any(r[0] > cx for r in rows[y] if r != arm['R'][y]))
    E = {s: end[s] for s in 'LR'}
    return dict(T=T, B=B, C=C, S=Sh, A=A, K=K, cx=cx, gapL=gapL, gapR=gapR, E=E, rows=rows, arm=arm, cfg=cfg)

def label(m, view, kind, g):
    H, W = m.shape
    T,B,C,Sh,A,K,cx = g['T'],g['B'],g['C'],g['S'],g['A'],g['K'],g['cx']
    cfg = g['cfg']; rows = g['rows']; arm = g['arm']
    out = {}  # id -> list of (y, x0, x1)
    def put(i, y, x0, x1):
        if x1 > x0: out.setdefault(i, []).append((y, x0, x1))
    vl = 'r' if view == 'front' else 'l'   # patient side drawn on the viewer's left
    vr = 'l' if view == 'front' else 'r'
    legLen = B - K
    knee = K + cfg['knee']*legLen; ankle = K + cfg['ankle']*legLen
    for y in range(T, B+1):
        rr = rows[y]
        if not rr: continue
        # ---- head
        if y < C:
            x0, x1 = rr[0][0], rr[-1][1]
            if view == 'back':
                put('b-scalp', y, x0, x1)
            else:
                if y < T + 0.38*(C-T): put('f-forehead', y, x0, x1)
                else:
                    w = x1 - x0; a = x0 + 0.36*w; b = x0 + 0.64*w
                    put('f-cheek-'+vl, y, x0, a); put('f-midface', y, a, b); put('f-cheek-'+vr, y, b, x1)
            continue
        if y < Sh:
            x0, x1 = rr[0][0], rr[-1][1]
            put(('f' if view=='front' else 'b')+'-neck', y, x0, x1); continue
        # ---- arms (side) and trunk/legs (centre)
        segs = []
        for side, s in (('L', vl), ('R', vr)):
            a_ = arm[side][y] if y >= A else None
            if y < A:
                # shoulder: outside the axillary line
                if side == 'L': a_ = (rr[0][0], int(g['gapL'])) if rr[0][0] < g['gapL'] else None
                else: a_ = (int(g['gapR']), rr[-1][1]) if rr[-1][1] > g['gapR'] else None
            if a_:
                segs.append(a_)
                armTop = Sh; armEnd = g['E'][side]; L = armEnd - armTop
                elbow = armTop + 0.42*L; wrist = armEnd - cfg['hand']*L
                if view == 'front':
                    part = 'uarm' if y < elbow else ('forearm' if y < wrist else 'hand')
                    put(f'f-{part}-{s}', y, *a_)
                else:
                    if y < elbow - 0.035*L: part = 'uarm'
                    elif y < elbow + 0.035*L: part = 'elbow'
                    elif y < wrist: part = 'farm'
                    else: part = 'hand'
                    put(f'b-{part}-{s}', y, *a_)
        # centre = everything not taken by the arms
        cen = []
        for r in rr:
            x0, x1 = r
            for a_ in segs:
                if a_[0] <= x0 and x1 <= a_[1]: x0 = x1  # fully arm
                elif a_[0] <= x0 < a_[1]: x0 = a_[1]
                elif a_[0] < x1 <= a_[1]: x1 = a_[0]
            if x1 - x0 > 2: cen.append((x0, x1))
        if not cen: continue
        x0, x1 = cen[0][0], cen[-1][1]
        if y < K:
            if view == 'front':
                chestEnd = A + 0.30*(K-A); groinTop = K - 0.14*(K-A)
                if y < chestEnd:
                    put('f-chest-'+vl, y, x0, cx); put('f-chest-'+vr, y, cx, x1)
                elif y < groinTop:
                    put('f-abdo', y, x0, x1)
                else:
                    hw = 0.25*(x1-x0)
                    put('f-thigh-'+vl, y, x0, cx-hw); put('f-groin', y, cx-hw, cx+hw); put('f-thigh-'+vr, y, cx+hw, x1)
            else:
                ubEnd = A + 0.45*(K-A); buttTop = K - 0.30*(K-A)
                if y < ubEnd: put('b-uback-'+vl, y, x0, cx); put('b-uback-'+vr, y, cx, x1)
                elif y < buttTop: put('b-lback', y, x0, x1)
                else: put('b-butt-'+vl, y, x0, cx); put('b-butt-'+vr, y, cx, x1)
            continue
        # legs: split at the centre line
        left = [c for c in cen if (c[0]+c[1])/2 < cx]; right = [c for c in cen if (c[0]+c[1])/2 >= cx]
        for grp, s in ((left, vl), (right, vr)):
            if not grp: continue
            a0, a1 = grp[0][0], grp[-1][1]
            if view == 'front':
                if y < knee - 0.05*legLen: part = 'thigh'
                elif y < knee + 0.05*legLen: part = 'knee'
                elif y < ankle: part = 'leg'
                else: part = 'foot'
                put(f'f-{part}-{s}', y, a0, a1)
            else:
                if y < K + 0.07*legLen: part = 'butt'
                elif y < knee - 0.02*legLen: part = 'thigh'
                elif y < ankle: part = 'calf'
                else: part = 'sole'
                put(f'b-{part}-{s}', y, a0, a1)
    return out

def rdp(pts, eps):
    if len(pts) < 3: return pts
    import math
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]; d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]

def poly(segs, step=2):
    segs = sorted(segs)
    # one span per row (min..max)
    byy = {}
    for y, a, b in segs:
        p = byy.get(y); byy[y] = (min(a, p[0]), max(b, p[1])) if p else (a, b)
    ys = sorted(byy)
    pick = ys[::step]
    if pick[-1] != ys[-1]: pick.append(ys[-1])
    L = [(byy[y][0], y) for y in pick]; R = [(byy[y][1], y) for y in reversed(pick)]
    top = ys[0]; bot = ys[-1] + 1
    pts = [(L[0][0], top)] + L + [(L[-1][0], bot), (R[0][0], bot)] + R + [(R[-1][0], top)]
    pts = rdp(pts, 1.2 * S2)
    f = lambda v: round(v / S2) if abs(v / S2 - round(v / S2)) < 0.25 else round(v / S2, 1)
    d = 'M' + 'L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z'
    # centroid (area weighted)
    area = sum(b-a for _, a, b in segs); cxm = sum((a+b)/2*(b-a) for _, a, b in segs)/area; cym = sum(y*(b-a) for y, a, b in segs)/area
    return d, [f(cxm), f(cym)]

result = {}
for name, kind in (('a64', 'female'), ('a65', 'male'), ('child', 'child')):
    m = mask_for(name)
    cols = np.where(m.any(axis=0))[0]
    # two figures: split at the widest empty gap between them
    gaps = np.where(np.diff(cols) > 1)[0]
    gi = gaps[np.argmax(np.diff(cols)[gaps])]
    halves = {'front': (cols[0], cols[gi]+1), 'back': (cols[gi+1], cols[-1]+1)}
    result[kind] = {}
    for view, (c0, c1) in halves.items():
        sub = np.zeros_like(m); pad = 10
        sub[:, max(0,c0-pad):c1+pad] = m[:, max(0,c0-pad):c1+pad]
        g = analyse(sub, view, kind)
        lab = label(sub, view, kind, g)
        ys = np.where(sub.any(axis=1))[0]
        box = [round((c0-24)/S2,1), round((ys[0]-24)/S2,1), round((c1-c0+48)/S2,1), round((ys[-1]-ys[0]+48)/S2,1)]
        regs = {}
        for i, segs in lab.items():
            d, c = poly(segs)
            regs[i] = {'d': d, 'c': [round(c[0]), round(c[1])]}
        result[kind][view] = {'box': box, 'regions': regs,
            'landmarks': {k: round(g[k]/S2,1) for k in ('T','B','C','S','A','K')}}
        print(kind, view, 'regions', len(regs), {k: round(g[k]/S2) for k in ('T','C','S','A','K','B')}, 'E', {k: round(v/S2) for k,v in g['E'].items()})
json.dump(result, open('bm/maps.json', 'w'))
