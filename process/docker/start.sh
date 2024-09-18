#!/bin/bash
node build/index.cjs 2>&1 | ts | tee >(multilog s10485760 n30 /app/process/logs)