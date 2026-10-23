# ECHO

## 3D版 — 残響 / 貯水槽

`webgl-study.html` は、低彩度の工業施設を描いた横移動型3D試作です。
透視投影、霧、影、水面反射、立体人物の歩行、2か所の足場越え、扉と短い終幕を実装しています。
素材はオリジナルの手続き生成。参考作品の素材は使用していません。

公開版: https://josh-temple.github.io/echo/webgl-study.html

```sh
python3 -m http.server 8000
# http://localhost:8000/webgl-study.html
```

PC: A/D・←/→で移動、Spaceで跳ぶ、Eで調べる、Escで一時停止。
スマートフォン: 画面のタッチボタン。画質と環境音は一時停止メニューで変更できます。
3D版の依存ファイルは同梱し、CDN接続は不要です。ファイルを直接開く場合は
`python3 scripts/build-standalone.py /tmp/ECHO_3D_Preview.html` で単体版を書き出してください。
実装・検証範囲は [docs/3d-visual-polish.md](docs/3d-visual-polish.md) に記載しています。

## 従来の2D版

低彩度の工業施設を歩く、ブラウザで動作する横スクロール2D試作品です。

## プレイ

- `index.html` をブラウザで開く（単一ファイルで動作、依存ライブラリ・ビルド不要）
- Android: ゲーム下のタッチボタンを使う。「全画面」で横向き表示を試せます
- PC: `A/D` または `←/→` 移動、`Space` ジャンプ、`E` 扉を調べる

2D版のURLは `https://josh-temple.github.io/echo/` です。

## 試作の方針

- 成人の小さめの頭・短い首・長い脚、重いハンドガンのシルエット
- オリジナルの工業施設背景画（HTML内に埋め込み）、霧、遠景のパララックス、控えめな赤い警告灯
- 地上で加速・減速、ジャンプ後は横速度を固定して空中制御しない
- 空中のキャラクターに追随しない地面投影の影
- BGMなし。Web Audio APIで生成する足音・着地音・短い反響
- 軽量なCanvas 2D描画。画像・音声の外部ネットワーク依存なし。ゲームはHTML 1ファイルで完結

## 開発・動作確認

```sh
python3 -m http.server 8000
# http://localhost:8000/
```

静的なHTMLだけで動作します。ビルド・パッケージインストール・GitHub ActionsのCIは不要です。

現状は**雰囲気と移動感覚の試作**です。人体アニメーションは簡略化した関節計算で、実人体の物理シミュレーションではありません。足音は電子合成であり、素材録音ではありません。音の再生はブラウザのユーザー操作後に開始されます。

### GitHub Pagesの一度きりの設定

リポジトリの **Settings → Pages → Build and deployment** で Source を **Deploy from a branch** にし、Branch を **main / (root)** にして Save。Actions workflowファイルを追加する必要はありません。サイトの公開完了を確認してからURLを共有してください。

## 検証範囲

- PC Chromium: 画面描画・左右移動・踏み切り・空中逆方向入力・着地・足場移動を確認
- 390px相当の画面: タッチボタンによる移動と配置を確認
- Android実機: 未確認

このプロジェクトは独立したオリジナル試作で、参考作品の素材やキャラクターは使用していません。
