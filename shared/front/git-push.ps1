$message="commit ps0"
git add .
git commit -m $($message)
write-host "Pushing data to remote server!!!"
git push -u origin main
