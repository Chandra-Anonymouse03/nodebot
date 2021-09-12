#!/usr/bin/bash

apt update && apt upgrade
apt install nodejs ffmpeg libwebp
npm install
npm start
