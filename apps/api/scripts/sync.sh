#!/bin/bash

# Two-way sync script between template and projects
# Usage:
#   ./sync.sh from /path/to/foundation   # pull from template
#   ./sync.sh to /path/to/foundation     # push to template
#   ./sync.sh from /path/to/foundation --dry-run  # preview
#   ./sync.sh from /path/to/foundation --force    # no prompts

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Global variables
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
CURRENT_DIR=$(pwd)
SYNCFILES="$PROJECT_ROOT/.syncfiles"
DRY_RUN=false
FORCE=false
VERBOSE=false
APPLY_ALL=false
IGNORE_UNCOMMITTED=false
EXCLUDES=()  # Array of exclusion patterns from .syncfiles

# Detect diff tool with syntax highlighting
DIFF_TOOL="diff"
if command -v delta &> /dev/null; then
  DIFF_TOOL="delta"
elif command -v diff-so-fancy &> /dev/null; then
  DIFF_TOOL="diff-so-fancy"
fi

# Pretty diff with syntax highlighting
pretty_diff() {
  local src="$1"
  local dst="$2"
  local lines="${3:-0}"  # 0 = no limit

  case "$DIFF_TOOL" in
    delta)
      if [[ "$lines" -gt 0 ]]; then
        diff -u --label "$dst" --label "$src" "$dst" "$src" 2>/dev/null | delta --paging=never --syntax-theme=Dracula | head -"$lines" || true
      else
        diff -u --label "$dst" --label "$src" "$dst" "$src" 2>/dev/null | delta --paging=never --syntax-theme=Dracula || true
      fi
      ;;
    diff-so-fancy)
      if [[ "$lines" -gt 0 ]]; then
        diff -u "$dst" "$src" 2>/dev/null | diff-so-fancy | head -"$lines" || true
      else
        diff -u "$dst" "$src" 2>/dev/null | diff-so-fancy || true
      fi
      ;;
    *)
      if [[ "$lines" -gt 0 ]]; then
        diff --color=always -u "$dst" "$src" 2>/dev/null | head -"$lines" || true
      else
        diff --color=always -u "$dst" "$src" 2>/dev/null || true
      fi
      ;;
  esac
  return 0
}

# Pretty diff for pager (full view)
pretty_diff_pager() {
  local src="$1"
  local dst="$2"

  case "$DIFF_TOOL" in
    delta)
      diff -u --label "$dst" --label "$src" "$dst" "$src" 2>/dev/null | delta --syntax-theme=Dracula
      ;;
    diff-so-fancy)
      diff -u "$dst" "$src" 2>/dev/null | diff-so-fancy | less -R
      ;;
    *)
      diff --color=always -u "$dst" "$src" 2>/dev/null | less -R
      ;;
  esac
  return 0
}

# Build exclude args for diff command
# Usage: build_diff_excludes "base_path"
# Outputs exclude args to stdout, one per line
# Note: diff --exclude only matches the last path component (basename)
build_diff_excludes() {
  local base_path="$1"

  # Default excludes
  echo "--exclude=node_modules"
  echo "--exclude=dist"
  echo "--exclude=.git"
  echo "--exclude=*.log"
  echo "--exclude=.DS_Store"

  # Add custom excludes from .syncfiles
  # diff --exclude only works with basenames, so we extract the last component
  for pattern in "${EXCLUDES[@]}"; do
    if [[ "$pattern" == "${base_path%/}"/* ]]; then
      local rel_pattern="${pattern#${base_path%/}/}"
      # Extract basename for diff --exclude (it only matches last path component)
      local basename_pattern="${rel_pattern##*/}"
      echo "--exclude=$basename_pattern"
    fi
  done
}

# Pretty diff for directories (recursive with syntax highlighting)
pretty_diff_dir_pager() {
  local src="$1"
  local dst="$2"
  local base_path="$3"  # Original path from .syncfiles for exclusion filtering

  # Build exclude args for diff
  local -a diff_excludes=()
  while IFS= read -r arg; do
    diff_excludes+=("$arg")
  done < <(build_diff_excludes "$base_path")

  case "$DIFF_TOOL" in
    delta)
      diff -ru "${diff_excludes[@]}" "$dst" "$src" 2>/dev/null | delta --syntax-theme=Dracula
      ;;
    diff-so-fancy)
      diff -ru "${diff_excludes[@]}" "$dst" "$src" 2>/dev/null | diff-so-fancy | less -R
      ;;
    *)
      diff -ru "${diff_excludes[@]}" --color=always "$dst" "$src" 2>/dev/null | less -R
      ;;
  esac
  return 0
}

# Git-style diffstat for a single file
# Returns: "filename | +N -M" format
file_diffstat() {
  local src="$1"
  local dst="$2"
  local base_path="$3"

  # Get relative path from base
  local rel_path="${src#$SRC/}"

  # Count additions and deletions
  local adds=0 dels=0
  if [[ -f "$src" && -f "$dst" ]]; then
    local diff_out
    diff_out=$(diff "$dst" "$src" 2>/dev/null) || true
    adds=$(echo "$diff_out" | grep -c '^>' || true)
    dels=$(echo "$diff_out" | grep -c '^<' || true)
  elif [[ -f "$src" && ! -f "$dst" ]]; then
    adds=$(wc -l < "$src" | tr -d ' ')
  elif [[ ! -f "$src" && -f "$dst" ]]; then
    dels=$(wc -l < "$dst" | tr -d ' ')
  fi

  # Format output with colors
  local stat=""
  if [[ "$adds" -gt 0 ]]; then
    stat="${GREEN}+${adds}${NC}"
  fi
  if [[ "$dels" -gt 0 ]]; then
    [[ -n "$stat" ]] && stat="$stat "
    stat="${stat}${RED}-${dels}${NC}"
  fi
  [[ -z "$stat" ]] && stat="~"

  printf "  %-50s | %s\n" "$rel_path" "$stat"
}

# Format directory diff output as git-style stat
format_dir_diff() {
  local diff_output="$1"
  local base_path="$2"
  local src_base="$3"
  local dst_base="$4"

  local modified=0 only_src=0 only_dst=0

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue

    if [[ "$line" == "Files "* ]]; then
      # "Files X and Y differ"
      local file_path
      file_path=$(echo "$line" | sed 's/Files \(.*\) and .* differ/\1/')
      local rel_path="${file_path#$src_base/}"
      rel_path="${rel_path#$dst_base/}"

      # Get actual diff stats
      local src_file="$src_base/$rel_path"
      local dst_file="$dst_base/$rel_path"
      local adds=0 dels=0
      if [[ -f "$src_file" && -f "$dst_file" ]]; then
        local d
        d=$(diff "$dst_file" "$src_file" 2>/dev/null) || true
        adds=$(echo "$d" | grep -c '^>' || true)
        dels=$(echo "$d" | grep -c '^<' || true)
      fi

      local stat=""
      [[ "$adds" -gt 0 ]] && stat="${GREEN}+${adds}${NC}"
      if [[ "$dels" -gt 0 ]]; then
        [[ -n "$stat" ]] && stat="$stat "
        stat="${stat}${RED}-${dels}${NC}"
      fi
      [[ -z "$stat" ]] && stat="~"

      printf "  %-50s | %b\n" "$rel_path" "$stat"
      ((modified++))

    elif [[ "$line" == "Only in "* ]]; then
      # "Only in /path: filename"
      local dir_part file_part
      dir_part=$(echo "$line" | sed 's/Only in \(.*\): .*/\1/')
      file_part=$(echo "$line" | sed 's/Only in .*: //')

      # Determine if it's in source or destination
      if [[ "$dir_part" == "$src_base"* ]]; then
        local rel_dir="${dir_part#$src_base}"
        rel_dir="${rel_dir#/}"
        local rel="$file_part"
        [[ -n "$rel_dir" ]] && rel="$rel_dir/$file_part"
        printf "  ${GREEN}%-50s${NC} | ${GREEN}(new)${NC}\n" "$rel"
        ((only_src++))
      else
        local rel_dir="${dir_part#$dst_base}"
        rel_dir="${rel_dir#/}"
        local rel="$file_part"
        [[ -n "$rel_dir" ]] && rel="$rel_dir/$file_part"
        printf "  ${YELLOW}%-50s${NC} | ${YELLOW}(only in target)${NC}\n" "$rel"
        ((only_dst++))
      fi
    fi
  done <<< "$diff_output"

  # Summary
  local total=$((modified + only_src + only_dst))
  if [[ $total -gt 0 ]]; then
    echo ""
    echo -e "  ${CYAN}$total file(s):${NC} $modified modified, ${GREEN}$only_src new${NC}, ${RED}$only_dst removed${NC}"
  fi
}

usage() {
  echo "Sync files between template and projects"
  echo ""
  echo "Usage: $0 <from|to> <path> [options]"
  echo ""
  echo "Commands:"
  echo "  from <path>   Pull changes FROM the specified repo into current"
  echo "  to <path>     Push changes TO the specified repo from current"
  echo ""
  echo "Options:"
  echo "  --dry-run              Show what would change without applying"
  echo "  --force                Apply all without prompts"
  echo "  --ignore-uncommitted   Skip uncommitted changes check"
  echo "  --verbose              Verbose output"
  echo ""
  echo "Examples:"
  echo "  ./sync.sh from ../nestjs-starter           # pull from template"
  echo "  ./sync.sh to ../nestjs-starter             # push to template"
  echo "  ./sync.sh from ../nestjs-starter --dry-run # preview"
  exit 1
}

log_info() { echo -e "${BLUE}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}!${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Parse excludes from .syncfiles (must be called before read_syncfiles)
parse_excludes() {
  if [[ ! -f "$SYNCFILES" ]]; then
    return
  fi

  while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^# ]] && continue
    [[ -z "$line" ]] && continue
    # Trim trailing whitespace
    line=$(echo "$line" | sed 's/[[:space:]]*$//')
    # Check for exclusion pattern
    if [[ "$line" == !* ]]; then
      # Remove ! prefix and trailing slash, add to excludes
      local pattern="${line#!}"
      pattern="${pattern%/}"
      EXCLUDES+=("$pattern")
    fi
  done < "$SYNCFILES"
}

# Read .syncfiles paths (excludes must be parsed separately first)
read_syncfiles() {
  if [[ ! -f "$SYNCFILES" ]]; then
    log_error ".syncfiles not found in $SCRIPT_DIR"
    exit 1
  fi

  # Output non-exclusion paths
  grep -v '^#' "$SYNCFILES" | grep -v '^!' | grep -v '^$' | sed 's/[[:space:]]*$//'
}

# Check if path should be excluded
is_excluded() {
  local path="$1"
  path="${path%/}"  # Remove trailing slash

  for pattern in "${EXCLUDES[@]}"; do
    # Check if path starts with pattern or equals pattern
    if [[ "$path" == "$pattern" ]] || [[ "$path" == "$pattern"/* ]]; then
      return 0  # Excluded
    fi
  done
  return 1  # Not excluded
}

# Show diff for file
show_diff() {
  local src="$1"
  local dst="$2"

  if [[ -d "$src" ]]; then
    # For directories use diff -rq for brief list
    diff -rq "$src" "$dst" 2>/dev/null || true
  else
    # For files show full diff
    diff --color=always -u "$dst" "$src" 2>/dev/null || true
  fi
}

# Sync a single path
sync_path() {
  local path="$1"
  local src="$2"
  local dst="$3"
  local src_path="$src/$path"
  local dst_path="$dst/$path"

  # Remove trailing slash for existence check
  local src_check="${src_path%/}"
  local dst_check="${dst_path%/}"

  echo ""
  echo -e "${CYAN}━━━ $path ━━━${NC}"

  # Check existence
  local src_exists=false
  local dst_exists=false
  [[ -e "$src_check" ]] && src_exists=true
  [[ -e "$dst_check" ]] && dst_exists=true

  if [[ "$src_exists" == false ]]; then
    log_warning "Not found in source: $src_check"
    return
  fi

  if [[ "$dst_exists" == false ]]; then
    log_info "New (does not exist in target)"
    if [[ "$DRY_RUN" == true ]]; then
      echo "  [DRY RUN] Would copy: $path"
      return
    fi
    if [[ "$FORCE" == true ]] || [[ "$APPLY_ALL" == true ]]; then
      copy_path "$src_check" "$dst_check" "$path"
      log_success "Copied"
      return
    fi
    read -p "  Copy? [y/n/a/q] " -n 1 -r < /dev/tty
    echo
    case $REPLY in
      y|Y) copy_path "$src_check" "$dst_check" "$path"; log_success "Copied" ;;
      a|A) APPLY_ALL=true; copy_path "$src_check" "$dst_check" "$path"; log_success "Copied" ;;
      q|Q) echo "Exit"; exit 0 ;;
      *) log_info "Skipped" ;;
    esac
    return
  fi

  # Both exist - compare
  if [[ -d "$src_check" ]]; then
    # Directory - use diff -rq with exclude args
    local -a diff_excludes=()
    while IFS= read -r arg; do
      diff_excludes+=("$arg")
    done < <(build_diff_excludes "$path")

    local diff_output
    diff_output=$(diff -rq "${diff_excludes[@]}" "$src_check" "$dst_check" 2>/dev/null) || true

    if [[ -z "$diff_output" ]]; then
      log_success "No changes"
      return
    fi

    # Show git-style stat output
    format_dir_diff "$diff_output" "$path" "$src_check" "$dst_check"
  else
    # File - show diff with syntax highlighting
    local diff_output
    diff_output=$(diff -u "$dst_check" "$src_check" 2>/dev/null) || true

    if [[ -z "$diff_output" ]]; then
      log_success "No changes"
      return
    fi

    pretty_diff "$src_check" "$dst_check" 30
    local diff_lines
    diff_lines=$(echo "$diff_output" | wc -l | tr -d ' ')
    if [[ "$diff_lines" -gt 30 ]]; then
      echo "  ... $((diff_lines - 30)) more lines"
    fi
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "  [DRY RUN] Would update"
    return
  fi

  if [[ "$FORCE" == true ]] || [[ "$APPLY_ALL" == true ]]; then
    copy_path "$src_check" "$dst_check" "$path"
    log_success "Updated"
    return
  fi

  read -p "  Apply? [y/n/d/a/q] (d=full diff) " -n 1 -r < /dev/tty
  echo
  case $REPLY in
    y|Y) copy_path "$src_check" "$dst_check" "$path"; log_success "Updated" ;;
    d|D)
      if [[ -d "$src_check" ]]; then
        pretty_diff_dir_pager "$src_check" "$dst_check" "$path" || true
      else
        pretty_diff_pager "$src_check" "$dst_check" || true
      fi
      # Ask again
      read -p "  Apply? [y/n/a/q] " -n 1 -r < /dev/tty
      echo
      case $REPLY in
        y|Y) copy_path "$src_check" "$dst_check" "$path"; log_success "Updated" ;;
        a|A) APPLY_ALL=true; copy_path "$src_check" "$dst_check" "$path"; log_success "Updated" ;;
        q|Q) echo "Exit"; exit 0 ;;
        *) log_info "Skipped" ;;
      esac
      ;;
    a|A) APPLY_ALL=true; copy_path "$src_check" "$dst_check" "$path"; log_success "Updated" ;;
    q|Q) echo "Exit"; exit 0 ;;
    *) log_info "Skipped" ;;
  esac
}

# Build rsync exclude args from EXCLUDES array
build_rsync_excludes() {
  local base_path="$1"
  local rsync_args=()

  # Default excludes
  rsync_args+=(--exclude='node_modules')
  rsync_args+=(--exclude='dist')
  rsync_args+=(--exclude='.git')
  rsync_args+=(--exclude='*.log')
  rsync_args+=(--exclude='.DS_Store')

  # Add custom excludes from .syncfiles
  for pattern in "${EXCLUDES[@]}"; do
    # Convert absolute pattern to relative for rsync
    # e.g., src/app/db/migrations -> db/migrations (if base is src/app)
    if [[ "$pattern" == "$base_path"/* ]]; then
      local rel_pattern="${pattern#$base_path/}"
      rsync_args+=(--exclude="$rel_pattern")
    fi
  done

  printf '%s\n' "${rsync_args[@]}"
}

# Copy file or directory
copy_path() {
  local src="$1"
  local dst="$2"
  local base_path="$3"  # Original path from .syncfiles

  if [[ -d "$src" ]]; then
    # Directory - use rsync WITHOUT --delete to preserve local files
    mkdir -p "$dst"

    # Build exclude args
    local -a rsync_excludes
    while IFS= read -r arg; do
      rsync_excludes+=("$arg")
    done < <(build_rsync_excludes "${base_path%/}")

    rsync -av "${rsync_excludes[@]}" "$src/" "$dst/" > /dev/null
  else
    # File - simple cp
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

# Parse arguments
parse_args() {
  if [[ $# -lt 2 ]]; then
    usage
  fi

  DIRECTION="$1"
  TARGET_PATH="$2"
  shift 2

  if [[ "$DIRECTION" != "from" && "$DIRECTION" != "to" ]]; then
    log_error "Unknown command: $DIRECTION"
    usage
  fi

  if [[ ! -d "$TARGET_PATH" ]]; then
    log_error "Path does not exist: $TARGET_PATH"
    exit 1
  fi

  TARGET_PATH=$(cd "$TARGET_PATH" && pwd)

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) DRY_RUN=true ;;
      --force) FORCE=true ;;
      --ignore-uncommitted) IGNORE_UNCOMMITTED=true ;;
      --verbose) VERBOSE=true ;;
      *) log_error "Unknown option: $1"; usage ;;
    esac
    shift
  done
}

# Check if git working directory is clean
check_git_clean() {
  local dir="$1"
  local name="$2"

  if [[ ! -d "$dir/.git" ]]; then
    return 0  # Not a git repo, skip check
  fi

  local status
  status=$(cd "$dir" && git status --porcelain 2>/dev/null)

  if [[ -n "$status" ]]; then
    log_error "Uncommitted changes in $name ($dir)"
    echo ""
    echo "Please commit or stash your changes before syncing:"
    cd "$dir" && git status --short
    echo ""
    exit 1
  fi
}

main() {
  parse_args "$@"

  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    Template Sync                           ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  if [[ "$DIRECTION" == "from" ]]; then
    echo -e "${GREEN}Direction:${NC} $TARGET_PATH → $CURRENT_DIR"
    SRC="$TARGET_PATH"
    DST="$CURRENT_DIR"
  else
    echo -e "${GREEN}Direction:${NC} $CURRENT_DIR → $TARGET_PATH"
    SRC="$CURRENT_DIR"
    DST="$TARGET_PATH"
  fi

  # Check for uncommitted changes (skip in dry-run mode or with --ignore-uncommitted)
  if [[ "$DRY_RUN" != true && "$IGNORE_UNCOMMITTED" != true ]]; then
    check_git_clean "$DST" "target"
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}Mode:${NC} preview (--dry-run)"
  elif [[ "$FORCE" == true ]]; then
    echo -e "${YELLOW}Mode:${NC} no prompts (--force)"
  else
    echo -e "${YELLOW}Mode:${NC} interactive"
  fi

  echo ""
  echo "Files to sync (from .syncfiles):"

  # Parse exclusions first (in main shell scope)
  parse_excludes

  # Read and process each path
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    sync_path "$path" "$SRC" "$DST"
  done < <(read_syncfiles)

  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                        Done!                               ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

main "$@"
