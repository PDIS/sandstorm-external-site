#!/bin/bash

# When you change this file, you must take manual action. Read this doc:
# - https://docs.sandstorm.io/en/latest/vagrant-spk/customizing/#setupsh

set -euo pipefail

apt update
apt install -y nodejs
apt install -y npm
rm -f /usr/bin/node
ln -s `which nodejs` /usr/bin/node
npm install npm@latest -g
cd /opt/app
npm install request
