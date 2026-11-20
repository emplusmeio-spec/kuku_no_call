# たしひきラボ

九九ラボと同じ流れ（スタート → テンキー → 10問セット → メダル → レベルアップ チャレンジ）で、
たし算・ひき算を 30段階で 練習するアプリ。いまは Lv1〜13（第1部 ばらの せかい：20まで）。
たし算・ひき算の 見せ方は、さんすうドット トレーニングと 同じ 横ながの 10の わく（5×2）。

公開URL：https://emplusmeio-spec.github.io/kuku_no_call/tashihiki/ （先生画面は `?teacher`、子どもは 先生画面で つくる 招待URL）

- 九九ラボと同じ Firebase プロジェクト（kuku-lab）を使い、データは `tashihiki_users` / `tashihiki_invites` / `tashihiki_board` に入る。
- 使う前に Firestore のルールへ `firestore-tashihiki.rules` の 中身を 追加すること。
- `#debug` を つけて ひらくと、ログインなしで どの レベルも ためせる。
