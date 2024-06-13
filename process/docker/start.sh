#!/bin/bash
node build/index.cjs 2>&1 | ts | tee >(multilog s10485760 n5 /app/logs)