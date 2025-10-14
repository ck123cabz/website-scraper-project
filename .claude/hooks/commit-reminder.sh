#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract the message and cwd from the notification
message=$(echo "$input" | jq -r '.message // ""')
cwd=$(echo "$input" | jq -r '.cwd // ""')

# Use CLAUDE_PROJECT_DIR if available, otherwise use cwd from input
project_dir="${CLAUDE_PROJECT_DIR:-$cwd}"

# Check if there are uncommitted changes
cd "$project_dir" || exit 0

if git diff --quiet && git diff --cached --quiet; then
  # No changes to commit
  exit 0
fi

# Check if the notification suggests work is complete
if echo "$message" | grep -qiE "(complet|done|finish|success|implement|fix|add|update|refactor)"; then
  cat << 'EOF'

📝 Reminder: You have uncommitted changes. Consider committing your work:
   • Run: git status
   • Then: git add <files>
   • Finally: git commit -m "your message"

EOF
fi

exit 0
