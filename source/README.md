# Source

Built pages: `index.html` (VC Curriculum Audit) and `map-creator/index.html` (Curriculum Area Map Creator).

- `audit/`: `build.py` splices `src/app.js` with `map.js` (/\*MAP\*/), `kw.js` (/\*KW\*/), `plus.js` (/\*PLUS\*/) and `vlp.js` (/\*VLP\*/); curriculum data from `build_vcaa.py` (VCAA CSV export, 20-10-2026). `brief/`: How to use guide, Quick Brief and PL deck builders.
- `map-creator/`: `build.py` joins `src/` with assets (JSZip, pdf.js, the curriculum data and `tpl-<subject>.xlsx` templates). `tools/mk_tpl.py` makes a template for any learning area from the Mathematics template; `mk_en_tpl.py` the English one.
- `site/build_site.py "<audit.html>" "<creator.html>" <this repo>` writes both pages, the service worker and the header links.

Large assets (curriculum data, templates, vendor libraries) are not copied here; they are inside the built pages.
