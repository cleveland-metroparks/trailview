#!/bin/bash
node build 2>&1 | ts | tee >(multilog s10485760 n30 /app/web/logs)