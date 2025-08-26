#!/bin/bash
# Minimal bashrc for devcontainer

# Basic environment
export PS1='\u@\h:\w\$ '
export PATH=$HOME/bin:/usr/local/bin:$PATH
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# History settings
export HISTSIZE=1000
export HISTFILESIZE=2000
HISTCONTROL=ignoreboth
shopt -s histappend

# Basic aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'

# Devbox integration
if [ -f ~/.profile ]; then
    source ~/.profile
fi