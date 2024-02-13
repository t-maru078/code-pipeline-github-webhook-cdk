# github-app-local

GitHub の Web Console で GitHub App を作成後、Installation ID を調べる等、GitHub の API を叩く必要がある場合に Local PC 上から API を実行するための tool 郡です

## ツール一覧

| ファイル名                | 説明                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| installation-id-search.ts | GitHub App の Installation ID を調べるために使用                                                                         |
| update-run-to-complete    | 動作実験などの際の check が queued, started のなどの状態で残ってしまった場合に強制的に complete 状態に変更するために使用 |

## 設定等

`env.template` をコピーして `.env.local` を作成して必要なパラメータを設定してください

| Parameter name | Description                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------ |
| GITHUB_APP_ID  | 作成した GitHub App の ID。Developer settings から GitHub App の設定を表示すると表示されている。 |
| GITHUB_OWNER   | GitHub の user name または Organization name                                                     |
| GITHUB_REPO    | Pipeline のワークフローを実行するソースとなる GitHub リポジトリ名                                |
| TARGET_RUN_ID  | 強制的に complete 状態に変更する Check の Run ID。Installation ID を取得するだけの場合は不要。   |
