#!/bin/bash
node build/index.cjs 2>&1 | ts | tee -a logs/log.txt