$ErrorActionPreference = "Stop"

Write-Host "Adding remote origin..."
try {
    git remote add origin https://github.com/grycroman-dev/jumping-jack-2025.git
}
catch {
    Write-Host "Remote origin might already exist, attempting to set URL..."
    git remote set-url origin https://github.com/grycroman-dev/jumping-jack-2025.git
}

Write-Host "Pushing to GitHub..."
git push -u origin master

Write-Host "Done!"
