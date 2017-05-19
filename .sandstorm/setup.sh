#!/bin/bash

# When you change this file, you must take manual action. Read this doc:
# - https://docs.sandstorm.io/en/latest/vagrant-spk/customizing/#setupsh

set -euo pipefail

curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
sudo apt-get install -y nodejs
rm -f /usr/bin/node
ln -s `which nodejs` /usr/bin/node
cd /opt/app
npm install --no-bin-links
