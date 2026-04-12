# Git Workflow

## Daily Workflow

1. Run `./status-all.sh` to inspect the root repo and the three child repos.
2. Work inside the repo you need.
3. When you need the latest remote state, run `./pull-all.sh`.
4. When you are ready to publish all local changes, run `./push-all.sh "your commit message"`.

## Check Status

```bash
./status-all.sh
```

This prints the status of:

- root workspace repo
- `backend-trans-allal`
- `dashboard-trans-allal`
- `app-trans-allal`

## Push All Repositories

```bash
./push-all.sh
./push-all.sh "chore: update backend dashboard and mobile"
```

If you do not pass a message, the default message is:

```text
update all repositories
```

## Pull All Repositories

```bash
./pull-all.sh
```

This runs `git pull origin main` for each repository in order.

## Important Note

Each project is an independent Git repository:

- root workspace repo
- `backend-trans-allal`
- `dashboard-trans-allal`
- `app-trans-allal`

Do not treat this workspace as a monorepo and do not use submodules for these projects.
