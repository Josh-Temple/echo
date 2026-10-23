#!/usr/bin/env python3
"""Export the current 3D study as one offline HTML. No build dependencies."""
import base64
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / 'ECHO_3D_Preview.html'
modules = [
    'vendor/three-0.169.0.module.min.js', 'vendor/Reflector.js',
    'vendor/RoomEnvironment.js', 'echo3d/simulation.js', 'echo3d/audio.js',
    'echo3d/character.js', 'echo3d/environment.js', 'echo3d/app.js',
]
source = {name: (root / name).read_text() for name in modules}
css = (root / 'echo3d/style.css').read_text().replace(
    '../vendor/echo-ui-jp.ttf',
    'data:font/ttf;base64,' + base64.b64encode((root / 'vendor/echo-ui-jp.ttf').read_bytes()).decode(),
)
loader = r"""
const sources = SOURCES;
const urls = new Map();
function resolve(name, request) {
  const parts = name.split('/'); parts.pop();
  for (const part of request.split('/')) {
    if (part === '..') parts.pop(); else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}
try {
  for (const [name, source] of Object.entries(sources)) {
    const code = source.replace(/from\s*(['"])(\.{1,2}\/[^'"]+)\1/g, (_, quote, request) => {
      const target = urls.get(resolve(name, request));
      if (!target) throw new Error('Missing module: ' + request);
      return 'from ' + JSON.stringify(target);
    });
    urls.set(name, URL.createObjectURL(new Blob([code], {type: 'text/javascript'})));
  }
  await import(urls.get('echo3d/app.js'));
} catch (error) {
  console.error(error);
  document.querySelector('#intro').hidden = true;
  document.querySelector('#fallback').hidden = false;
  document.querySelector('#error-text').textContent = '読み込みに失敗しました。WebGL対応のブラウザで開いてください。';
  document.querySelector('#reload').onclick = () => location.reload();
}
""".replace('SOURCES', json.dumps(source, ensure_ascii=False).replace('</', '<\\/'))
html = (root / 'webgl-study.html').read_text()
html = html.replace('<link rel="stylesheet" href="echo3d/style.css">', '<style>' + css + '</style>')
html = html.replace('<script type="module" src="echo3d/app.js"></script>', '<script type="module">' + loader + '</script>')
html = html.replace('href="index.html"', 'href="https://josh-temple.github.io/echo/"')
licenses = '\n\n'.join((root / ('vendor/' + name)).read_text() for name in ['THREE-LICENSE.txt', 'NOTO-LICENSE.txt'])
html = html.replace('</body>', '<script type="text/plain" id="third-party-licenses">' + licenses.replace('</', '<\\/') + '</script></body>')
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(html)
print(f'{output} ({output.stat().st_size:,} bytes)')
