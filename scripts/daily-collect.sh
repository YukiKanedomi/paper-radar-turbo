#!/usr/bin/env bash
# 毎日1配信の自動実行（ローカル・タスクスケジューラから起動）。
# fresh な headless Claude Code を Sonnet で起動し、/collect 自動モードを実行する。
# （§0 の忠実性チェックだけ Opus。下の --model と一致させること）
# ログは scripts/logs/ に日付別で残す。
# 終了コード（2026-11-07）: 0=正常 / 2=認証失敗（再実行しない） / 3=claude 非0終了（10分後に1回だけ再実行しても失敗）。
#   非0 のときはログに [FAIL] 行、bridge/knowledge/job-alerts.md に1行追記し、このスクリプトも非0で終わる（タスク結果に出る）。
set -u

REPO="/c/Users/kanedomi/Desktop/Claude/paper-radar-turbo"
TASK="PaperRadarTurboDaily"
ALERTS="/c/Users/kanedomi/Desktop/Claude/bridge/knowledge/job-alerts.md"
AUTH_RE='Failed to authenticate|OAuth session expired|not logged in'
cd "$REPO" || exit 1
# Long-lived token for unattended jobs (claude setup-token). Kept outside repos; set for this job process only.
TOKEN_FILE="$HOME/.claude-jobs/oauth-token.txt"
[ -f "$TOKEN_FILE" ] && export CLAUDE_CODE_OAUTH_TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"

mkdir -p scripts/logs
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="scripts/logs/daily-$STAMP.log"
OUT="scripts/logs/.attempt-$STAMP.out"

# 無人実行：本体は Sonnet（軽い・利用枠に優しい）。全ツール自動承認。
# §0 の忠実性チェックだけ Opus（faithfulness-check エージェント側で model: opus 固定）。
# --disallowedTools Monitor は 2026-10-15: 期限切れ通知が最終報告を上書きしたため（10/07, 10/09）
run_claude() {
  claude -p "$PROMPT" \
    --model sonnet \
    --dangerously-skip-permissions \
    --disallowedTools Monitor
}

# 1回実行して 0/2/3 を返す。出力はログへそのまま流し、判定用に OUT にも写す。理由は REASON に入れる。
REASON=""
attempt() {
  run_claude 2>&1 | tee "$OUT"
  local rc=${PIPESTATUS[0]}
  local auth
  auth="$(grep -Eo "$AUTH_RE" "$OUT" | head -1)"
  local last
  last="$(grep -v '^[[:space:]]*$' "$OUT" | tail -1 | cut -c1-120)"
  rm -f "$OUT"
  if [ -n "$auth" ]; then REASON="認証失敗（$auth）・claude exit=$rc"; return 2; fi
  if [ "$rc" -ne 0 ]; then REASON="claude exit=$rc: ${last:-出力なし}"; return 3; fi
  return 0
}

alert() {
  # 末尾に改行が無ければ補ってから1行追記
  if [ -s "$ALERTS" ] && [ -n "$(tail -c1 "$ALERTS")" ]; then printf '\n' >>"$ALERTS"; fi
  printf -- '- %s | %s | exit=%s | %s\n' "$(date '+%Y-%m-%d %H:%M')" "$TASK" "$1" "$2" >>"$ALERTS"
}

RC=0
{
  echo "=== paper-radar-turbo daily collect: $STAMP (JST) ==="
  # 最新を取り込む（GitHub Actions/手動更新との競合回避。ff-only で安全に）
  git pull --ff-only origin main || echo "[warn] git pull skipped/failed"

  PROMPT="$(cat scripts/daily-collect-prompt.txt)"

  attempt; RC=$?
  if [ "$RC" -eq 3 ]; then
    echo "[retry] $REASON → 10分後に1回だけ再実行"
    sleep 600
    attempt; RC=$?
    [ "$RC" -eq 3 ] && REASON="再実行も失敗: $REASON"
  fi
  if [ "$RC" -ne 0 ]; then
    echo "[FAIL] $(date '+%Y-%m-%d %H:%M:%S') exit=$RC $REASON"
    alert "$RC" "$REASON"
  fi

  echo "=== done: $(date +%Y-%m-%d\ %H:%M:%S) (exit=$RC) ==="
} >>"$LOG" 2>&1
exit "$RC"
