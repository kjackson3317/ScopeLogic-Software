#!/usr/bin/env bash
set -e

CANONICAL_PROJECT_ID="prj_tKR3zWhy4wbeqaMK7XBUQ14cE8lk"

if [ "$VERCEL_PROJECT_ID" != "$CANONICAL_PROJECT_ID" ]; then
  exit 0
fi

if [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "preview" ]; then
  exit 1
fi

exit 0
