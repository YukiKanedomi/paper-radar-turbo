#!/usr/bin/env bash
# 毎日1配信の自動実行（ローカル・タスクスケジューラから起動）。
# fresh な headless Claude Code を Opus で起動し、/collect 自動モードを実行する。
# ログは scripts/logs/ に日付別で残す。
set -u

REPO="/c/Users/kanedomi/Desktop/Claude/paper-radar-turbo"
cd "$REPO" || exit 1

mkdir -p scripts/logs
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="scripts/logs/daily-$STAMP.log"

{
  echo "=== paper-radar-turbo daily collect: $STAMP (JST) ==="
  # 最新を取り込む（GitHub Actions/手動更新との競合回避。ff-only で安全に）
  git pull --ff-only origin main || echo "[warn] git pull skipped/failed"

  PROMPT="$(cat scripts/daily-collect-prompt.txt)"

  # 無人実行：本体は Sonnet（軽い・利用枠に優しい）。全ツール自動承認。
  # §0 の忠実性チェックだけ Opus（faithfulness-check エージェント側で model: opus 固定）。
  claude -p "$PROMPT" \
    --model sonnet \
    --dangerously-skip-permissions

  echo "=== done: $(date +%Y-%m-%d\ %H:%M:%S) ==="
} >>"$LOG" 2>&1
