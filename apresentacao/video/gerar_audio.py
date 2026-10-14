import asyncio, json, sys, subprocess, re
import edge_tts, imageio_ffmpeg
roteiro, saida = sys.argv[1], sys.argv[2]
FF = imageio_ffmpeg.get_ffmpeg_exe()
async def main():
    cenas = json.load(open(roteiro, encoding='utf-8'))
    duracoes = {}
    for c in cenas:
        mp3 = f"{saida}/{c['id']}.mp3"
        await edge_tts.Communicate(c['texto'], 'pt-BR-FranciscaNeural', rate='+4%').save(mp3)
        out = subprocess.run([FF, '-i', mp3], capture_output=True, text=True).stderr
        h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', out).groups()
        duracoes[c['id']] = round(int(h) * 3600 + int(m) * 60 + float(s), 2)
        print(c['id'], duracoes[c['id']])
    json.dump(duracoes, open(f"{saida}/duracoes.json", 'w'), indent=1)
    print('total', round(sum(duracoes.values()), 1))
asyncio.run(main())
