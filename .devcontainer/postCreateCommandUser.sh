#!/bin/bash
# Install NPM Dependencies
npm install

# Install RUST Dependencies and Compile Project
cargo clean
cargo build
