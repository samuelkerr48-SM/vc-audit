# Builds "Curriculum Area Map Creator.html" from src/ and assets/ (run from this folder).
# src: shell.html (with <!--SCRIPTS-->), vc_borrow.js, engine.js, ui.js, vcdata.js, conc-en.js, conc-ma.js
# assets: pdfworker.b64, jszip.js, pdf.js, tpl-<subject>.xlsx (one per learning area)
import base64,os,glob,json
R='src/';A='assets/'
rd=lambda p:open(p,encoding='utf8').read()
b64=lambda p:base64.b64encode(open(p,'rb').read()).decode()
app='(function(){\n"use strict";\nconst VC_DATA=window.VC_DATA;\n'+rd(R+'vc_borrow.js')+rd(R+'engine.js')+rd(R+'ui.js')+'})();'
tpls=''.join('<script type="text/plain" id="tpl-'+os.path.basename(p)[4:-5]+'">'+b64(p)+'</script>\n' for p in sorted(glob.glob(A+'tpl-*.xlsx'),key=lambda p:(0 if 'maths' in p else 1 if 'english' in p else 2,p)))
scripts=('<script type="text/plain" id="pdfworker">'+rd(A+'pdfworker.b64')+'</script>\n'+tpls+
 '<script>'+rd(A+'jszip.js')+'</script>\n<script>'+rd(A+'pdf.js')+'</script>\n<script>'+rd(R+'vcdata.js')+'</script>\n<script>'+rd(R+'conc-en.js')+'</script>\n<script>'+rd(R+'conc-ma.js')+'</script>\n<script>'+app+'</script>')
out=rd(R+'shell.html').replace('<!--SCRIPTS-->',scripts)
os.makedirs('dist',exist_ok=True);p='dist/Curriculum Area Map Creator.html';open(p,'w',encoding='utf8').write(out);print(p,len(out)//1024,'KB')
