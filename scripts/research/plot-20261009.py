"""Render small, dependency-free SVGs from the pinned research evidence.

Usage: python scripts/research/plot-20261009.py --llm path/to/results.json --embodied path/to/results.json
No measurements are invented; table values in the articles use the same means.
"""
import argparse,html,json,pathlib,statistics
parser=argparse.ArgumentParser();parser.add_argument('--llm',type=pathlib.Path,required=True);parser.add_argument('--embodied',type=pathlib.Path,required=True);args=parser.parse_args()
q=json.loads(args.llm.read_text());v=json.loads(args.embodied.read_text())
assert len(q)==162 and len(v)==54
root=pathlib.Path(__file__).resolve().parents[2]/'static/img/research/20261009';root.mkdir(parents=True,exist_ok=True)
def plot(filename,title,groups,series,values,unit,max_value):
    colors=['#396859','#67799c','#ac7559'];height=110+len(groups)*100
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="{height}" viewBox="0 0 800 {height}" role="img"><title>{html.escape(title)}</title><rect width="800" height="{height}" fill="#f6f5f0"/><g font-family="system-ui,sans-serif" fill="#263732"><text x="24" y="32" font-size="18">{html.escape(title)}</text>']
    for j,s in enumerate(series):parts.append(f'<rect x="{24+j*245}" y="52" width="12" height="12" fill="{colors[j]}"/><text x="{42+j*245}" y="63" font-size="13">{html.escape(s)}</text>')
    for i,g in enumerate(groups):
        y=107+i*100;parts.append(f'<text x="24" y="{y+12}" font-size="13">{html.escape(g)}</text>')
        for j,value in enumerate(values[i]):
            width=max(.8,value/max_value*400);yy=y+j*22
            parts.append(f'<rect x="250" y="{yy}" width="{width:.2f}" height="14" fill="{colors[j]}"/><text x="{258+width:.2f}" y="{yy+12}" font-size="12">{value:.2f} {unit}</text>')
    parts.append('</g></svg>');(root/filename).write_text(''.join(parts)+'\n',encoding='utf-8')
for lang in ['zh-CN','en','zh-TW']:
    en=lang=='en';tw=lang=='zh-TW';suffix='' if lang=='zh-CN' else '-'+lang
    conditions=['clean','key_channel_outlier','value_token_outlier'];methods=['tensor','row','hybrid']
    values=[[statistics.mean(r['relative_l2'] for r in q if r['condition']==c and r['method']==m and r['target']=='KV')*100 for m in methods] for c in conditions]
    plot('quantization'+suffix+'.svg','KV relative output error · mean of 6 inputs' if en else 'KV 相對輸出誤差 · 每格六份輸入平均' if tw else 'KV 相对输出误差 · 每格六份输入平均', ['Clean','K-channel outlier','V-token outlier'] if en else ['乾淨輸入','K 通道離群','V Token 離群'] if tw else ['干净输入','K 通道离群','V Token 离群'],['Tensor','Token','K channel / V token'] if en else ['全張量','逐 Token','K 通道 / V Token'] if tw else ['全张量','逐 Token','K 通道 / V Token'],values,'%',15)
    groups=[(d,n) for d in [0,.08] for n in [0,.003,.01]]
    values=[[statistics.mean(r['tail_rms_m'] for r in v if r['delay']==d and r['noise']==n and r['mode']==m)*1000 for m in ['difference','ema']] for d,n in groups]
    plot('velocity'+suffix+'.svg','Tail position RMS · mean of 3 seeds' if en else '尾段位置 RMS · 三種子平均' if tw else '尾段位置 RMS · 三种子平均',[f'{d*1000:.0f}ms / σ={n*1000:.0f}mm' for d,n in groups],['Difference','EMA (60ms)'] if en else ['位置差分','EMA (60ms)'],values,'mm',130)
print('Rendered 6 localized evidence charts')
