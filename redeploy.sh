#/bin/bash

BRANCH=main

git fetch origin $BRANCH
git reset --hard origin/$BRANCH
git pull origin $BRANCH --force
npm install

