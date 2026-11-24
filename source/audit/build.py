import json,base64,re,sys
V='vendor/'
css=open('src/app.css').read()
vc=json.load(open('data/curriculum.json'))
def js(p):
    s=open(p).read()
    assert '</script' not in s.lower(), p
    return s
jszip=js(V+'jszip-3.10.1/package/dist/jszip.min.js')
pdf=js(V+'pdfjs-dist-3.11.174/package/legacy/build/pdf.min.js')
worker=base64.b64encode(open(V+'pdfjs-dist-3.11.174/package/legacy/build/pdf.worker.min.js','rb').read()).decode()
conc=js('src/concepts-en.js'); concm=js('src/concepts-ma.js'); app=js('src/app.js').replace('/*MAP*/',js('src/map.js')).replace('/*KW*/',js('src/kw.js')).replace('/*PLUS*/',js('src/plus.js')).replace('/*VLP*/',js('src/vlpref.js')+js('src/prevmaths.js')+js('src/vlp.js'));
html=f'''<!DOCTYPE html>
<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VC Curriculum Audit</title>
<style>{css}</style><style id="brandCss"></style></head>
<body>
<header class="top"><div class="brandrow"><img id="brandLogo" alt="" hidden><h1>VC Curriculum Audit</h1><span class="pill">Victorian Curriculum 2.0</span><span class="sub">Map a sequence: what’s covered, what’s missing</span><span id="brandName" hidden></span><div class="subjsel" id="subj"></div><button id="setBtn" class="noprint">⚙ Settings</button></div><nav class="tabs" id="tabs"></nav></header>
<main><div class="screen" id="view"></div><div id="printArea"></div></main>
<script type="text/plain" id="pdfworker">{worker}</script>
<script>{jszip}</script>
<script>{pdf}</script>
<script>window.VC_DATA={json.dumps(vc,ensure_ascii=False,separators=(',',':'))};</script>
<script>{conc}</script>
<script>{concm}</script>
<script>{app}</script>
</body></html>'''
open('dist/VC Curriculum Audit.html','w').write(html)
print(len(html)//1024,'KB')
