# Trans Allal Workspace

This workspace is organized as:

- one root repository for workspace-level automation and documentation
- one child repository for `backend-trans-allal`
- one child repository for `dashboard-trans-allal`
- one child repository for `app-trans-allal`

Each project remains an independent Git repository. The root repository also keeps a workspace-level snapshot of the three child project directories. This workspace does not use submodules and is not a monorepo.

## Repository Layout

- Root repo: workspace scripts, shared docs, and Git workflow files
- `backend-trans-allal`: backend source repository
- `dashboard-trans-allal`: dashboard source repository
- `app-trans-allal`: mobile app source repository

## Scripts

### `./status-all.sh`

Shows `git status` for:

- root workspace repo
- backend repo
- dashboard repo
- app repo

### `./pull-all.sh`

Runs `git pull origin main` for all four repositories in the same order.

### `./push-all.sh`

Commits and pushes all four repositories in the same order.

Examples:

```bash
./push-all.sh
./push-all.sh "chore: update workspace and child repositories"
```

If no commit message is passed, the script uses:

```text
update all repositories
```

## Notes

- The root repo is intentionally separate from the three child repos.
- The root repo now includes the child project source trees as part of the workspace snapshot.
- Use `GIT_WORKFLOW.md` for the daily workflow.
