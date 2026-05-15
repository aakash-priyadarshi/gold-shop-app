"""Check for overlaps across all 56 segments and print sorted timeline."""
import os
import re
import subprocess

base = os.path.dirname(os.path.abspath(__file__))
txt = open(os.path.join(base, 'improved.txt'), encoding='utf-8-sig', errors='replace').read()
segs = re.findall(r'\[(\d+):(\d+)\]\s+(.+)', txt)
timestamps = [(int(m)*60+int(s), t) for m,s,t in segs]
seg_dir = os.path.join(base, 'output', 'en', 'segments')
seg_files = sorted(f for f in os.listdir(seg_dir) if f.endswith('.mp3'))
print(f'Segments in improved.txt: {len(timestamps)}')
print(f'MP3 files in segments dir: {len(seg_files)}')

durs = {}
for i, fname in enumerate(seg_files):
    r = subprocess.run(
        ['ffprobe','-v','quiet','-show_entries','format=duration',
         '-of','csv=p=0', os.path.join(seg_dir, fname)],
        capture_output=True, text=True)
    durs[i] = float(r.stdout.strip())

sorted_segs = sorted(enumerate(timestamps), key=lambda x: x[1][0])
print('\nChecking for overlaps...')
overlaps = 0
for idx, (orig_i, (start, text)) in enumerate(sorted_segs):
    end = start + durs[orig_i]
    if idx + 1 < len(sorted_segs):
        next_start = sorted_segs[idx + 1][1][0]
        if end > next_start + 0.1:
            print(f'  OVERLAP: seg{orig_i+1} [{int(start//60):02d}:{int(start%60):02d}] '
                  f'ends {end:.1f}s, next starts {next_start}s')
            overlaps += 1
print(f'Total overlaps: {overlaps}\n')
print('Timeline around the changed area:')
for orig_i, (start, text) in sorted_segs:
    if 1140 <= start <= 1430:  # [19:00] to [23:50]
        print(f'  seg{orig_i+1:02d} [{int(start//60):02d}:{int(start%60):02d}] '
              f'+{durs[orig_i]:.1f}s  {text[:60]}')
