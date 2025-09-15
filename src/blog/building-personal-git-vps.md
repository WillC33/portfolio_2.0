---
title: Truly Own Your Code with Self Hosting
slug: self-hosting-own-code
date: 2025-08-17
description: Creating an alternative to the noisy, copilot-filled experience of Microsoft's GitHub for your projects.
lead: GitHub has been living on inertia for years, as the default choice. But the community good will might well run out.
tags: [self-hosting, git, dev-tooling]
---

With Microsoft folding GitHub into the CoreAI team, the risk is feeling real to me. GitHub hasn't seen meaningful updates outside the Copilot brand in a long time. Now its operational sovereignty is gone, handed to a team whose mission is cramming AI into every corner of the developer experience.

**Let me be clear:** I'm not anti-AI. These are powerful technologies. I'm not naive. I know fully hand-written software's days are numbered, and shifting towards 'product thinking' isn't all bad. What I'm against is the relentless Copilot enshittification Microsoft has committed to. While, I use Windows at work unwillingly, I am not dogmatically anti MS. I actually like .NET (F# <3), Playwright has its moments, PowerAutomate is awesome. I don't need ads on my desktop or Copilot pop-ups marring every interaction.

So I wanted an alternative: **my own Git server for MUCH less than a pizza a month.**

This guide sets up Soft Serve, a gorgeous self-hostable Git server with a TUI that feels fresh and developer-y. It runs happily on 512MB RAM, and keeps your valuable time away from Copilot 'assistants'.

What you're getting:
- A VPS/Raspberry Pi/old laptop transformed into a private Git server
- Optional GitHub mirroring (hedge your bets)
- Shell functions that make it as smooth as `gh repo create`
- Data control

## The Setup

There are a few great options for git serving, like Gitea and Forgejo but I am a terminal man through and through.

We're using [Soft Serve](https://github.com/charmbracelet/soft-serve) - a self-hostable Git server with a beautiful TUI. Mine is currently running on 512MB of memory and handles my Git operations brilliantly.
If you're planning for multiple users or massive repos, scale up accordingly. You can audit your current storage needs via the GitHub CLI: 

```bash
# Check your repo sizes
gh repo list --json name,diskUsage --limit 100 | jq '.[] | "\(.name): \(.diskUsage)KB"'
# Or without jq:
# gh repo list --json name,diskUsage --limit 100
```

## Step 1: Basic SSH Setup

> **Security Scope:** This is how not to get instapwned
> **You DON'T get:** fail2ban, SELinux, IDS, encrypted swap, etc.  
> **Your responsibility:** Learn proper VPS hardening before going live, or accept the risk

I once left a VPS running SSH on port 22 for a day. The logs were terrible. Thousands of bot attempts. Running as root on port 22 is stupid.

### Create a non-root user
```bash
# As root
adduser gituser
usermod -aG sudo gituser
```

### Copy SSH keys and test access
```bash
mkdir /home/gituser/.ssh
cp ~/.ssh/authorized_keys /home/gituser/.ssh/
chown -R gituser:gituser /home/gituser/.ssh
chmod 700 /home/gituser/.ssh
chmod 600 /home/gituser/.ssh/authorized_keys
```

Test from your local machine:
```bash
ssh gituser@your-vps-ip
```

### Harden SSH configuration
Edit `/etc/ssh/sshd_config`:
```
Port 2222  # Pick something better than this for your own use
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
```

**Restart SSH and test the new port before closing your current session!**
Once you can log in securely we can move forward a bit.

## Step 2: Install Docker

We're using Docker to keep things clean and portable. I'm specifically showing Docker as it's the standard.
You can also use Podman if you prefer your containers to be a bit more secure.

```bash
# Install Docker via the official convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group
sudo usermod -aG docker gituser

# Log out and back in for group change to take effect
exit
ssh -p 2222 gituser@your-vps-ip

# Verify installation (should show v2.x.x or higher)
docker --version
docker compose version
```

Note: We're using Docker Compose v2 (with a space: `docker compose`), not the old hyphenated version.

## Step 3: Configure Firewall

Lock down everything except what we need:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp comment "SSH"
sudo ufw allow 23231/tcp comment "Soft Serve Git"
sudo ufw --force enable
```

## Step 4: Deploy Soft Serve

Create `~/docker-compose.yml`:

```yaml
version: "3.8"
services:
  soft-serve:
    image: charmcli/soft-serve:latest
    container_name: soft-serve
    volumes:
      - ./soft-serve-data:/soft-serve  # Data persists here between updates
    ports:
      - "23231:23231"
    environment:
      SOFT_SERVE_INITIAL_ADMIN_KEYS: |
        ssh-ed25519 AAAAC3... # <- REPLACE WITH YOUR ACTUAL SSH PUBLIC KEY
    restart: unless-stopped
```

If you want this to be a multiuser setup (or even multi machine) add some more of your public keys.
Soft Serve has some awesome features for managing team workflows and you can find them in their docs.

Start it up:
```bash
docker compose up -d
docker ps  # Verify it's running
```

### Updating Soft Serve

When new versions are released, updating with docker compose

## Step 5: Set Up Convenient Access

Add to `~/.ssh/config` on your local machine:

```
Host git.myserver
    HostName your-vps-ip
    Port 23231

Host myserver
    HostName your-vps-ip
    Port 2222
    User gituser
```

Now you can:
- `ssh myserver` - manage your VPS
- `ssh git.myserver` - access Soft Serve TUI
- `git clone ssh://git.myserver/repo-name` - clone repos

## Step 6: The GitHub Mirror Trick

Here's something that I found useful. It's annoying to push to a lot of places, my push command is used so frequently it's aliased as 'p' . You can push to both GitHub and your private server simultaneously though:

```bash
# Add your private server as a remote
git remote add private ssh://git.myserver/my-repo

# Add it as a second push URL to origin
git remote set-url --add origin ssh://git.myserver/my-repo
```

Now `git push` updates both GitHub and your private server. Perfect redundancy.
You might even begin exploring other providers, like the amazing Codeberg project, as a new home for your projects!

This is also a good time to mention that either creating a cronjob (if you are confident in your VPS), or enabling your provider's backups is ESSENTIAL.
**Please create a backup or mirroring solution**


## Step 7: Quick Repo Setup Function

Add this to your shell config for instant repo creation, in the style of 'gh repo create':
*N.B. This is what I use for my own repos where I don't handle anything much beyond master or main.*

### For Bash/Zsh:
```bash
gitserver() {
  if [ "$1" = "repo" ] && [ "$2" = "add" ]; then
    local repo_name="${3:-$(basename $PWD)}"
    
    # Verify git repo
    git rev-parse --git-dir >/dev/null 2>&1 || {
      echo "Error: Not a git repository"
      return 1
    }
    
    # Check if remote exists
    if git remote get-url private >/dev/null 2>&1; then
      echo "Error: 'private' remote already exists"
      return 1
    fi
    
    git remote add private ssh://git.myserver/$repo_name
    git remote set-url --add origin ssh://git.myserver/$repo_name
    
    # Push with better error handling
    if git push private main 2>/dev/null; then
      echo "✓ Pushed main branch"
    elif git push private master 2>/dev/null; then
      echo "✓ Pushed master branch"
    else
      echo "Note: Push manually with: git push private <branch>"
    fi
  fi
}
```

## Surviving on 512MB RAM

If you're on a minimal VPS, add some swap, note that your VPS provider might be able to read this. If you are all about privacy, skip or encrypt:

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

You might also find there is stuff you don't want running from your default image: 

### Disable unnecessary services:
```bash
# Multipath daemon (useless on VPS)
sudo systemctl disable --now multipathd

# Snapd if you don't use snaps
sudo systemctl disable --now snapd
```

### Monitor your server:
```bash
# Check resource usage
docker stats
free -h
df -h
```

## The Result

You now have:
- A private Git server you fully control
- SSH access locked down properly
- Clean command-line workflow

Your code, your rules, your infrastructure. No tracking, no AI training on your repos, no corporate terms of service. Just Git, exactly how it was meant to be.
*Note: This workflow is perfect for personal use. For team deployments, get introduced to the Soft Serve docs.

## TODO

- Find a guide on what you need for proper production hardening of the VPS if you don't know (fail2ban, encryption, updates etc. the usual suspects)
- Push repos!

---

That's it. A proper Git server for the price of a portion of chips. As GitHub drifts into Copilot-shaped irrelevance, you've taken back control of your code.
