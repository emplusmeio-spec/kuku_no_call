# さんすう タイルトレーニング

遠山啓（水道方式）ふうのタイルで、5・10の合成分解と たしざん（くりあがり）を練習するアプリ。
公開URL：https://emplusmeio-spec.github.io/kuku_no_call/tile/ （先生画面は `?teacher`）

- 九九ラボと同じ Firebase プロジェクト（kuku-lab）を使い、データは `tile_users` / `tile_invites` / `tile_board` に入る（九九ラボ・よむよむとは別）。
- 使う前に Firestore のルールへ `tile_` の分を追加すること（`emplusmeio-spec/el_convert_html` の `sansu_tile/docs/firestore-tile.rules`）。
- 元のソースと説明は `emplusmeio-spec/el_convert_html` の `sansu_tile/` にある。ここはその公開用コピー。
