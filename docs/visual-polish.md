# ECHO — ビジュアル変更と検証記録

作業日: 2026-10-23 JST

起点: `88debd4062ce4f5cd1be4e1e7ef7b81dfee6e536` / `Josh-Temple/echo`

## 目的と範囲

探索・謎解きを主役とするSFミステリーに向け、既存の短い横スクロールシーンを視覚面から仕上げる。巨大な施設と小さな人間の対比、低彩度の素材、目印になる控えめな照明を中心に構成した。

この変更は現在の探索シーンの改良であり、長編ストーリーや謎解き全体の完成を意味しない。

## 実装

- 新規の横長背景画をWebPとしてHTMLに内蔵。遠景、中景、足場、手前の構造物で視差を付けた。
- 足場の塗装、汚れ、固定具、反射、切れ目の縁を描き分け、画面を暗くしても通行可能な場所を読めるよう調整。
- 衣服と四肢に陰影と微細な質感を加えた。立ち止まった際の膝の曲がりを抑え、身体の上下動と足の接地位置を分けた。
- 赤い隔壁を立体的に描画し、近づいたときだけ操作を示す。
- 開始画面、設定、一時停止、再開、終了画面を整理。スマートフォンの縦向きでは背景の切り取り位置を変え、施設と空間を同時に見せる。
- 日本語UIのフォントとタイトル用の細いウェイトを内蔵。描画品質、明るさ、音、環境の動きを設定できる。
- 高解像度Canvasと自動軽量化。模様・霧・粒子配置は再利用し、毎フレームの生成を抑える。

従来の加速度、重力、踏み切り後に空中制御しない移動、3か所の切れ目、赤い扉への到達を維持した。

## 確認方法と範囲

PlaywrightからChromiumを実行し、HTMLをローカルHTTPで配信した。主要操作はキーボードとブラウザのタッチ入力で実施した。開始位置の初期化を除き、進行状態を直接書き換えて到達結果を作っていない。画面撮影中だけアニメーションフレームを止め、静止した実画面を取得した。

確認画面: PC 1440 × 960、モバイル縦 390 × 844 / 360 × 800、横 844 × 390。モバイルはChromiumのエミュレーションで、Android実機ではない。

26項目の操作確認がすべて通過し、JavaScriptエラーと外部への実行時通信は0件。確認項目と結果は [visual-qa-results.json](visual-qa-results.json) に記録した。

| 項目 | 結果 | 確認範囲 |
| --- | --- | --- |
| 開始・探索・扉・設定・終了画面 | PASS | 実際のブラウザ画面を撮影して確認 |
| 日本語の表示 | PASS | 見出し、設定の選択肢、タイトル下部の欠字を修正して再確認 |
| 縦・横画面とタッチ入力 | PASS | 上記3サイズのモバイルエミュレーション |
| ジャンプ、3か所の切れ目、扉、再開 | PASS | 実際のキー・タッチ入力で操作 |
| Android実機の性能・音・全画面 | UNVERIFIED | 実機テストは未実施 |

未確認: Android実機の持続的なフレームレート、実機での音声品質、各端末の全画面・画面回転APIへの対応。描画時間の短いサンプルを実機性能の証明には用いない。

## 素材の作成

背景は組み込みの `image_gen` で新規作成し、ゲーム向けにWebPに変換した。画像の描き直しは変換時に行っていない。最終的な参照先は `index.html` 内の `scene.src` で、外部画像へのリンクはない。人物、照明、足場と環境効果はCanvasによる描画。

生成プロンプト:

> Use case: stylized-concept. Asset type: a production environment background panorama for ECHO, a cinematic side-scrolling 2D science-fiction mystery exploration game. Create ONE continuous extremely wide 3:1 panoramic image, ideally 3072x1024. Absolutely no panels, no text, no logo, no UI, no people. An immense abandoned concrete industrial research complex, seen strictly from the side as a theatrical game environment, modest depth perspective, camera level. Weathered brutalist architecture, monumental vertical shafts disappearing into a foggy grey sky, overhead steel catwalks and suspended cable conduits, deep atmospheric industrial courtyards. LEFT THIRD: massive dark wall edge with service pipes and an elevated enclosed window, next to a beautifully lit open void. MIDDLE THIRD: an enormous distant cylindrical chamber and a few transverse narrow walkways suspended in dense pale mist; detailed believable industrial scale. RIGHT THIRD: layered old concrete facility with many dark vertical openings and one very small restrained muted red warning beacon. Foreground floor is NOT drawn: leave the entire lowest 20 percent as open dark atmospheric empty space / mist over an abyss, so a separately rendered horizontal catwalk can be placed in front. NO bottom foreground rails or chunky objects, no people painted into the image. Materials: damp chipped concrete, oxidized steel, peeling mineral deposits, fine grime with sophisticated detail, tactile but unified painterly photorealism, premium cinematic videogame environment matte painting, masterful shape composition with broad quiet readable forms, no visual noise or random debris. Lighting: pale overcast light from upper right, volumetric mist separating 5 depth layers, softly glowing atmospheric voids, strong negative space, deep coal shadows retaining detail. Colors: very low saturation graphite, smoky cool grey, muted sage grey, faint warm ochre highlights, tiny red accent. Moody and unsettling, beautiful restrained lighting, not neon cyberpunk, no high saturation, no lens flare, no artificial bokeh, no watermark. The image should function as a coherent horizontal background when cropped to 16:9 and scrolled. Highest environment art craftsmanship.

実際の生成画像は2172 × 724。元の生成画像は別途保存され、ゲームには画質88のWebPを含めた。

フォント: Google FontsのNoto Sans JP。本文400、タイトル200の静的サブセットをWOFF形式で内蔵。ライセンスは `OFL-NotoSansJP.txt` とHTML内に同梱。
