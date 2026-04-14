# Git Workflow

## Daily Workflow

1. Run `./status-all.sh` to inspect the root workspace repository.
2. Work anywhere inside the workspace.
3. When you need the latest remote state, run `./pull-all.sh`.
4. When you are ready to publish local changes, run `./push-all.sh "your commit message"`.

## Check Status

```bash
./status-all.sh
```

This prints the status of:

- the root workspace repository

## Push All Repositories

```bash
./push-all.sh
./push-all.sh "chore: update workspace"
```

If you do not pass a message, the default message is:

```text
update workspace repository
```

## Pull All Repositories

```bash
./pull-all.sh
```

This runs `git pull origin main` for the root workspace repository.

## Important Note

The workspace now uses a single Git repository at the root.
The folders `backend-trans-allal`, `dashboard-trans-allal`, and `app-trans-allal` are regular directories inside that repository.
